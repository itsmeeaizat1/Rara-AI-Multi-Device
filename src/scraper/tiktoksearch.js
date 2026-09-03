// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktoksearch.js — TikTok keyword search via tikwm hashtag pipeline
// Sumber lama (api.azbry.com) mati 403 (2026-09) — ganti scrape langsung tikwm:
//   1) GET /api/challenge/search?keywords=<q>   → challenge_list[0].id (hashtag id)
//   2) GET /api/challenge/posts?challenge_id=…  → videos[] + link play no-watermark
// Catatan: endpoint /api/feed/search tikwm kena Cloudflare, tapi challenge/* terbuka.

import axios from "axios";

const TIKWM_BASE = "https://www.tikwm.com/api/";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: "https://www.tikwm.com/",
  Origin: "https://www.tikwm.com",
};

function normalizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  const matches = url.match(/https?:\/\//g) || [];
  if (matches.length <= 1) return url;
  return url.slice(url.lastIndexOf("http"));
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeItem(item) {
  const author = item?.author || {};
  const uniqueId = author.unique_id || "";
  const videoId = item?.video_id || "";
  const canonical = uniqueId && videoId
    ? `https://www.tiktok.com/@${uniqueId}/video/${videoId}`
    : "";
  const rawImages = item?.image_post?.images || item?.images || [];
  return {
    // Canonical share link (dipakai di caption/link user)
    link: canonical,
    // Direct mp4 no-watermark (dipakai buat kirim media)
    download: normalizeUrl(item?.play) || "",
    title: item?.title || "",
    cover: normalizeUrl(item?.origin_cover || item?.cover),
    originCover: normalizeUrl(item?.origin_cover),
    watermarkLink: normalizeUrl(item?.wmplay),
    music: normalizeUrl(item?.music),
    musicInfo: {
      title: item?.music_info?.title || "",
      author: item?.music_info?.author || "",
    },
    // Foto post (slideshow) — kosong kalau post video
    images: rawImages.map(normalizeUrl).filter(Boolean),
    duration: normalizeNumber(item?.duration),
    size: normalizeNumber(item?.size),
    author: {
      uniqueId,
      nickname: author.nickname || "",
      avatar: normalizeUrl(author.avatar),
    },
    stats: {
      plays: normalizeNumber(item?.play_count),
      likes: normalizeNumber(item?.digg_count),
      comments: normalizeNumber(item?.comment_count),
      shares: normalizeNumber(item?.share_count),
    },
  };
}

/**
 * Cari video TikTok berdasarkan keyword (jalur hashtag tikwm).
 * @param {string} query - kata kunci, mis. "viral", "cewek cantik"
 * @param {object} [opts]
 * @param {number} [opts.count=10] - jumlah video maksimal
 * @returns {Promise<Array>} list video ternormalisasi
 */
async function tiktokSearchVideo(query, opts = {}) {
  const count = Math.min(Math.max(Number(opts.count) || 10, 1), 30);

  // Step 1: cari hashtag id dari keyword
  const search = (
    await axios.get(`${TIKWM_BASE}challenge/search`, {
      params: { keywords: query },
      headers: HEADERS,
      timeout: 30000,
    })
  ).data;

  if (search?.code !== 0) {
    throw new Error(search?.msg || "TikTok search gagal");
  }

  const challenge = (search?.data?.challenge_list || [])[0];
  if (!challenge?.id) {
    throw new Error("Hashtag tidak ditemukan");
  }

  // Step 2: ambil video dari hashtag
  const posts = (
    await axios.get(`${TIKWM_BASE}challenge/posts`, {
      params: {
        challenge_id: challenge.id,
        count,
        cursor: 0,
        web: 1,
        hd: 1,
      },
      headers: HEADERS,
      timeout: 30000,
    })
  ).data;

  if (posts?.code !== 0) {
    throw new Error(posts?.msg || "TikTok search gagal");
  }

  const videos = (posts?.data?.videos || []).map(normalizeItem);
  return videos.filter((v) => v.download || v.link || v.images.length);
}

export { tiktokSearchVideo };
