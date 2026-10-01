// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-scanvirus.js — Auto-scan virus file (document) di grup via VirusTotal
// di-scrape pakai puppeteer (tanpa apikey — GUI virustotal.com + response
// interception, ala CLI scraper owner). Scrape dipilih karena API publik VT
// butuh apikey, fetch mentah kena reCAPTCHA (429) — puppeteer stealth lolos.
//
// Alur: file masuk di grup yang scanvirus aktif → react 🕒 + notif "sedang
// di-scan" → download → SHA-256 → cek hash di VT (fast path, file yang udah
// pernah di-scan langsung dapat hasil) → kalau belum pernah & ukuran ≤ cap
// → upload ke VT (max 3 menit tunggu) → hasil verdict box.
//
// Owner & admin grup di-exempt. Cache hasil 6 jam per hash. Scan di-queue
// sekuensial biar cuma satu operasi browser pada satu waktu.

import { createHash } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { raraWrap } from "./rara-menu-style.js";
import { getDatabase } from "./rara-database.js";

const VT_GUI = "https://www.virustotal.com/gui";
const LOOKUP_TIMEOUT_MS = 30000;   // tunggu report hash yang udah ada
const UPLOAD_WAIT_MS = 180000;     // max 3 menit nunggu hasil upload
const UPLOAD_CAP_BYTES = 32 * 1024 * 1024; // 32MB — di atas ini lookup-only
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;   // 6 jam
const BROWSER_IDLE_MS = 2 * 60 * 1000;     // browser idle 2 menit → close
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Cache & queue ───
const _cache = new Map(); // hash → { verdict, at }
let _browser = null;
let _lastUse = 0;
let _queue = Promise.resolve(); // scan di-serialize, satu browser op pada satu waktu
let _idleTimer = null;

// ─── Puppeteer loader (pola sama kayak src/scraper/chateverywhere.js) ───
async function loadPuppeteer() {
  try {
    const puppeteer = await import("puppeteer-core");
    return { puppeteer: puppeteer.default, isCore: true };
  } catch {
    try {
      const puppeteer = await import("puppeteer");
      return { puppeteer: puppeteer.default, isCore: false };
    } catch {
      throw new Error(
        "Puppeteer belum diinstall. Install dengan:\n" +
        "  VPS/PM2: npm install puppeteer\n" +
        "  Docker:  npm install puppeteer-core (chromium sudah di Dockerfile)\n" +
        "  Atau:    npm install puppeteer-core && set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium"
      );
    }
  }
}

function getChromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const paths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ];
  const { existsSync } = require("fs");
  for (const p of paths) {
    try { if (existsSync(p)) return p; } catch {}
  }
  return null;
}

async function getBrowser() {
  const { puppeteer, isCore } = await loadPuppeteer();
  if (_browser) {
    try {
      const pages = await _browser.pages();
      if (pages) {
        _lastUse = Date.now();
        return _browser;
      }
    } catch {
      _browser = null;
    }
  }
  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  };
  if (isCore) {
    const chrom = getChromiumPath();
    if (!chrom) throw new Error("Chromium gak ketemu. Set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium atau npm install puppeteer");
    launchOptions.executablePath = chrom;
  }
  _browser = await puppeteer.launch(launchOptions);
  _lastUse = Date.now();
  scheduleIdleClose();
  return _browser;
}

function scheduleIdleClose() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(async () => {
    if (_browser && Date.now() - _lastUse >= BROWSER_IDLE_MS) {
      try { await _browser.close(); } catch {}
      _browser = null;
    } else {
      scheduleIdleClose();
    }
  }, BROWSER_IDLE_MS);
}

// ─── Util ───
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const { createReadStream } = require("fs");
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── VirusTotal scrape (response interception — pola CLI scraper owner) ───
// Pasang listener intercept response /files/<hash> di sebuah page.
function watchFileResponse(page, fileHash, onFound) {
  page.on("response", async (response) => {
    const status = response.status();
    try {
      const urlObj = new URL(response.url());
      const parts = urlObj.pathname.split("/");
      const isMainFile = parts[parts.length - 2] === "files" && parts[parts.length - 1] === fileHash;
      if (!isMainFile) return;
      if (status === 200) {
        const json = JSON.parse(await response.text());
        if (json?.data?.attributes) onFound({ ok: true, json });
      } else if (status === 404) {
        onFound({ ok: false, notFound: true });
      }
    } catch {}
  });
}

