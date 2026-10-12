// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/scraper/mori-bridge.js — BRIDGE ESM → SCRAPERS MORI (CJS)
//
// Sumber: github.com/coflyn/scrapr 1.2.1 (author Mori, MIT) — tersimpan
// utuh di src/scraper/mori/ sebagai CADANGAN engine, file upstream NO TOUCH.
// Upgrade 12 Okt 2026: sync scrapr 1.2.1 (bareng Mori v4.4.0) —
//   BARU: reddit/rapidsave, terabox/sechno, rednote/direct, pixiv/ajax,
//         bandcamp/direct, bilibili/direct, instagram/snapsave+direct,
//         pinterest/direct, twitter/savetwt+direct, youtube/ytmp3gg+playlist,
//         spotify/soundloaders(spotimate)+spotisaver, tiktok/tikdownloader,
//         resolver/{mediafire,sfile,safelinku,sub2unlock,rekonise,unshorten}
//   FIX upstream: ytmp3 cache-buster+redirect loop, bandcamp /get/token,
//         threadster JWT payload, douyin ttwid PoW, indown 403, pindown AES,
//         klickaud 403, spotidown session, tikdownloader CF 403, savetwt 422
//   HAPUS upstream: instagram/downreels (host mati), bilibili/snapwc
//         (Node 20+ nolak RSA_PKCS1 — diganti bilibili/direct).
//
// 3 scraper browser — tiktok/savetik, facebook/fdown, instagram/snapinsta —
// di-bridge LAZY: file tetep ada, aktif otomatis begitu dependensinya
// diinstal (savetik/fdown: Chrome terpasang, puppeteer-core udah di deps bot;
// snapinsta: npm i playwright-extra puppeteer-extra-plugin-stealth playwright).
//
// Schema uniform semua scraper Mori:
//   { status: true, result: { title, thumbnail, type, downloads: [{url, type, quality}] } }
//   { status: false, message }
// Resolver (beda schema — link unwrapping, bukan media):
//   { status: true, result: { url, filename?, filesize? } ... }

import { createRequire } from "node:module";
import aplmate from "./mori/applemusic/index.js";
import bandcampdownloader from "./mori/bandcamp/bandcampdownloader/index.js";
import bandcampDirect from "./mori/bandcamp/direct/index.js";
import bilibiliDirect from "./mori/bilibili/direct/index.js";
import douyinDirect from "./mori/douyin/direct/index.js";
import igIndown from "./mori/instagram/indown/index.js";
import igSnapsave from "./mori/instagram/snapsave/index.js";
import igDirect from "./mori/instagram/direct/index.js";
import pinDown from "./mori/pinterest/pindown/index.js";
import pinterestDirect from "./mori/pinterest/direct/index.js";
import pixivAjax from "./mori/pixiv/ajax/index.js";
import redditRapidsave from "./mori/reddit/rapidsave/index.js";
import rednoteDirect from "./mori/rednote/direct/index.js";
import klickaud from "./mori/soundcloud/klickaud/index.js";
import spotidown from "./mori/spotify/spotidown/index.js";
import spotimate from "./mori/spotify/spotmate/index.js";
import soundloaders from "./mori/spotify/soundloaders/index.js";
import spotisaver from "./mori/spotify/spotisaver/index.js";
import threadster from "./mori/threads/threadster/index.js";
import tiktokio from "./mori/tiktok/tiktokio/index.js";
import snaptik from "./mori/tiktok/snaptik/index.js";
import ssstik from "./mori/tiktok/ssstik/index.js";
import tikdownloader from "./mori/tiktok/tikdownloader/index.js";
import tweeload from "./mori/twitter/tweeload/index.js";
import tvd from "./mori/twitter/tvd/index.js";
import savetwt from "./mori/twitter/savetwt/index.js";
import twitterDirect from "./mori/twitter/direct/index.js";
import ytmp3 from "./mori/youtube/ytmp3/index.js";
import ytmp3gg from "./mori/youtube/ytmp3gg/index.js";
import ytPlaylist from "./mori/youtube/playlist/index.js";
import teraboxSechno from "./mori/terabox/sechno/index.js";
import fbSnapsave from "./mori/facebook/snapsave/index.js";
import resolverMediafire from "./mori/resolver/mediafire/index.js";
import resolverSfile from "./mori/resolver/sfile/index.js";
import resolverSafelinku from "./mori/resolver/safelinku/index.js";
import resolverSub2unlock from "./mori/resolver/sub2unlock/index.js";
import resolverRekonise from "./mori/resolver/rekonise/index.js";
import resolverUnshorten from "./mori/resolver/unshorten/index.js";

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
  bandcamp: { bandcampdownloader: bandcampdownloader.scrape, direct: bandcampDirect.scrape },
  bilibili: { direct: bilibiliDirect.scrape },
  douyin: { direct: douyinDirect.scrape },
  facebook: { snapsave: fbSnapsave.scrape, fdown: lazyBrowserScrape("facebook", "fdown") },
  instagram: { indown: igIndown.scrape, snapsave: igSnapsave.scrape, direct: igDirect.scrape, snapinsta: lazyBrowserScrape("instagram", "snapinsta") },
  pinterest: { pindown: pinDown.scrape, direct: pinterestDirect.scrape },
  pixiv: { ajax: pixivAjax.scrape },
  reddit: { rapidsave: redditRapidsave.scrape },
  rednote: { direct: rednoteDirect.scrape },
  soundcloud: { klickaud: klickaud.scrape },
  spotify: { spotmate: spotimate.scrape, spotidown: spotidown.scrape, soundloaders: soundloaders.scrape, spotisaver: spotisaver.scrape },
  terabox: { sechno: teraboxSechno.scrape },
  threads: { threadster: threadster.scrape },
  tiktok: { tiktokio: tiktokio.scrape, snaptik: snaptik.scrape, ssstik: ssstik.scrape, tikdownloader: tikdownloader.scrape, savetik: lazyBrowserScrape("tiktok", "savetik") },
  twitter: { tweeload: tweeload.scrape, tvd: tvd.scrape, savetwt: savetwt.scrape, direct: twitterDirect.scrape },
  youtube: { ytmp3: ytmp3.scrape, ytmp3gg: ytmp3gg.scrape, playlist: ytPlaylist.scrape },
};

// Resolver (schema beda — bukan media, tapi link unwrap):
export const MORI_RESOLVER = {
  mediafire: resolverMediafire.scrape,
  sfile: resolverSfile.scrape,
  safelinku: resolverSafelinku.scrape,
  sub2unlock: resolverSub2unlock.scrape,
  rekonise: resolverRekonise.scrape,
  unshorten: resolverUnshorten.scrape,
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
    throw e;
  }
  if (res?.status !== true || !res?.result?.downloads?.length) {
    throw new Error(`mori:${platform}/${method} — ${res?.message || "hasil kosong"}`);
  }
  return res.result;
}

// Panggil resolver Mori (mediafire/sfile/safelinku/sub2unlock/rekonise/
// unshorten) — return URL tujuan + metadata, lempar Error kalau gagal.
export async function moriResolve(method, url) {
  const fn = MORI_RESOLVER?.[method];
  if (typeof fn !== "function") {
    throw new Error(`mori:resolver/${method} gak ada di bridge`);
  }
  const res = await fn(url);
  if (res?.status !== true || !res?.result) {
    throw new Error(`mori:resolver/${method} — ${res?.message || "resolve gagal"}`);
  }
  return res.result;
}
