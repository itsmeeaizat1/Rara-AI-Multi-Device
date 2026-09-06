// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
//  SnapTik Douyin Downloader (ESM scraper)
//  Target  : https://snaptik.fi/api/tiktok
//  Cara    : POST { url } dengan header Origin/Referer snaptik.fi.
//            Status sukses = "tunnel". Support video + STORY Douyin.
//  Source  : script CommonJS dari owner (2026-09-06, RestApis
//            api.ikyyxd.my.id — "Support Download Story Juga"),
//            di-port ke ESM.
//  Live test 2026-09-06: v.douyin.com shortlink ✅ — title, cover,
//            audio mp3 douyinstatic, download_link no_watermark 2.2MB
//            video/mp4 ter-verify ke-download, statistics lengkap.
// ============================================================

import axios from "axios";

const BASE_URL = "https://snaptik.fi";

const HEADERS = {
  "Content-Type": "application/json",
  Origin: BASE_URL,
  Referer: `${BASE_URL}/id/douyin-story-downloader`,
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  "Sec-Ch-Ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?1",
  "Sec-Ch-Ua-Platform": '"Android"',
};

/**
 * Download video/audio Douyin (termasuk STORY) via snaptik.fi.
 * @param {string} url - Link video/story Douyin (v.douyin.com / douyin.com)
 * @returns {Promise<{status:boolean, title:string, description:string, artist:string,
 *                    durationSec:number|null, cover:string, audio:string|null,
 *                    video:string|null, mp3:string|null, statistics:object,
 *                    source:string, message?:string}>}
 */
export async function snaptikDouyin(url) {
  if (!url || typeof url !== "string") {
    return { status: false, message: "URL Douyin harus berupa string tautan yang valid." };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/api/tiktok`,
      { url: url.trim() },
      { headers: HEADERS, timeout: 30000, validateStatus: () => true }
    );

    const data = response.data;

    if (!data || data.status !== "tunnel") {
      return {
        status: false,
        message: data?.message || `Gagal memproses video. Status: ${data?.status || "unknown"}`,
      };
    }

    const dl = data.download_link || {};
    return {
      status: true,
      title: data.title || "No Title",
      description: data.description || "",
      artist: data.artist || "Unknown",
      durationSec: data.duration ? Math.floor(data.duration / 1000) : null,
      cover: data.cover || null,
      audio: data.audio || null,
      video: dl.no_watermark || dl.watermark || null,
      mp3: dl.mp3 || data.audio || null,
      statistics: data.statistics || {},
      source: data.extract_source || "web",
    };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    console.error("[snaptik-douyin] error:", message);
    return { status: false, message };
  }
}
