// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/mori-bridge.js — BRIDGE ESM → SCRAPERS MORI (CJS)
//
// Sumber: github.com/coflyn/scrapr (author Mori, MIT) — tersimpan utuh
// di src/scraper/mori/ sebagai CADDANGAN engine, file upstream NO TOUCH.
//
// Bridge ini hanya nyambungin 18 method HTTP murni (axios/cheerio/crypto).
// 3 scraper browser — tiktok/savetik, facebook/fdown, instagram/snapinsta —
// sengaja GAK di-bridge: butuh Chrome/Playwright yang gak tersedia di VPS.
//
// Schema uniform semua scraper Mori:
//   { status: true, result: { title, thumbnail, type, downloads: [{url, type, quality}] } }
//   { status: false, message }

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

export const MORI = {
  applemusic: { aplmate: aplmate.scrape },
  bandcamp: { bandcampdownloader: bandcampdownloader.scrape },
  bilibili: { snapwc: snapwc.scrape },
  douyin: { direct: douyinDirect.scrape },
  facebook: { snapsave: snapsave.scrape },
  instagram: { indown: indown.scrape, downreels: downreels.scrape },
  pinterest: { pindown: pindown.scrape },
  soundcloud: { klickaud: klickaud.scrape },
  spotify: { spotmate: spotmate.scrape, spotidown: spotidown.scrape },
  threads: { threadster: threadster.scrape },
  tiktok: { tiktokio: tiktokio.scrape, snaptik: snaptik.scrape, ssstik: ssstik.scrape },
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