// Cek hash di VT: udah pernah di-scan? → langsung report. Belum → null.
async function vtLookupHash(fileHash) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  let resolved = null;
  const found = new Promise((r) => {
    watchFileResponse(page, fileHash, (v) => {
      if (!resolved) { resolved = v; r(v); }
    });
  });
  try {
    await page.goto(`${VT_GUI}/file/${fileHash}/detection`, {
      waitUntil: "networkidle2",
      timeout: LOOKUP_TIMEOUT_MS,
    }).catch(() => {});
    const result = await Promise.race([
      found,
      new Promise((r) => setTimeout(() => r(null), LOOKUP_TIMEOUT_MS)),
    ]);
    return result?.ok ? result.json : null; // null = belum pernah di-scan / gagal
  } finally {
    await page.close().catch(() => {});
  }
}

// Upload file baru ke VT lewat GUI, tunggu report (max 3 menit).
async function vtUploadFile(filePath, fileHash) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  let resolved = null;
  const found = new Promise((r) => {
    watchFileResponse(page, fileHash, (v) => {
      if (!resolved) { resolved = v; r(v); }
    });
  });
  try {
    await page.goto(`${VT_GUI}/home/upload`, { waitUntil: "networkidle2", timeout: 45000 });
    const fileInput = await page.waitForSelector(">>> #fileSelector", { timeout: 15000 });
    await fileInput.uploadFile(filePath);
    const confirmBtn = await page.waitForSelector(">>> #confirmUploadButton", { timeout: 15000 });
    await confirmBtn.click();
    const result = await Promise.race([
      found,
      new Promise((r) => setTimeout(() => r({ error: "timeout" }), UPLOAD_WAIT_MS)),
    ]);
    if (result?.error) return null;
    return result?.ok ? result.json : null;
  } finally {
    await page.close().catch(() => {});
  }
}

// ─── React proses scan (tematik, di pesan file) ───
// Beda sama react loading 🕒🐣 (itu buat command fitur .scanvirus on/off).
// Proses scan file pakai urutan tematik di pesan FILE itu sendiri:
// 🔍 file kedeteksi → 🦠 lagi di-scan → 💯 virus / ⚠️ mencurigakan / ✅ aman.
function reactFor(verdict) {
  return verdict === "bahaya" ? "💯" : verdict === "mencurigakan" ? "⚠️" : "✅";
}

// ─── Verdict ───
function buildVerdict(json) {
  const attr = json?.data?.attributes;
  if (!attr) return null;
  const stats = attr.last_analysis_stats || {};
  const results = attr.last_analysis_results || {};
  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;
  const undetected = stats.undetected || 0;
  const harmless = stats.harmless || 0;
  const totalEngines = malicious + suspicious + undetected + harmless;

  let verdict = "aman";
  if (malicious > 0) verdict = "bahaya";
  else if (suspicious > 0) verdict = "mencurigakan";

  // engine yang nandain (max 5)
  const flagged = [];
  for (const [engine, detail] of Object.entries(results)) {
    if (detail.category === "malicious" || detail.category === "suspicious") {
      flagged.push(`${detail.engine_name || engine}: ${detail.result || detail.category}`);
    }
    if (flagged.length >= 5) break;
  }

  return {
    verdict,
    malicious, suspicious, undetected, harmless, totalEngines,
    flagged,
    size: attr.size,
    type: attr.type_description,
    sha256: attr.sha256,
    timesSubmitted: attr.times_submitted,
    lastAnalysis: attr.last_analysis_date
      ? new Date(attr.last_analysis_date * 1000).toLocaleString("id-ID")
      : null,
  };
}

function verdictBox(fileName, fileSize, v) {
  // Link & hash JANGAN di dalam box — buildBox smallcaps semua teks,
  // smallcaps bikin URL gak keklik & hash gak bisa di-copy.
  const link = `${VT_GUI}/file/${v.sha256}`;
  const rows = [
    `File : ${fileName}`,
    `Ukuran : ${formatBytes(fileSize || v.size)}`,
    `Engine Pemeriksa : ${v.totalEngines}`,
    `Deteksi : ${v.malicious} berbahaya / ${v.suspicious} mencurigakan / ${v.undetected} bersih`,
    `Terakhir Di-Scan : ${v.lastAnalysis || "-"}`,
  ];
  if (v.flagged.length) {
    rows.push("", "Engine Yang Menandain:");
    rows.push(...v.flagged.map((f) => `• ${f}`));
  }
  const tail = `\n\nSHA-256: ${v.sha256}\nLaporan lengkap: ${link}`;

  if (v.verdict === "bahaya") {
    // raraWrap type error otomatis kasih prefix ❌ — jangan dobel ikon
    return raraWrap("scan virus", [
      `FILE TERDETEKSI BERBAHAYA!`,
      "",
      ...rows,
      "",
      "Jangan buka atau install file ini — sebaiknya dihapus.",
    ].join("\n"), "error") + tail;
  }
  if (v.verdict === "mencurigakan") {
    return raraWrap("scan virus", [
      `File ditandai mencurigakan oleh ${v.suspicious} engine`,
      "",
      ...rows,
      "",
      "Hati-hati — file ini berpotensi berbahaya.",
    ].join("\n"), "warn") + tail;
  }
  return raraWrap("scan virus", [
    `File aman — tidak ada engine yang menandain`,
    "",
    ...rows,
  ].join("\n"), "success") + tail;
}

