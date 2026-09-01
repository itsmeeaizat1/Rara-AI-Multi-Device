// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ikyydl.js — Shared helper for IkyyXD all-in-one downloader
// Fallback chain: IkyyXD all-in-one → existing builtin scrapers

import axios from "axios";

const IKYY_BASE = "https://api.ikyyxd.my.id";

/**
 * Download via IkyyXD all-in-one endpoint
 * @param {string} url - URL to download
 * @returns {object|null} Normalized result or null if failed
 * 
 * Return format:
 * { source, title, author, thumbnail, duration, medias: [{url, quality, ext, type}] }
 */
export async function ikyyAio(url) {
  try {
    const res = await axios.get(`${IKYY_BASE}/download/all-in-one`, {
      params: { url },
      timeout: 60000,
    });

    const data = res.data;
    if (!data?.status || !data?.result) return null;

    const r = data.result;
    if (r.error || !r.medias?.length) return null;

    const medias = r.medias.map(m => ({
      url: m.url,
      quality: m.quality || m.label || m.ext || "unknown",
      ext: m.extension || m.ext || "mp4",
      type: m.type || (m.ext === "mp3" ? "audio" : "video"),
    }));

    return {
      source: r.source || "unknown",
      title: r.title || r.author || "Media",
      author: r.author || "",
      thumbnail: r.thumbnail || "",
      duration: r.duration || 0,
      medias,
    };
  } catch (e) {
    console.error("[ikyydl.js] ikyyAio error:", e.message);
    return null;
  }
}

/**
 * Download via IkyyXD specific endpoint (capcut, douyin, applemusic, etc.)
 * @param {string} endpoint - e.g. "capcut", "douyin", "applemusic"
 * @param {string} url - URL to download
 * @param {object} extraParams - extra query params (e.g. { apikey: "kyzz" })
 * @returns {object|null} Normalized result or null if failed
 */
export async function ikyyDl(endpoint, url, extraParams = {}) {
  try {
    const res = await axios.get(`${IKYY_BASE}/download/${endpoint}`, {
      params: { url, ...extraParams },
      timeout: 60000,
    });

    const data = res.data;
    if (!data?.status || !data?.result) return null;

    const r = data.result;
    // Normalize different response formats
    const medias = [];

    if (r.medias?.length) {
      // all-in-one style
      r.medias.forEach(m => medias.push({
        url: m.url,
        quality: m.quality || m.label || m.ext || "unknown",
        ext: m.extension || m.ext || "mp4",
        type: m.type || (m.ext === "mp3" ? "audio" : "video"),
      }));
    } else if (r.url || r.video || r.audio || r.originalVideoUrl) {
      // Single media style
      if (r.originalVideoUrl || r.video) {
        medias.push({
          url: r.originalVideoUrl || r.video,
          quality: "HD",
          ext: "mp4",
          type: "video",
        });
      }
      if (r.audio) {
        medias.push({
          url: r.audio,
          quality: "audio",
          ext: "mp3",
          type: "audio",
        });
      }
      if (r.url && !r.video && !r.originalVideoUrl) {
        medias.push({
          url: r.url,
          quality: r.quality || "default",
          ext: r.ext || "mp4",
          type: r.type || "video",
        });
      }
    }

    if (!medias.length) return null;

    return {
      source: r.source || r.platform || endpoint,
      title: r.title || r.author || "Media",
      author: r.author || "",
      thumbnail: r.thumbnail || r.image || "",
      duration: r.duration || 0,
      medias,
    };
  } catch (e) {
    console.error(`[ikyydl.js] ikyyDl(${endpoint}) error:`, e.message);
    return null;
  }
}

/**
 * Universal download with fallback chain
 * 1. Try IkyyXD specific endpoint (if provided)
 * 2. Try IkyyXD all-in-one
 * 3. Return null (caller handles builtin fallback)
 */
export async function ikyyDownload(url, specificEndpoint = null, extraParams = {}) {
  // Step 1: Try specific endpoint if provided
  if (specificEndpoint) {
    const specific = await ikyyDl(specificEndpoint, url, extraParams);
    if (specific) return specific;
    console.log(`[ikyydl.js] ${specificEndpoint} failed, trying all-in-one...`);
  }

  // Step 2: Try all-in-one
  const aio = await ikyyAio(url);
  if (aio) return aio;

  // Step 3: Return null — caller handles builtin fallback
  return null;
}
