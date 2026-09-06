// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
//  Shopee No-Watermark Downloader (ESM scraper)
//  Target  : https://shopeenowatermark.com/api/extract
//  Masalah : API sekarang dikasih Cloudflare challenge
//            ("Just a moment...") — fetch/axios polos → 403.
//  Solusi 2 lapis:
//    A. axios + cookie jar + warm-up GET (port script owner
//       2026-09-06, t.me/IkyyExecutive) — jalan kalau CF gak
//       challenge IP kita (mis. IP Indonesia/VPS).
//    B. Puppeteer headless: buka homepage (CF managed challenge
//       ke-solve di Chromium asli), lalu fetch /api/extract dari
//       dalam konteks page — bawa cookie cf_clearance otomatis.
//  Engine VERIFIED HIDUP 2026-09-06 via real browser (Browserbase):
//    link tes id.shp.ee/glm8vbqa → pilihan kualitas V720P/V540P/
//    V360P (+ varian H.265) muncul. Yang mati cuma jalur axios
//    polos, bukan engine-nya.
// ============================================================

import axios from "axios";
import FormData from "form-data";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const BASE_URL = "https://shopeenowatermark.com";

const UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36";

/** Normalisasi response API ke bentuk { videos, title } */
function parseExtract(data) {
  if (!data || data.success === false) return null;
  const d = data.data || data;
  const rawVideos = d.videos || d.video_list || [];
  const videos = (Array.isArray(rawVideos) ? rawVideos : [])
    .map((v) => ({
      url: v.url || v.download_url || v.link || (typeof v === "string" ? v : null),
      quality: v.quality || v.label || null,
    }))
    .filter((v) => v.url);
  if (!videos.length) return null;
  return {
    title: d.title || d.video_title || null,
    cover: d.cover || d.thumbnail || d.image || null,
    videos,
  };
}

/** Lapis A — axios + cookie jar + warm-up (port script owner) */
async function viaAxios(url) {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
      headers: { "User-Agent": UA },
    })
  );

  await client.get(BASE_URL);

  const form = new FormData();
  form.append("url", url);

  const { data } = await client.post(`${BASE_URL}/api/extract`, form, {
    headers: {
      ...form.getHeaders(),
      Origin: BASE_URL,
      Referer: `${BASE_URL}/`,
    },
  });

  return parseExtract(data);
}

/** Lapis B — Puppeteer: tembus CF challenge, fetch dari konteks page */
async function viaPuppeteer(url) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Tunggu CF challenge kelar (kalau gak ada challenge, ini instan)
    await page
      .waitForFunction(() => !document.title.toLowerCase().includes("just a moment"), {
        timeout: 30000,
      })
      .catch(() => {});

    const data = await page.evaluate(async (u) => {
      const fd = new FormData();
      fd.append("url", u);
      const r = await fetch("/api/extract", { method: "POST", body: fd });
      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, message: `HTTP ${r.status}`, raw: text.slice(0, 120) };
      }
    }, url);

    return parseExtract(data);
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Extract video Shopee no-watermark via shopeenowatermark.com.
 * @param {string} url - Link video Shopee (shopee.co.id / shp.ee / id.shp.ee)
 * @returns {Promise<{videos:Array<{url:string,quality:string|null}>, title:string|null, cover:string|null}|null>}
 * @throws kalau semua lapis gagal
 */
export async function shopeeNoWm(url) {
  if (!url || typeof url !== "string") throw new Error("URL Shopee harus berupa string tautan yang valid.");

  // Lapis A: cepat, tanpa browser
  try {
    const viaA = await viaAxios(url);
    if (viaA) return viaA;
  } catch (e) {
    console.log("[shopee-nowm] lapis A (axios) gagal:", (e.response?.status || "") + "", e.message?.slice(0, 80));
  }

  // Lapis B: Puppeteer — tembus CF challenge
  try {
    const viaB = await viaPuppeteer(url);
    if (viaB) return viaB;
  } catch (e) {
    console.log("[shopee-nowm] lapis B (puppeteer) gagal:", e.message?.slice(0, 80));
  }

  throw new Error("Gagal mengambil video Shopee (engine + CF fallback sama-sama gagal)");
}
