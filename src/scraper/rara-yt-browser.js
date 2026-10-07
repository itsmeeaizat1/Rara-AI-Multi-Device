// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 YOUTUBE BROWSER SEARCH — pencarian YouTube pakai BROWSER BENERAN
// (puppeteer/chromium), bukan AI & bukan HTTP scraper.
// 🔹 Request owner 14 Sep 2026: "klo disuruh cari jgn pakai kecerdasan
// ai tp agent mencari pakai browser beneran seperti umumnya di ai
// superagent" — .raraagent searchyt pakai jalur INI duluan, baru
// fallback yt-search kalau chromium gak tersedia/crash.
// 🔹 Buka www.youtube.com/results?search_query=... di headless chrome,
// tunggu hasil render (ytd-video-renderer), ekstrak judul/channel/
// durasi/views/ago/link PERSIS dari DOM halaman hasil — data ASLI
// hasil browsing, bukan tebakan AI.
// ============================================================

let browserInstance = null;
let lastUse = 0;
const SESSION_TIMEOUT = 90 * 1000; // 90 dtk idle → browser di-close

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function loadPuppeteer() {
  // puppeteer-core dulu (hemat — pakai chromium sistem/VPS), lalu full
  try {
    const puppeteer = await import("puppeteer-core");
    return { puppeteer: puppeteer.default, isCore: true };
  } catch {
    const puppeteer = await import("puppeteer");
    return { puppeteer: puppeteer.default, isCore: false };
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
  return null; // full puppeteer handle sendiri via cache ~/.cache/puppeteer
}

// 🔹 7 Okt 2026 (owner: "gamenya kebuka segiiut" → nemu Chrome gak jalan di
// container Ptero): image yolks gak bawa lib Chrome (libatk/cups/avahi dll),
// rootfs read-only gak bisa apt install. Solusi: lib ditaruh di VOLUME
// (writable) folder ~/.chromelibs → di-inject ke env launch via
// LD_LIBRARY_PATH. Cuma aktif kalau foldernya ada (sandbox aman).
function chromeLibsEnv() {
  try {
    const os = require("os");
    const fs = require("fs");
    const path = require("path");
    const dirs = [path.join(os.homedir(), ".chromelibs"), "/home/container/.chromelibs"];
    const found = dirs.find((d) => fs.existsSync(d));
    if (!found) return null;
    const cur = process.env.LD_LIBRARY_PATH ? process.env.LD_LIBRARY_PATH.split(":") : [];
    const merged = [found, ...cur.filter(Boolean)].join(":");
    return { LD_LIBRARY_PATH: merged };
  } catch { return null; }
}

export async function getBrowser() {
  const { puppeteer, isCore } = await loadPuppeteer();
  // reuse browser yang masih hidup biar gak launch tiap pencarian (berat)
  if (browserInstance && Date.now() - lastUse < SESSION_TIMEOUT) {
    try {
      await browserInstance.version();
      lastUse = Date.now();
      return browserInstance;
    } catch {
      browserInstance = null;
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
      "--disable-extensions",
      "--disable-software-rasterizer",
    ],
    timeout: 25000,
  };
  if (isCore) {
    let chromePath = getChromiumPath();
    if (!chromePath) {
      // puppeteer-core gak bawa browser — executablePath-nya undefined.
      // Coba dari package full 'puppeteer' (bawa cache ~/.cache/puppeteer),
      // kalau gak ada → kasih error jelas (jangan crash TypeError aneh).
      try {
        const full = await import("puppeteer");
        // 🔹 FIX 18 Sep 2026: puppeteer v24+ executablePath() balikin PROMISE —
        // dulu string. Gak di-await = "[object Promise]" → launch gagal.
        const pfn = full.default?.executablePath || full.executablePath;
        if (pfn) {
          const p = await pfn();
          if (p) chromePath = p;
        }
      } catch { /* full puppeteer gak keinstall */ }
    }
    if (!chromePath) {
      throw new Error(
        "chromium gak ketemu — install penuh: npm install puppeteer, atau set env PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium"
      );
    }
    launchOptions.executablePath = chromePath;
  }
  const libsEnv = chromeLibsEnv();
  if (libsEnv) launchOptions.env = { ...process.env, ...libsEnv };
  browserInstance = await puppeteer.launch(launchOptions);
  lastUse = Date.now();
  return browserInstance;
}

export async function closeYtBrowser() {
  try {
    if (browserInstance) await browserInstance.close();
  } catch {}
  browserInstance = null;
  lastUse = 0;
}

// parse "1,2 jt x ditonton" / "1.2M views" → angka
function parseViews(raw) {
  if (!raw) return 0;
  const s = String(raw).toLowerCase().replace(/\s+/g, " ");
  const m = s.match(/([\d.,]+)\s*(rb|ribu|k|jt|juta|m|views|x|ditonton)?/);
  if (!m) return 0;
  const num = parseFloat(m[1].replace(/,/g, "."));
  if (isNaN(num)) return 0;
  if (/\b(jt|juta|m)\b/.test(s) || /m\b/.test(s)) return Math.round(num * 1e6);
  if (/\b(rb|ribu|k)\b/.test(s)) return Math.round(num * 1e3);
  return Math.round(num);
}

// 🔹 BROWSER SEARCH YOUTUBE — buka halaman hasil YouTube di chromium
// headless, ekstrak video dari DOM. Return array {title, author{name},
// duration{timestamp}, views, ago, url, description:''} (bentuk sama
// kayak yt-search supaya caller tinggal ganti sumber).
export async function browserSearchYoutube(query, { limit = 5, timeoutMs = 30000 } = {}) {
  const q = String(query || "").trim();
  if (!q) throw new Error("query kosong");
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "id-ID,id;q=0.9,en;q=0.8" });
    await page.goto(
      "https://www.youtube.com/results?search_query=" + encodeURIComponent(q),
      { waitUntil: "domcontentloaded", timeout: 25000 },
    );
    // tunggu hasil render — desktop DOM pakai ytd-video-renderer
    await page
      .waitForSelector("ytd-video-renderer, yt-lockup-view-model", { timeout: 15000 })
      .catch(() => {});
    // scroll dikit buat ngegasingin lazy-load item berikutnya
    await page.evaluate(() => window.scrollBy(0, 1200)).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    const items = await Promise.race([
      page.evaluate((max) => {
        const out = [];
        const seen = new Set();
        // DOM desktop klasik + DOM baru (yt-lockup-view-model)
        const nodes = [
          ...document.querySelectorAll("ytd-video-renderer"),
          ...document.querySelectorAll("yt-lockup-view-model"),
        ];
        for (const el of nodes) {
          if (out.length >= max) break;
          const a = el.querySelector('a[href*="/watch?v="], a[href^="/watch"]');
          if (!a) continue;
          let url = a.getAttribute("href") || "";
          if (url.startsWith("/")) url = "https://www.youtube.com" + url;
          url = url.split("&")[0];
          if (seen.has(url)) continue;

          // judul: #video-title (desktop) / aria-label (DOM baru)
          const titleEl = el.querySelector("#video-title, h3, .yt-lockup-metadata-view-model__title a");
          let title = (titleEl?.textContent || titleEl?.getAttribute?.("title") || a.getAttribute("title") || "").trim();
          if (!title) {
            title = (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 120);
          }

          // channel
          const chEl = el.querySelector("ytd-channel-name a, .yt-lockup-metadata-view-model a[href^='/@']");
          const channel = (chEl?.textContent || "").trim();

          // metadata: "1,2 jt x ditonton • 2 minggu lalu" / "1.2M views • 2 weeks ago"
          const metaEls = el.querySelectorAll("#metadata-line span, .yt-lockup-metadata-view-model__meta-info span");
          let viewsRaw = "";
          let ago = "";
          for (const sp of metaEls) {
            const txt = (sp.textContent || "").trim();
            if (!txt) continue;
            if (/ditonton|views/i.test(txt)) viewsRaw = txt;
            else if (/lalu|ago|jam|menit|hari|minggu|bulan|tahun|hour|day|week|month|year|minute/i.test(txt)) ago = txt;
          }

          // durasi: #length (desktop) / badge
          const durEl = el.querySelector("#length, .badge-shape-wiz__text");
          const durTxt = (durEl?.textContent || "").trim();

          if (title && url) {
            seen.add(url);
            out.push({ title, channel, durTxt, viewsRaw, ago, url });
          }
        }
        return out;
      }, limit),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("ekstraksi DOM timeout")), timeoutMs),
      ),
    ]);

    // normalisasi ke bentuk yt-search supaya caller (searchyt tool) seragam
    return items.map((it) => ({
      title: it.title,
      author: { name: it.channel || "-" },
      duration: { timestamp: it.durTxt || "-" },
      views: parseViews(it.viewsRaw),
      ago: it.ago || "",
      description: "", // list page gak punya deskripsi — kartu info handle kosong
      url: it.url,
    }));
  } finally {
    await page.close().catch(() => {});
    lastUse = Date.now();
  }
}