// ─── Toggle check (dipanggil hook handler) ───
export async function isScanVirusEnabled(m) {
  if (!m || !m.isGroup || m.isCommand || m.fromMe || !m.isDocument) return false;
  if (m.isOwner || m.isAdmin) return false; // owner & admin grup di-exempt
  if (m.isNewsletter) return false;
  try {
    const db = getDatabase();
    const group = db.getGroup(m.chat) || {};
    return group.scanVirus === true;
  } catch {
    return false;
  }
}

// ─── Scan job (dipanggil fire-and-forget dari handler) ───
async function _scanJob(m, sock) {
  const fileName = m.fileName || "file";
  const senderNum = m.sender.split("@")[0];

  // notif "sedang di-scan" — status box + react loading
  await m.react("🔍");
  await m.reply(raraWrap("scan virus", [
    `File : ${fileName}`,
    `Pengirim : @${senderNum}`,
    "",
    "File sedang di-scan lewat VirusTotal untuk memastikan tidak ada virus.",
    "Hasilnya menyusul setelah pemeriksaan selesai.",
  ].join("\n")), { mentions: [m.sender] });

  // download ke temp
  const tmp = path.join(os.tmpdir(), `rara-scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  let buffer;
  try {
    buffer = await m.download();
    await fs.writeFile(tmp, buffer);
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("scan virus", `Gagal mengunduh file untuk di-scan: ${e.message}`, "error"));
    return;
  }

  try {
    const fileHash = await sha256File(tmp);
    const fileSize = buffer?.length || 0;

    // cache 6 jam
    const cached = _cache.get(fileHash);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      await m.react(reactFor(cached.verdict.verdict));
      await m.reply(verdictBox(fileName, fileSize, cached.verdict));
      return;
    }

    let vtData = null;
    let note = null;
    try {
      vtData = await vtLookupHash(fileHash);
    } catch (e) {
      note = `Engine scan error: ${e.message}`;
    }

    // belum pernah di-scan & ukuran memungkinkan → upload
    if (!vtData && !note) {
      if (fileSize > 0 && fileSize <= UPLOAD_CAP_BYTES) {
        try {
          vtData = await vtUploadFile(tmp, fileHash);
        } catch (e) {
          note = `Gagal upload ke VirusTotal: ${e.message}`;
        }
        if (!vtData && !note) {
          note = "File masih dalam antrian scan VirusTotal (belum ada hasil dalam 3 menit). Cek lagi nanti di link laporan.";
        }
      } else if (fileSize > UPLOAD_CAP_BYTES) {
        note = "File baru (belum pernah di-scan) dan ukurannya di atas 32MB — terlalu besar untuk di-upload otomatis.";
      } else {
        note = "File baru tapi gagal di-scan VirusTotal.";
      }
    }

    // File kedeteksi 🔍 → sekarang beneran di-scan 🦠
    await m.react("🦠");
    if (!vtData) {
      await m.react("❌");
      await m.reply(
        raraWrap("scan virus", [
          note || "Scan gagal.",
          "",
          `File : ${fileName}`,
        ].join("\n"), "error") +
        `\n\nSHA-256: ${fileHash}\nLaporan manual: ${VT_GUI}/file/${fileHash}`
      );
      return;
    }

    const verdict = buildVerdict(vtData);
    if (!verdict) {
      await m.react("❌");
      await m.reply(raraWrap("scan virus", "Hasil dari VirusTotal tidak bisa dibaca. Coba lagi nanti.", "error"));
      return;
    }

    _cache.set(fileHash, { verdict, at: Date.now() });

    await m.react(reactFor(verdict.verdict));
    await m.reply(verdictBox(fileName, fileSize, verdict));
  } catch (e) {
    await m.react("❌");
    await m.reply(raraWrap("scan virus", `Scan gagal: ${e.message}`, "error"));
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

/**
 * Hook utama — dipanggil handler.js (fire-and-forget, di-queue sekuensial
 * biar cuma satu operasi puppeteer pada satu waktu).
 */
// di-export untuk testing
export { buildVerdict, verdictBox };

export function handleScanVirus(m, sock) {
  _queue = _queue
    .then(() => _scanJob(m, sock))
    .catch((e) => console.error("[ScanVirus]", e.message));
  return _queue;
}
