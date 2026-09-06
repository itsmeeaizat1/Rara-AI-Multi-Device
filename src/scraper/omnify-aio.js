// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
//  Omnify AIO — Universal Media & Profile Engine (ESM port)
//  Target  : https://aio.omnifylabs.sbs/
//  API     : https://api-aio.omnifylabs.sbs/
//  Desc    : Resolve link media dari 30+ platform (TikTok, IG,
//            YouTube, Spotify, SoundCloud, Pinterest, CapCut,
//            Facebook, Threads, X, dll) + stalker profil.
//  Ref     : file scraper OmnifyAIOUniversalMediaProfileEngine.js
//            (CommonJS) dari OmnifyLabs — di-port ke ESM + axios
//            instance sesuai standar repo.
//  Live test 2026-09-06: health ✅, YouTube ✅ (10 format),
//  Spotify ✅, SoundCloud ✅, Facebook ✅, CapCut ✅, IG ✅;
//  TikTok ❌ (extractor mati), Pinterest ❌, X ❌ → fallback
//  ke rantai internal di plugin alldownloader.
// ============================================================

import axios from "axios";

const API_BASE = "https://api-aio.omnifylabs.sbs";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  Origin: "https://aio.omnifylabs.sbs",
  Referer: "https://aio.omnifylabs.sbs/",
};

/**
 * Health check backend Omnify AIO
 * @returns {Promise<{status:string,service:string,version:string}>}
 */
export async function omnifyHealth() {
  const res = await axios.get(`${API_BASE}/health`, {
    headers: DEFAULT_HEADERS,
    timeout: 8000,
  });
  return res.data;
}

/**
 * Resolve link media dari 30+ platform.
 * Struktur balasan (sukses):
 * {
 *   status: "success",
 *   platform: "youtube",
 *   data: {
 *     type: "video" | "audio" | "image",
 *     title, description, duration, cover,
 *     author: { id, uniqueId, nickname, avatar, channelUrl? },
 *     videoUrl, hdVideoUrl, audioUrl,
 *     images: [url, ...],
 *     music: { title, author, playUrl } (platform audio),
 *     formats: [ { id, type, quality, label, ext, size, sizeBytes, hasWatermark, url } ],
 *     stats: { playCount, likeCount, durationFormatted, resolutions, audioQualities }
 *   }
 * }
 *
 * @param {string} url - Link media target
 * @returns {Promise<object>} hasil resolve sesuai struktur di atas
 */
export async function omnifyResolve(url) {
  if (!url || typeof url !== "string") {
    throw new Error("URL target harus berupa string tautan yang valid.");
  }
  const cleanUrl = url.trim();
  const res = await axios.post(
    `${API_BASE}/api/v1/media/resolve`,
    { url: cleanUrl },
    {
      headers: DEFAULT_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  const json = res.data;
  if (!json || json.status === "error" || res.status >= 400) {
    throw new Error(
      json?.message || `Gagal memproses URL (HTTP ${res.status}).`
    );
  }
  if (!json?.data || json.data.status === "error") {
    throw new Error(json?.data?.message || "Hasil resolve kosong.");
  }
  return json;
}

/**
 * Stalk profil user lintas platform.
 * Platform: tiktok | instagram | youtube | github | threads | x
 * @returns {Promise<object>} data profil
 */
export async function omnifyStalk(platform, username) {
  if (!platform || !username) {
    throw new Error("Platform dan username wajib diisi.");
  }
  const p = String(platform).toLowerCase().trim().replace(/^@/, "");
  const user = String(username).trim().replace(/^@/, "");

  const res = await axios.post(
    `${API_BASE}/api/v1/stalk/${encodeURIComponent(p)}`,
    { username: user },
    {
      headers: DEFAULT_HEADERS,
      timeout: 25000,
      validateStatus: () => true,
    }
  );

  const json = res.data;
  if (!json || json.status === "error" || res.status >= 400) {
    throw new Error(
      json?.message || `Gagal mengambil profil @${user} di ${p} (HTTP ${res.status}).`
    );
  }
  return json;
}
