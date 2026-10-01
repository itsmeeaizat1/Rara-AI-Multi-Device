// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-playdouyin.js — orkestrasi .playdouyin (DOUYIN MURNI, TIKTOK TIDAK
// NYAMPUR — request owner "jlo douyin .douyin g nyampur sm tiktok").
// Fitur BARU — .tiktok/.douyin/.playtiktok LAMA TIDAK DISENTUH (reuse import
// doang, file lama gak diubah).
//
//   KEYWORD : Apify douyin search (vulnv → zen-studio) + cache keyword 30 mnt
//             biar search berulang gak di-billing dobel ($0.005/hasil).
//   LINK    : HANYA link douyin.com/v.douyin.com/iesdouyin.com.
//             Rantai resolve: snapvideotools (video + FOTO SLIDE via
//             mediaUrls type image — call sendiri, douyin.js lama gak
//             disentuh) → snaptik.fi (jalur .douyin lama) → ikyy.
//             Link tiktok.com DITOLAK jelas (pisah total dari TikTok).

import axios from "axios";
import { douyinSearch, setDouyinSearchRunner, normalizeDouyinItem } from "../scraper/douyin-search.js";
import { snaptikDouyin } from "../scraper/snaptik-douyin.js";
import { ikyyDownload } from "../scraper/ikyydl.js";

export { setDouyinSearchRunner, normalizeDouyinItem };

// ── validasi link ──
export function isDouyinLink(text) {
  const t = String(text || "");
  return /(douyin\.com|iesdouyin\.com)/i.test(t) && !/tiktok\.com/i.test(t);
}

export function isTikTokLink(text) {
  return /tiktok\.com/i.test(String(text || ""));
}

export function extractUrl(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s]+/g);
  return matches ? matches[0] : null;
}

// ── resolve injectable (E2E offline) ──
let _resolver = null;
export function setDouyinResolver(fn) {
  _resolver = typeof fn === "function" ? fn : null;
}
export function resetPlayDouyinDeps() {
  _resolver = null;
  _cache.clear();
}

// ── cache keyword (anti double-billing Apify) ──
const CACHE_TTL_MS = 30 * 60 * 1000;
const _cache = new Map();
function cacheGet(keyword) {
  const hit = _cache.get(keyword);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    _cache.delete(keyword);
    return null;
  }
  return hit;
}

/**
 * Cari video/foto douyin dari KEYWORD (random cursor gak ada — douyin search
 * aktor pake keyword langsung). Hasil di-cache 30 menit per keyword.
 * @returns {Promise<{items: Array, source: string, error: string|null}>}
 */
export async function searchPlayDouyin(keyword) {
  const kw = String(keyword || "").trim();
  const cached = cacheGet(kw);
  if (cached) return { items: cached.items, source: cached.source, error: null };

  const r = await douyinSearch(kw, { maxResults: 5 });
  if (!r.ok || !r.items?.length) {
    return { items: [], source: "", error: r.error || "Gak nemu hasil untuk keyword itu." };
  }
  _cache.set(kw, { ts: Date.now(), items: r.items, source: r.source });
  return { items: r.items, source: r.source, error: null };
}

// ── resolve: snapvideotools (call sendiri — douyin.js LAMA gak disentuh) ──
async function snapResolve(url) {
  const r = await axios.post(
    "https://snapvideotools.com/api/snap",
    { text: url },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://snapvideotools.com/",
        Origin: "https://snapvideotools.com",
      },
      timeout: 30000,
    },
  );
  const data = r.data?.data;
  const mediaUrls = data?.mediaUrls || [];
  const videos = mediaUrls.filter((m) => m?.type === "video").map((m) => m.url);
  const images = mediaUrls.filter((m) => m?.type === "image" || m?.type === "photo").map((m) => m.url);
  const audio = mediaUrls.find((m) => m?.type === "audio")?.url || "";
  if (!videos.length && !images.length) return null;
  return {
    type: images.length && !videos.length ? "photo" : "video",
    id: "",
    title: data?.title || "",
    cover: "",
    link: url,
    author: { name: data?.platformName || "Douyin", handle: "" },
    stats: { plays: 0, likes: 0, comments: 0, shares: 0 },
    video: { noWatermark: videos[0] || "", hd: "", watermark: "" },
    images,
    music: { url: audio, title: "" },
  };
}

// ── resolve: snaptik.fi (jalur utama .douyin lama) ──
async function snaptikResolve(url) {
  const r = await snaptikDouyin(url);
  if (!r?.status || !r.video) return null;
  return {
    type: "video",
    id: "",
    title: r.title || "",
    cover: r.cover || "",
    link: url,
    author: { name: r.artist || "", handle: "" },
    stats: {
      plays: Number(r.statistics?.play_count ?? r.statistics?.plays) || 0,
      likes: Number(r.statistics?.digg_count ?? r.statistics?.likes) || 0,
      comments: Number(r.statistics?.comment_count ?? r.statistics?.comments) || 0,
      shares: Number(r.statistics?.share_count ?? r.statistics?.shares) || 0,
    },
    video: { noWatermark: r.video, hd: "", watermark: "" },
    images: [],
    music: { url: r.audio || r.mp3 || "", title: "" },
  };
}

// ── resolve: ikyy fallback (shape: { medias:[{url,quality,ext,type}] }) ──
async function ikyyResolve(url) {
  const r = await ikyyDownload(url, "douyin", { apikey: "kyzz" });
  if (!r?.medias?.length) return null;
  const videos = r.medias.filter((m) => m.type === "video").map((m) => m.url);
  const images = r.medias.filter((m) => m.type === "image").map((m) => m.url);
  const audio = r.medias.find((m) => m.type === "audio")?.url || "";
  if (!videos.length && !images.length) return null;
  return {
    type: images.length && !videos.length ? "photo" : "video",
    id: "",
    title: r.title || "",
    cover: r.thumbnail || "",
    link: url,
    author: { name: r.author || "", handle: "" },
    stats: { plays: 0, likes: 0, comments: 0, shares: 0 },
    video: { noWatermark: videos[0] || "", hd: "", watermark: "" },
    images,
    music: { url: audio, title: "" },
  };
}

/**
 * Resolve LINK Douyin → video ATAU foto slide.
 * @returns {Promise<{item: object|null, source: string, error: string|null}>}
 */
export async function resolvePlayDouyin(url) {
  if (_resolver) {
    const item = await _resolver(url);
    if (item) return { item, source: "Mock", error: null };
    return { item: null, source: "", error: "gagal" };
  }

  const chains = [
    [snapResolve, "SnapVideoTools"],
    [snaptikResolve, "SnapTik"],
    [ikyyResolve, "Ikyy"],
  ];
  for (const [fn, source] of chains) {
    try {
      const item = await fn(url);
      if (item && (item.images.length || item.video.noWatermark)) {
        return { item, source, error: null };
      }
    } catch (e) {
      console.error(`[playdouyin] resolve ${source} error:`, e.message);
    }
  }
  return {
    item: null,
    source: "",
    error: "Link-nya gak bisa diproses — pastiin link Douyin valid (post foto tertentu kadang gak didukung resolver).",
  };
}

export function pickRandom(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function pickBestVideoUrl(item) {
  return item?.video?.noWatermark || item?.video?.hd || item?.video?.watermark || "";
}
