// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-douyin-dl.js — fallback downloader douyin ekstra (request owner
// 2026-09-10: "tambah rantai fallback buat .douyin <url> — ikyy, haidar,
// sylvatica karena kebanyakan mereka ada fitur download video douyin").
// Ikyy udah ada di rantai douyindl.js — lib ini nambah HAIDAR + SYLVATICA.
// Semua injectable (setHaidarDouyin/setSylvaticaDouyin) buat E2E offline.
import { haidarFetch } from "./nova-haidar.js";


// ── shortlink resolver: v.douyin.com/xxx → URL kanonik (biar fallback dapet video id) ──
export async function resolveDouyinShortlink(url) {
  if (!/v\.douyin\.com|iesdouyin\.com\/share/i.test(url)) return url;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    return res.url || url;
  } catch {
    return url;
  }
}

// ── HAIDAR: GET /api/v1/downloader/douyin?url= (key apikeys.json "haidar") ──
// shape live verified 2026-09-10: data { title, platform: "Douyin", video, audio }
async function haidarDouyinDefault(url) {
  url = await resolveDouyinShortlink(url);
  const data = await haidarFetch("/api/v1/downloader/douyin", { url });
  if (!data) return null;
  const video = data.video || data.url || "";
  const audio = data.audio || "";
  if (!video && !audio) return null;
  return {
    source: "Haidar",
    title: data.title || "Douyin Video",
    video, audio,
    images: Array.isArray(data.images) ? data.images : [],
  };
}

// ── SYLVATICA: GET /api/download/douyin?url= (key apikeys.json kuroneko/sylva) ──
// shape live verified 2026-09-10: { result: { duration, medias: [
//   { audioAvailable, extension, quality, size, url } ] } }
const SYLVA_BASE = "https://sylvatica.my.id/api";

async function getSylvaKey() {
  let key = process.env.SYLVA_API_KEY || process.env.KURONEKO_API_KEY || "";
  if (!key) {
    try {
      const { getApiKeys } = await import("../lib/config/env-loader.js");
      const keys = getApiKeys();
      key = keys?.kuroneko || keys?.sylva || "";
    } catch {}
  }
  return key;
}

async function sylvaticaDouyinDefault(url) {
  url = await resolveDouyinShortlink(url);
  const key = await getSylvaKey();
  if (!key) return null;
  const qs = new URLSearchParams({ url, apikey: key });
  try {
    const res = await fetch(`${SYLVA_BASE}/download/douyin?${qs}`, {
      signal: AbortSignal.timeout(60000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json?.status === false || !json?.result) return null;
    const r = json.result;
    const medias = Array.isArray(r.medias) ? r.medias : [];
    // pilih video terbaik: quality "hd" duluan, sisanya urutan size desc
    const videos = medias
      .filter((m) => m?.url && /mp4|video/i.test(String(m.extension || m.type || "mp4")))
      .sort((a, b) => {
        const aHd = /hd|no ?watermark/i.test(String(a.quality || "")) ? 1 : 0;
        const bHd = /hd|no ?watermark/i.test(String(b.quality || "")) ? 1 : 0;
        if (aHd !== bHd) return bHd - aHd;
        return (b.size || 0) - (a.size || 0);
      });
    const images = Array.isArray(r.images) ? r.images : [];
    if (!videos.length && !images.length) return null;
    return {
      source: "Sylvatica",
      title: r.title || r.desc || "Douyin Video",
      video: videos[0]?.url || "",
      audio: "",
      images,
      quality: videos[0]?.quality || "",
    };
  } catch {
    return null;
  }
}

// ── seam injectable buat E2E ──
let haidarDouyinFn = haidarDouyinDefault;
let sylvaticaDouyinFn = sylvaticaDouyinDefault;

export function setHaidarDouyin(fn) { haidarDouyinFn = fn || haidarDouyinDefault; }
export function setSylvaticaDouyin(fn) { sylvaticaDouyinFn = fn || sylvaticaDouyinDefault; }
export function resetDouyinDlDeps() {
  haidarDouyinFn = haidarDouyinDefault;
  sylvaticaDouyinFn = sylvaticaDouyinDefault;
}

export async function haidarDouyin(url) { return haidarDouyinFn(url); }
export async function sylvaticaDouyin(url) { return sylvaticaDouyinFn(url); }