// 🔹 BROWSER WATCH PAGE — buka halaman video (watch?v=...) di chromium dan
// sedot info LENGKAP dari DOM: judul, channel, views persis, tanggal
// upload, jumlah like, DESKRIPSI FULL (klik expand "...lagi"), plus daftar
// video terkait. Request owner 14 Sep: "klo bsa sih jgn ngandelin yg lokal
// tp pakai puppeteer chromium dia buka web youtube biar bsa cri info
// lngkapnya sebebas agentnya gt" — hasil list page itu cuma ringkasan;
// watch page punya semuanya. Semua ekstraksi best-effort (gak ada → "").
export async function browserYtWatchInfo(url, { timeoutMs = 35000 } = {}) {
  const u = String(url || "").trim();
  if (!/youtube\.com\/watch\?v=/i.test(u)) throw new Error("bukan link watch page youtube");
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "id-ID,id;q=0.9,en;q=0.8" });
    await page.goto(u, { waitUntil: "domcontentloaded", timeout: 25000 });
    // tunggu judul render
    await page
      .waitForSelector("h1.ytd-watch-metadata, h1.ytWatchMetadataFragmentHostWatchMetadata, #above-the-fold #title", { timeout: 15000 })
      .catch(() => {});

    const info = await Promise.race([
      page.evaluate(async () => {
        const pick = (sel) => {
          for (const s of (Array.isArray(sel) ? sel : [sel])) {
            const el = document.querySelector(s);
            if (el) {
              const t = (el.textContent || el.getAttribute?.("title") || el.getAttribute?.("aria-label") || "").trim();
              if (t) return t;
            }
          }
          return "";
        };

        // durasi: meta itemprop="duration" content="PT4M50S" — selalu ada
        // di watch page (list page DOM baru sering gak punya badge durasi)
        let durIso = "";
        try {
          durIso = document.querySelector('meta[itemprop="duration"]')?.getAttribute("content") || "";
        } catch {}

        // judul video (DOM lama + baru)
        const title =
          pick("h1.ytd-watch-metadata yt-formatted-string") ||
          pick("h1.ytd-watch-metadata") ||
          pick("#above-the-fold #title") ||
          pick("h1");

        // channel
        const channel =
          pick("ytd-channel-name#channel-name a") ||
          pick("ytd-channel-name a") ||
          pick("#owner-channel-name a") ||
          pick("yt-formatted-string#owner-channel-name a");

        // info text: "1.234.567 x ditonton 3 minggu lalu" (DOM baru:
        // ytd-watch-info-text; lama: #info #info-text). Format tampilan
        // baru kadang "123 rb x ditonton" + tanggal terpisah.
        const infoText =
          pick("ytd-watch-info-text") ||
          pick("#info-container #info-text") ||
          pick("#count #info-text") ||
          pick("#info");
        const dateText =
          pick("ytd-watch-info-text yt-formatted-string.bold") ||
          "";

        // like: aria-label tombol like — pola YouTube:
        // "like this video along with 15 other people" (EN)
        // "suka video ini bersama 15 pengguna lain" (ID)
        // "suka ini" (belum ada like) → gak ada angka → 0.
        // GOTCHA (ketemu live 14 Sep): JANGAN test /m/i longgar di teks
        // label — kata "bersama"/"comment" aja udah ngandung 'm' → 15
        // kebaca 15 jt. Wajib pola "along with/bersama N" + suffix TERIKAT.
        let likes = 0;
        try {
          const btn = document.querySelector("#like-button button, like-button-view-model button");
          const raw = (btn?.getAttribute("aria-label") || btn?.getAttribute("title") || "");
          const m =
            raw.match(/(?:along with|bersama)\s+([\d.,]+)\s*(rb|ribu|k|jt|juta|million|thousand)?/i) ||
            raw.match(/^([\d.,]+)\s*(rb|ribu|k|jt|juta|million|thousand)?\s*(orang|people|pengguna|suka|like|penonton)/i);
          if (m) {
            let t = String(m[1]).trim();
            if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
            else t = t.replace(/,/g, "");
            t = t.replace(/\.(?=\d{3}($|\D))/g, "");
            const num = parseFloat(t);
            if (!isNaN(num)) {
              const suf = String(m[2] || "").toLowerCase();
              if (["jt", "juta", "million"].includes(suf)) likes = Math.round(num * 1e6);
              else if (["rb", "ribu", "k", "thousand"].includes(suf)) likes = Math.round(num * 1e3);
              else likes = Math.round(num);
            }
          }
        } catch {}

        // DESKRIPSI FULL — klik "...lagi"/expand dulu biar teks gak kepotong
        let description = "";
        try {
          for (const sel of ["tp-yt-paper-button#expand", "#expand", "#description-inline-expander #expand"]) {
            const btn = document.querySelector(sel);
            if (btn) { btn.click(); break; }
          }
          await new Promise((r) => setTimeout(r, 600));
          description =
            (document.querySelector("#description-inline-expander")?.textContent ||
              document.querySelector("ytd-text-inline-expander#expander #content")?.textContent ||
              document.querySelector("ytd-text-inline-expander #attributed-snippet-text-content")?.textContent ||
              "").trim();
        } catch {}

        // video terkait dari kolom samping (related)
        const related = [];
        try {
          const nodes = [
            ...document.querySelectorAll("ytd-compact-video-renderer"),
            ...document.querySelectorAll("ytd-watch-next-secondary-results-renderer yt-lockup-view-model"),
          ];
          for (const el of nodes) {
            if (related.length >= 4) break;
            const a = el.querySelector('a[href*="/watch?v="], a[href^="/watch"]');
            if (!a) continue;
            let href = a.getAttribute("href") || "";
            if (!href.includes("/watch?v=")) continue;
            if (href.startsWith("/")) href = "https://www.youtube.com" + href;
            href = href.split("&")[0];
            const t =
              (el.querySelector("#video-title, h3, .yt-lockup-metadata-view-model__title a")?.getAttribute("title") ||
                el.querySelector("#video-title, h3, .yt-lockup-metadata-view-model__title a")?.textContent ||
                a.getAttribute("aria-label") ||
                "").trim();
            if (t && !related.some((x) => x.url === href)) related.push({ title: t.slice(0, 120), url: href });
          }
        } catch {}

        return { title, channel, infoText, dateText, durIso, likes, description, related };
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ekstraksi watch page timeout")), timeoutMs)),
    ]);

    // pecah infoText → views + tanggal ("1.234.567 x ditonton" / "3 minggu lalu")
    let views = 0;
    let ago = info.dateText || "";
    try {
      const parts = String(info.infoText || "").split(/\s{2,}|\u2022|\|/).map((x) => x.trim()).filter(Boolean);
      for (const p of parts) {
        if (/ditonton|views/i.test(p)) views = parseViews(p);
        else if (!ago && /lalu|ago|streaming|premiere|jam|menit|hari|minggu|bulan|tahun/i.test(p)) ago = p;
      }
    } catch {}

    // PT4M50S → "4:50"
    let durationTs = "";
    try {
      const dm = String(info.durIso || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
      if (dm) {
        const H = parseInt(dm[1] || "0", 10), M = parseInt(dm[2] || "0", 10), S = parseInt(dm[3] || "0", 10);
        const mm = H * 60 + M;
        durationTs = mm + ":" + String(S).padStart(2, "0");
      }
    } catch {}

    return {
      title: info.title || "",
      author: { name: info.channel || "" },
      duration: durationTs ? { timestamp: durationTs } : null,
      views,
      ago,
      likes: info.likes || 0,
      description: (info.description || "").trim(),
      related: info.related || [],
    };
  } finally {
    await page.close().catch(() => {});
    lastUse = Date.now();
  }
}
