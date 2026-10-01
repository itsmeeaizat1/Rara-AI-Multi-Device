// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ikyydl.js — Shared helper for IkyyXD downloader endpoints
// Fallback chain: IkyyXD specific → IkyyXD all-in-one → null (caller handles builtin)

import axios from "axios";

const IKYY_BASE = "https://api.ikyyxd.my.id";

/**
 * Download via IkyyXD all-in-one endpoint
 * @param {string} url - URL to download
 * @returns {object|null} Normalized result or null if failed
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
 * Download via IkyyXD specific endpoint
 * @param {string} endpoint - e.g. "capcut", "douyin", "facebook", "instagram"
 * @param {string} url - URL to download
 * @param {object} options - { extraParams: {}, urlParam: "url" (default) | "query" | "link" }
 * @returns {object|null} Normalized result or null if failed
 */
export async function ikyyDl(endpoint, url, options = {}) {
  const { extraParams = {}, urlParam = "url" } = options;
  try {
    const params = { [urlParam]: url, ...extraParams };
    const res = await axios.get(`${IKYY_BASE}/download/${endpoint}`, {
      params,
      timeout: 60000,
    });

    const data = res.data;
    if (!data?.status || !data?.result) return null;

    const r = data.result;
    const medias = [];

    if (Array.isArray(r.medias) && r.medias.length) {
      r.medias.forEach(m => medias.push({
        url: m.url,
        quality: m.quality || m.label || m.ext || "unknown",
        ext: m.extension || m.ext || "mp4",
        type: m.type || (m.ext === "mp3" ? "audio" : "video"),
      }));
    } else if (r.url || r.video || r.audio || r.originalVideoUrl || r.download_url) {
      if (r.originalVideoUrl || r.video || r.download_url) {
        medias.push({
          url: r.originalVideoUrl || r.video || r.download_url,
          quality: r.quality || "HD",
          ext: r.ext || "mp4",
          type: "video",
        });
      }
      if (r.audio) {
        medias.push({ url: r.audio, quality: "audio", ext: "mp3", type: "audio" });
      }
      if (r.url && !r.video && !r.originalVideoUrl && !r.download_url) {
        medias.push({
          url: r.url,
          quality: r.quality || "default",
          ext: r.ext || "mp4",
          type: r.type || "video",
        });
      }
    } else if (Array.isArray(r) && r.length) {
      // Some endpoints return array directly
      r.forEach(item => {
        if (item.url || item.video || item.download_url) {
          medias.push({
            url: item.url || item.video || item.download_url,
            quality: item.quality || "default",
            ext: item.ext || "mp4",
            type: item.type || "video",
          });
        }
      });
    }

    if (!medias.length) return null;

    return {
      source: r.source || r.platform || endpoint,
      title: r.title || r.author || r.name || "Media",
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
export async function ikyyDownload(url, specificEndpoint = null, options = {}) {
  if (specificEndpoint) {
    const specific = await ikyyDl(specificEndpoint, url, options);
    if (specific) return specific;
    console.log(`[ikyydl.js] ${specificEndpoint} failed, trying all-in-one...`);
  }

  const aio = await ikyyAio(url);
  if (aio) return aio;

  return null;
}
