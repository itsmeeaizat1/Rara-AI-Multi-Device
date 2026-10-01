// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 WEB BROWSER BERSAMA — chromium buka SITUS SEMBARANG (apkmirror,
// apkpure, toko online, dokumentasi, dll) — engine generic buat tool
// agent "carikan X di <situs>". Request owner 14 Sep 2026: "cba tes klo
// disuruh cari kayak carikan aplikasi whatsapp di apkmiror" — bug
// ke-konfirmasi: planner milih tool download (403) karena gak ada tool
// buka web sama sekali. Browser dipakai biar "sebebas agentnya" (pola
// yang sama kayak rara-yt-browser).
//   • browserSiteSearch(site, query) — cari dalam 1 situs via
//     DuckDuckGo HTML (site:domain) — hasil ASLI halaman, bukan AI.
//   • browserPageFacts(url) — buka halaman → judul + deskripsi + isi
//     teks utama (potongan) — info lengkap buat kartu + narasi.
// ============================================================

import { getBrowser } from "./rara-yt-browser.js";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// alias situs populer → domain bener (biar "apkmirror" tanpa .com jalan)
const SITE_ALIAS = {
  apkmirror: "apkmirror.com",
  apkpure: "apkpure.com",
  aptoide: "aptoide.com",
  playstore: "play.google.com",
  playstoreofficial: "play.google.com",
  gplay: "play.google.com",
  fassosiale: "fossosial.com",
};

