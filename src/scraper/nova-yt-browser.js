// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 YOUTUBE BROWSER SEARCH — pencarian YouTube pakai BROWSER BENERAN
// (puppeteer/chromium), bukan AI & bukan HTTP scraper.
// 🔹 Request owner 14 Sep 2026: "klo disuruh cari jgn pakai kecerdasan
// ai tp agent mencari pakai browser beneran seperti umumnya di ai
// superagent" — .novaagent searchyt pakai jalur INI duluan, baru
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

async function getBrowser() {
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
        const p = full.default?.executablePath?.() || full.executablePath?.();
        if (p) chromePath = p;
      } catch { /* full puppeteer gak keinstall */ }
    }
    if (!chromePath) {
      throw new Error(
        "chromium gak ketemu — install penuh: npm install puppeteer, atau set env PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium"
      );
    }
    launchOptions.executablePath = chromePath;
  }
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
