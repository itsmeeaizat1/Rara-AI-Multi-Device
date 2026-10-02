// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// rara-agent-powers — KEMAMPUAN TAMBAHAN AGENT (3 Okt 2026)
// Request owner: "semua ai agent cerdas dan canggih, serba bisa, browsing
// selalu menyertakan screenshot, buat file js atau edit file js dan edit
// file lain, menyelesaikan tugas atau automation".
//
// SATU modul dipakai BERSAMA oleh raraagent (TOOLS aiagent.js) dan
// aisuperagent/anovaagent (buildExecutors agent.js) — gak ada dua
// implementasi yang bisa beda perilaku.
//
//   • screenshotPage(url)        — buka halaman chromium + screenshot
//   • readRepoFile(path)         — baca file repo (OWNER)
//   • listRepoFiles(path)        — lihat isi folder repo (OWNER)
//   • editRepoFile(path, find, replace) — edit find/replace (OWNER)
//   • writeRepoFile(path, content)      — tulis/timpa file (OWNER)
//
// PENGAMAN file tool (semuanya dicek di level KODE, bukan prompt):
//   1. path wajib di dalam REPO_ROOT (anti ../ dan symlink keluar)
//   2. blokir .env, .git, node_modules, kredensial/sesi/kunci
//   3. backup <file>.bak sebelum ubah (edit/overwrite)
//   4. file .js/.mjs/.cjs wajib lolos `node --check`; gagal → ROLLBACK
//   5. batas ukuran baca 60KB, tulis 400KB
// ============================================================

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __f = fileURLToPath(import.meta.url);
export const REPO_ROOT = path.resolve(path.dirname(__f), "..", "..");

const MAX_READ = 60 * 1024;
const MAX_WRITE = 400 * 1024;
const MAX_LIST = 120;

// ── seam e2e: root bisa dialihkan ke folder sementara ──
let _root = REPO_ROOT;
export function _setRootForTest(dir) { _root = dir ? path.resolve(dir) : REPO_ROOT; }
const root = () => _root;

// segmen path yang DILARANG (case-insensitive)
const BLOCKED_SEGMENTS = new Set([
  ".git", "node_modules", ".ssh", ".aws", ".config", ".npm",
  "session", "sessions", "auth", "creds", "baileys_store", "backups",
]);
// nama file / pola yang DILARANG
const BLOCKED_FILE = /(^|\/)(\.env(\..*)?|\.npmrc|id_rsa.*|.*\.pem|.*\.key|.*\.p12|creds\.json|apikeys\.json|9routerapikey\.json|yt-cookies\.txt|yt-proxy\.txt|.*secret.*|.*token.*|.*password.*)$/i;

/**
 * Resolve path relatif repo → absolut AMAN. Throw kalau keluar repo /
 * kena blocklist. Return { abs, rel }.
 */
export function safeRepoPath(input, { mustExist = false } = {}) {
  const raw = String(input ?? "").trim().replace(/\\/g, "/");
  if (!raw) throw new Error("path kosong");
  if (raw.includes("\0")) throw new Error("path gak valid");
  const base = root();
  const abs = path.resolve(base, raw.replace(/^\/+/, ""));
  const rel = path.relative(base, abs).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("path di luar folder bot — ditolak");
  const segs = rel.split("/").map((s) => s.toLowerCase());
  const hit = segs.find((s) => BLOCKED_SEGMENTS.has(s));
  if (hit) throw new Error(`folder "${hit}" diproteksi — gak boleh disentuh agent`);
  if (BLOCKED_FILE.test(rel)) throw new Error("file sensitif (env/kunci/kredensial) diproteksi — gak boleh disentuh agent");
  // symlink keluar repo → tolak (cek realpath kalau ada)
  const probe = fs.existsSync(abs) ? abs : path.dirname(abs);
  try {
    const real = fs.realpathSync(probe);
    const realBase = fs.realpathSync(base);
    if (real !== realBase && !real.startsWith(realBase + path.sep)) throw new Error("path mengarah keluar folder bot — ditolak");
  } catch (e) {
    if (/ditolak/.test(e.message)) throw e;
  }
  if (mustExist && !fs.existsSync(abs)) throw new Error(`file gak ada: ${rel}`);
  return { abs, rel };
}

const isJsFile = (p) => /\.(m?js|cjs)$/i.test(p);