// "apkmirror" / "www.apkmirror.com" / "https://apkmirror.com/..." → domain
export function normalizeSite(site) {
  let s = String(site || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (SITE_ALIAS[s]) s = SITE_ALIAS[s];
  if (!/^[\w-]+(\.[\w-]+)+$/.test(s)) return null; // harus domain bener
  return s;
}

// 🔹 CARI DALAM SATU SITUS — chromium buka DuckDuckGo HTML (gak pake API
// key, hasil ASLI) dengan query "site:<domain> <query>", ekstrak judul +
// link + snippet. Return [{title, url, snippet}] — kosong = gak nemu.
export async function browserSiteSearch(site, query, { limit = 5, timeoutMs = 30000 } = {}) {
  const domain = normalizeSite(site);
  if (!domain) throw new Error("situsnya gak valid — kasih nama situs bener (contoh: apkmirror)");
  const q = String(query || "").trim();
  if (!q) throw new Error("yang mau dicari kosong");
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9,id;q=0.8" });
    await page.goto(
      "https://html.duckduckgo.com/html/?q=" + encodeURIComponent("site:" + domain + " " + q),
      { waitUntil: "domcontentloaded", timeout: 25000 },
    );
    await new Promise((r) => setTimeout(r, 900));
    const items = await Promise.race([
      page.evaluate((max) => {
        const out = [];
        const seen = new Set();
        for (const el of document.querySelectorAll(".result__a, a.result__a")) {
          if (out.length >= max) break;
          let href = el.getAttribute("href") || "";
          // DDG html pakai redirect: /l/?uddg=<url-ter-encode>
          const uddg = (href.match(/[?&]uddg=([^&]+)/) || [])[1];
          if (uddg) href = decodeURIComponent(uddg);
          if (!/^https?:\/\//i.test(href)) continue;
          const title = (el.textContent || "").trim();
          if (!title || seen.has(href)) continue;
          seen.add(href);
          const wrap = el.closest(".result, .web-result");
          const snippet = (wrap?.querySelector(".result__snippet")?.textContent || "").trim();
          out.push({ title, url: href, snippet });
        }
        return out;
      }, limit),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ekstraksi DOM timeout")), timeoutMs)),
    ]);
    return items;
  } finally {
    await page.close().catch(() => {});
  }
}

// 🔹 WEB SEARCH UMUM (tanpa site:) — query bebas (pola searchsite),
// hasil DDG polos {title, url, snippet} — pola sama kayak browserSiteSearch
// (chromium beneran, DDG blok request axios polos dari IP datacenter).
export async function browserWebSearch(query, { limit = 5, timeoutMs = 30000 } = {}) {
  const q = String(query || "").trim();
  if (!q) throw new Error("yang mau dicari kosong");
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9,id;q=0.8" });
    await page.goto("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q), { waitUntil: "domcontentloaded", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 900));
    const items = await Promise.race([
      page.evaluate((max) => {
        const out = [];
        const seen = new Set();
        for (const el of document.querySelectorAll(".result__a, a.result__a")) {
          if (out.length >= max) break;
          let href = el.getAttribute("href") || "";
          const uddg = (href.match(/[?&]uddg=([^&]+)/) || [])[1];
          if (uddg) href = decodeURIComponent(uddg);
          if (!/^https?:\/\//i.test(href)) continue;
          const title = (el.textContent || "").trim();
          if (!title || seen.has(href)) continue;
          seen.add(href);
          const wrap = el.closest(".result, .web-result");
          const snippet = (wrap?.querySelector(".result__snippet")?.textContent || "").trim();
          out.push({ title, url: href, snippet });
        }
        return out;
      }, limit),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ekstraksi DOM timeout")), timeoutMs)),
    ]);
    if (!items.length) throw new Error("gak nemu hasil buat query itu (coba query lain)");
    return items;
  } finally {
    await page.close().catch(() => {});
  }
}

// 🔹 BUKA HALAMAN → FAKTA — chromium buka halaman hasil teratas dan
// sedot: judul, meta description, potongan isi teks utama (bukan
// boilerplate nav/footer — ambil dari main/article/#content kalau ada).
export async function browserPageFacts(url, { timeoutMs = 30000 } = {}) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) throw new Error("link-nya gak valid");
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9,id;q=0.8" });
    await page.goto(u, { waitUntil: "domcontentloaded", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1200));
    const facts = await Promise.race([
      page.evaluate(() => {
        const title =
          (document.querySelector("h1")?.textContent || document.title || "").trim();
        const description = (
          document.querySelector('meta[name="description"]')?.getAttribute("content") || ""
        ).trim();
        // isi utama: prioritas main/article/#content, fallback body —
        // bersihin nav/script/iklan biar teksnya inti halaman
        let text = "";
        for (const sel of ["main", "article", "#content", ".content"]) {
          const el = document.querySelector(sel);
          if (el && (el.textContent || "").trim().length > 300) {
            text = el.textContent;
            break;
          }
        }
        if (!text) text = document.body?.textContent || "";
        text = (text || "").replace(/\s+/g, " ").trim();
        return { title, description, text };
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ekstraksi halaman timeout")), timeoutMs)),
    ]);
    // 🔹 SCREENSHOT VIEWPORT — "gambaran web yang agent lihat" (request
    // owner 14 Sep: "preview thumbnail itu gambaran web yg agent lihat
    // gt kyk youtube aja td gt kyk browsing live"). Ini snapshot ASLI
    // halaman yang kebuka di layar chromium — kayak browsing live.
    // jpeg quality 70 biar ringan buat WA; viewport 1280x900 (bagian
    // atas halaman — konten utama), gak fullPage (halaman toko bisa
    // puluhan ribu px tinggi).
    let screenshot = null;
    try {
      screenshot = await page.screenshot({ type: "jpeg", quality: 70, fullPage: false });
      if (!screenshot || screenshot.length < 2000) screenshot = null;
    } catch {}

    return {
      title: facts.title || "",
      description: facts.description || "",
      // potongan isi — 1600 char pertama (bukaan halaman biasanya udah
      // nyeritain apapun halamannya: versi app, harga, spec, dll)
      text: (facts.text || "").slice(0, 1600).trim(),
      screenshot,
    };
  } finally {
    await page.close().catch(() => {});
  }
}
