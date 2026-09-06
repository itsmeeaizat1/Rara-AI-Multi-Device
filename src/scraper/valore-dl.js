// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
//  Valore DL — Multi Platform Downloader (ESM scraper)
//  Target  : https://dl.valore.web.id/
//  API     : POST https://dl.valore.web.id/api/download
//            body: { url } — header X-Session-Id (random per call)
//  Health  : GET /api/health
//  Desc    : Downloader 50+ platform (klaim situs), tanpa watermark,
//            kualitas sampai 1080p + audio MP3.
//  Live test 2026-09-06: TikTok ✅ (multi quality + MP3, download
//  13MB verified), YouTube ✅ (0.4s, URL googlevideo asli);
//  X ❌, Pinterest ❌, Facebook ❌ (private/unavailable).
//  → Dipakai sebagai lapis resolve kedua di .alldownloader,
//    khususnya buat TikTok yang extractornya mati di Omnify AIO.
// ============================================================

import axios from "axios";
import crypto from "crypto";

const API_BASE = "https://dl.valore.web.id";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  Origin: "https://dl.valore.web.id",
  Referer: "https://dl.valore.web.id/",
};

function sessionId() {
  return crypto.randomUUID();
}

/**
 * Health check backend Valore DL
 */
export async function valoreHealth() {
  const res = await axios.get(`${API_BASE}/api/health`, {
    headers: DEFAULT_HEADERS,
    timeout: 8000,
  });
  return res.data;
}

/**
 * Resolve link media via Valore DL.
 * Struktur balasan (sukses):
 * {
 *   success: true,
 *   data: {
 *     platform: "tiktok" | "youtube" | ...,
 *     title, creator, thumbnail, duration,
 *     medias: [ { url, quality, format, type, size } ]
 *   },
 *   processingTime
 * }
 *
 * @param {string} url - Link media target
 * @returns {Promise<{platform:string, title:string, thumbnail:string, duration:(number|null), medias:Array}>}
 */
export async function valoreResolve(url) {
  if (!url || typeof url !== "string") {
    throw new Error("URL target harus berupa string tautan yang valid.");
  }

  const res = await axios.post(
    `${API_BASE}/api/download`,
    { url: url.trim() },
    {
      headers: { ...DEFAULT_HEADERS, "X-Session-Id": sessionId() },
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  const json = res.data;
  if (!json || !json.success || res.status >= 400) {
    throw new Error(json?.error || `Gagal memproses URL (HTTP ${res.status}).`);
  }
  const data = json.data || {};
  const medias = (Array.isArray(data.medias) ? data.medias : Array.isArray(data.formats) ? data.formats : [])
    .map((m) => ({
      url: m.url || m.downloadUrl || m.download_url || m.dl || m.data?.url || "",
      quality: m.quality || m.qualityLabel || m.label || m.resolution || "Standard",
      format: m.format || m.container || m.ext || "media",
      type: m.type || "video",
      size: m.size || null,
    }))
    .filter((m) => m.url);

  if (!medias.length) {
    throw new Error("Hasil resolve Valore kosong (tidak ada media).");
  }

  return {
    platform: data.platform || "",
    title: data.title || "",
    creator: data.creator || "",
    thumbnail: data.thumbnail || data.thumbnailUrl || "",
    duration: data.duration || null,
    medias,
  };
}