/**
 * Cek syntax SELALU dengan mode modul yang benar, bukan tergantung
 * package.json sekitar: `node --check x.js` di folder tanpa "type":"module"
 * membaca .js sebagai CommonJS dan MELOLOSKAN `export const = ;`. Jadi isi
 * file disalin ke berkas sementara .mjs (ESM) — atau .cjs untuk file .cjs —
 * lalu di-check di sana. Throw pesan ringkas kalau syntax error.
 */
function checkSyntax(absFile) {
  const ext = /\.cjs$/i.test(absFile) ? ".cjs" : ".mjs";
  const tmp = path.join(os.tmpdir(), `_rara_chk_${process.pid}_${Date.now()}${ext}`);
  try {
    fs.copyFileSync(absFile, tmp);
    execFileSync(process.execPath, ["--check", tmp], { timeout: 15000, stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    const msg = String(e?.stderr || e?.message || e).split("\n").filter(Boolean).slice(0, 4).join(" | ");
    throw new Error("syntax error: " + msg.replace(/\/[^\s|]*_rara_chk_[^\s|:]*/g, "file").slice(0, 300));
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function backup(abs) {
  if (!fs.existsSync(abs)) return null;
  const bak = abs + ".bak";
  fs.copyFileSync(abs, bak);
  return bak;
}

/** Baca file repo (potong 60KB). */
export function readRepoFile(p, { from = 1, lines = 400 } = {}) {
  const { abs, rel } = safeRepoPath(p, { mustExist: true });
  const st = fs.statSync(abs);
  if (st.isDirectory()) throw new Error(`${rel} itu folder — pakai listfiles`);
  if (st.size > 2 * 1024 * 1024) throw new Error(`file terlalu besar (${(st.size / 1048576).toFixed(1)} MB)`);
  const buf = fs.readFileSync(abs);
  if (buf.includes(0)) throw new Error("file biner — gak bisa dibaca sebagai teks");
  const all = buf.toString("utf8").split("\n");
  const start = Math.max(1, parseInt(from, 10) || 1);
  const n = Math.max(1, Math.min(2000, parseInt(lines, 10) || 400));
  let chunk = all.slice(start - 1, start - 1 + n).map((l, i) => `${start + i}| ${l}`).join("\n");
  let truncated = false;
  if (chunk.length > MAX_READ) { chunk = chunk.slice(0, MAX_READ); truncated = true; }
  return { rel, totalLines: all.length, from: start, text: chunk, truncated };
}

/** Daftar isi folder repo (tanpa folder terlarang). */
export function listRepoFiles(p = ".") {
  const raw = String(p ?? "").trim();
  const isRoot = raw === "" || raw === "." || raw === "/" || raw === "./";
  const { abs, rel } = isRoot ? { abs: root(), rel: "." } : safeRepoPath(raw, { mustExist: true });
  const st = fs.statSync(abs);
  if (!st.isDirectory()) throw new Error(`${rel} itu file — pakai readfile`);
  const out = fs.readdirSync(abs, { withFileTypes: true })
    .filter((d) => !BLOCKED_SEGMENTS.has(d.name.toLowerCase()) && !BLOCKED_FILE.test(d.name))
    .sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
  const items = out.slice(0, MAX_LIST).map((d) => (d.isDirectory() ? d.name + "/" : d.name));
  return { rel, items, total: out.length, truncated: out.length > MAX_LIST };
}

/**
 * Edit find/replace. `find` WAJIB cocok tepat 1x (anti edit nyasar) kecuali
 * all=true. Backup .bak; .js lolos node --check atau ROLLBACK.
 */
export function editRepoFile(p, find, replace, { all = false } = {}) {
  const { abs, rel } = safeRepoPath(p, { mustExist: true });
  if (fs.statSync(abs).isDirectory()) throw new Error(`${rel} itu folder`);
  const f = String(find ?? "");
  if (!f) throw new Error("teks yang mau diganti (find) kosong");
  const r = String(replace ?? "");
  const before = fs.readFileSync(abs, "utf8");
  const count = before.split(f).length - 1;
  if (count === 0) throw new Error("teks yang mau diganti gak ketemu di file (cek lagi persis sama, termasuk spasi)");
  if (count > 1 && !all) throw new Error(`teks ketemu ${count}x — kasih potongan lebih spesifik biar gak salah ganti, atau minta ganti semua`);
  const after = all ? before.split(f).join(r) : before.replace(f, () => r);
  if (after.length > MAX_WRITE) throw new Error("hasil edit terlalu besar");
  const bak = backup(abs);
  fs.writeFileSync(abs, after);
  if (isJsFile(rel)) {
    try { checkSyntax(abs); } catch (e) {
      fs.writeFileSync(abs, before); // ROLLBACK
      throw new Error(`${e.message} — perubahan DIBATALKAN, file dikembalikan`);
    }
  }
  return { rel, replaced: all ? count : 1, backup: bak ? path.relative(root(), bak).replace(/\\/g, "/") : null };
}

/** Tulis/timpa file. Backup kalau sudah ada; .js wajib lolos cek syntax. */
export function writeRepoFile(p, content, { overwrite = false } = {}) {
  const { abs, rel } = safeRepoPath(p);
  const body = String(content ?? "");
  if (!body.trim()) throw new Error("isi file kosong");
  if (body.length > MAX_WRITE) throw new Error("isi file terlalu besar (maks 400KB)");
  const existed = fs.existsSync(abs);
  if (existed && fs.statSync(abs).isDirectory()) throw new Error(`${rel} itu folder`);
  if (existed && !overwrite) throw new Error(`${rel} sudah ada — minta "timpa" eksplisit atau pakai editfile`);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const before = existed ? fs.readFileSync(abs, "utf8") : null;
  const bak = existed ? backup(abs) : null;
  fs.writeFileSync(abs, body);
  if (isJsFile(rel)) {
    try { checkSyntax(abs); } catch (e) {
      if (existed) fs.writeFileSync(abs, before); else fs.unlinkSync(abs); // ROLLBACK
      throw new Error(`${e.message} — penulisan DIBATALKAN${existed ? ", file lama dikembalikan" : ""}`);
    }
  }
  return { rel, created: !existed, bytes: Buffer.byteLength(body), backup: bak ? path.relative(root(), bak).replace(/\\/g, "/") : null };
}

// ── SCREENSHOT ─────────────────────────────────────────────
let _shotForTest;
export function _setScreenshotForTest(fn) { _shotForTest = fn; }
export function _clearScreenshotForTest() { _shotForTest = undefined; }

/** Blokir URL internal (SSRF): localhost, IP privat, metadata cloud. */
export function assertPublicUrl(url) {
  let u;
  try { u = new URL(String(url || "").trim()); } catch { throw new Error("link-nya gak valid"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("cuma http/https yang boleh");
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) throw new Error("alamat lokal/internal diblokir");
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === "::1" || /^(fc|fd|fe80)/i.test(h) || h === "[::1]") {
    throw new Error("alamat jaringan privat diblokir");
  }
  return u.toString();
}

/**
 * Buka halaman di chromium → { title, description, text, screenshot(Buffer|null) }.
 * fullPage=true → tangkap seluruh halaman (dibatasi tinggi 6000px).
 */
export async function screenshotPage(url, { fullPage = false } = {}) {
  const safe = assertPublicUrl(url);
  if (typeof _shotForTest === "function") return _shotForTest(safe, { fullPage });
  if (_shotForTest === null) throw new Error("browser dimatikan");
  const { getBrowser } = await import("../scraper/rara-yt-browser.js");
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9,id;q=0.8" });
    await page.goto(safe, { waitUntil: "domcontentloaded", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1500));
    const facts = await page.evaluate(() => ({
      title: (document.querySelector("h1")?.textContent || document.title || "").trim(),
      description: (document.querySelector('meta[name="description"]')?.getAttribute("content") || "").trim(),
      text: (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 3000),
    }));
    let screenshot = null;
    try {
      const opts = fullPage
        ? { type: "jpeg", quality: 65, clip: { x: 0, y: 0, width: 1280, height: Math.min(6000, await page.evaluate(() => document.documentElement.scrollHeight)) }, captureBeyondViewport: true }
        : { type: "jpeg", quality: 70, fullPage: false };
      screenshot = await page.screenshot(opts);
      if (!screenshot || screenshot.length < 2000) screenshot = null;
    } catch { /* screenshot gagal → tetap balikin teks */ }
    return { ...facts, screenshot };
  } finally {
    await page.close().catch(() => {});
  }
}
