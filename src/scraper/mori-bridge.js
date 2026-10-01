// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/scraper/mori-bridge.js — BRIDGE ESM → SCRAPERS MORI (CJS)
//
// Sumber: github.com/coflyn/scrapr (author Mori, MIT) — tersimpan utuh
// di src/scraper/mori/ sebagai CADDANGAN engine, file upstream NO TOUCH.
//
// 18 method HTTP murni di-bridge langsung. 3 scraper browser —
// tiktok/savetik, facebook/fdown, instagram/snapinsta — di-bridge
// LAZY: file tetep ada, aktif otomatis begitu dependensinya diinstal
// (savetik/fdown: Chrome terpasang, puppeteer-core udah di deps bot;
// snapinsta: npm i playwright-extra puppeteer-extra-plugin-stealth playwright).
//
// Schema uniform semua scraper Mori:
//   { status: true, result: { title, thumbnail, type, downloads: [{url, type, quality}] } }
//   { status: false, message }

import { createRequire } from "node:module";
import aplmate from "./mori/applemusic/aplmate/index.js";
import bandcampdownloader from "./mori/bandcamp/bandcampdownloader/index.js";
import snapwc from "./mori/bilibili/snapwc/index.js";
import douyinDirect from "./mori/douyin/direct/index.js";
import snapsave from "./mori/facebook/snapsave/index.js";
import indown from "./mori/instagram/indown/index.js";
import downreels from "./mori/instagram/downreels/index.js";
import pindown from "./mori/pinterest/pindown/index.js";
import klickaud from "./mori/soundcloud/klickaud/index.js";
import spotidown from "./mori/spotify/spotidown/index.js";
import spotmate from "./mori/spotify/spotmate/index.js";
import threadster from "./mori/threads/threadster/index.js";
import snaptik from "./mori/tiktok/snaptik/index.js";
import ssstik from "./mori/tiktok/ssstik/index.js";
import tiktokio from "./mori/tiktok/tiktokio/index.js";
import tvd from "./mori/twitter/tvd/index.js";
import tweeload from "./mori/twitter/tweeload/index.js";
import ytmp3 from "./mori/youtube/ytmp3/index.js";

// ── Lazy loader untuk scraper browser Mori ──────────────────────────
// Module di-require pas PERTAMA KALI dipakai (bukan pas bot start),
// jadi bridge gak crash walau playwright/chrome belum diinstal.
// Hasil require di-cache biar scrape berikutnya cepat.
const requireCjs = createRequire(import.meta.url);
const browserScrapeCache = {};

function lazyBrowserScrape(platform, method) {
  const depsHint = {
    savetik: "Google Chrome terpasang di server (puppeteer-core sudah ada di deps bot)",
    fdown: "Google Chrome terpasang di server (puppeteer-core sudah ada di deps bot)",
    snapinsta: "npm install playwright-extra puppeteer-extra-plugin-stealth playwright",
  }[method];
  return async (url) => {
    if (!browserScrapeCache[method]) {
      let mod;
      try {
        mod = requireCjs(`./mori/${platform}/${method}/index.js`);
      } catch (e) {
        if (/Cannot find module|MODULE_NOT_FOUND/.test(String(e?.message || e))) {
          throw new Error(`mori ${method}: dependensi browser belum diinstal — ${depsHint}`);
        }
        throw e;
      }
      browserScrapeCache[method] = mod.scrape;
    }
    return browserScrapeCache[method](url);
  };
}

export const MORI = {
  applemusic: { aplmate: aplmate.scrape },
  bandcamp: { bandcampdownloader: bandcampdownloader.scrape },
  bilibili: { snapwc: snapwc.scrape },
  douyin: { direct: douyinDirect.scrape },
  facebook: { snapsave: snapsave.scrape, fdown: lazyBrowserScrape("facebook", "fdown") },
  instagram: { indown: indown.scrape, downreels: downreels.scrape, snapinsta: lazyBrowserScrape("instagram", "snapinsta") },
  pinterest: { pindown: pindown.scrape },
  soundcloud: { klickaud: klickaud.scrape },
  spotify: { spotmate: spotmate.scrape, spotidown: spotidown.scrape },
  threads: { threadster: threadster.scrape },
  tiktok: { tiktokio: tiktokio.scrape, snaptik: snaptik.scrape, ssstik: ssstik.scrape, savetik: lazyBrowserScrape("tiktok", "savetik") },
  twitter: { tweeload: tweeload.scrape, tvd: tvd.scrape },
  youtube: { ytmp3: ytmp3.scrape },
};

// Panggil scraper Mori tertentu — lempar Error kalau gagal (biar masuk
// pola multi-engine fallback di alldownloaderv3).
export async function moriScrape(platform, method, url, options) {
  const fn = MORI?.[platform]?.[method];
  if (typeof fn !== "function") {
    throw new Error(`mori:${platform}/${method} gak ada di bridge`);
  }
  let res;
  try {
    res = await fn(url, options);
  } catch (e) {
    // Bilibili SnapWC: handshake RSA PKCS1 — Node 20+ nolak
    // (butuh --security-revert=CVE-2023-46809 atau Node <20).
    if (/RSA_PKCS1_PADDING/.test(String(e?.message || e))) {
      throw new Error("mori bilibili: Node 20+ nolak RSA handshake snapwc (butuh flag --security-revert=CVE-2023-46809 atau Node <20)");
    }
    throw e;
  }
  if (res?.status !== true || !res?.result?.downloads?.length) {
    throw new Error(`mori:${platform}/${method} — ${res?.message || "hasil kosong"}`);
  }
  return res.result;
}
