// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// douyin-search.js — Douyin (抖音 / TikTok China) keyword search via Apify
// Kenapa Apify: Douyin gak ada API publik & anti-botnya ekstrem (signature
// a_bogus + cookie) — semua instance API gratis udah mati. Apify actors
// nanggepin signature/cookie di sisi mereka. Owner udah punya token Apify.
//
// Rantai (verified live 10 Sep 2026):
//   1. vulnv~douyin-search-scraper    — $0.005/hasil, fields lengkap
//      (aweme_url douyin.com ASLI, desc Mandarin, is_image_post + images slide)
//   2. zen-studio~douyin-search-scraper — $0.00499/hasil, cadangan
// CATATAN: Douyin agresif ngeblok — search kadang balikin 0 hasil beberapa
// menit (run gagal cuma kena biaya actor-start ~$0.0001, MURAH). Caller
// wajib handle kasus kosong + kasih pesan jelas ke user.

import { apifyRunSync } from "../lib/rara-apify.js";

const ACTORS = [
  { id: "vulnv~douyin-search-scraper", label: "Douyin Apify" },
  { id: "zen-studio~douyin-search-scraper", label: "Douyin Apify 2" },
];

// ── runner injectable (E2E offline) ──
let _runner = null;
export function setDouyinSearchRunner(fn) {
  _runner = typeof fn === "function" ? fn : null;
}

function buildInput(actorId, keyword, maxResults) {
  const input = { keywords: [String(keyword).slice(0, 60)] };
  if (actorId.startsWith("vulnv")) input.maxResults = maxResults;
  return input;
}

/**
 * Bentuk seragam item douyin (dipakai plugin .playdouyin):
 * { type, title, cover, link, author:{name,handle}, stats:{plays,likes,comments,shares},
 *   video:{noWatermark,hd,watermark}, images:[url], music:{url,title} }
 */
export function normalizeDouyinItem(raw) {
  const r = raw || {};
  const rawImages = Array.isArray(r.images)
    ? r.images.map((x) => (typeof x === "string" ? x : x?.url || "")).filter(Boolean)
    : [];
  const stats = r.statistics || r.stats || {};
  const author = r.author || {};
  const awemeId = r.aweme_id || r.id || "";
  return {
    type: r.is_image_post || r.media_type === "image" || rawImages.length ? "photo" : "video",
    id: awemeId,
    title: r.desc || r.caption || r.title || "",
    cover: r.video_cover_url || r.cover || r.originCover || "",
    link: r.aweme_url || (awemeId ? `https://www.douyin.com/video/${awemeId}` : (r.share_url || "")),
    author: {
      name: author.nickname || r.author_nickname || "",
      handle: author.unique_id || r.author_unique_id || "",
    },
    stats: {
      plays: Number(r.play_count ?? stats.play_count ?? stats.plays) || 0,
      likes: Number(r.digg_count ?? stats.digg_count ?? stats.likes) || 0,
      comments: Number(r.comment_count ?? stats.comment_count ?? stats.comments) || 0,
      shares: Number(r.share_count ?? stats.share_count ?? stats.shares) || 0,
    },
    video: {
      noWatermark: r.video_play_url || r.video_download_url || r.download || "",
      hd: "",
      watermark: r.video_wm_url || "",
    },
    images: rawImages,
    music: {
      url: r.music_play_url || r.music?.url || r.music || "",
      title: r.music_title || r.music?.title || "",
    },
  };
}

/**
 * Cari video/foto douyin via keyword. Rantai 2 actor, maxResults dibatasi
 * buat jaga biaya ($0.005/hasil → maks $0.025/run).
 * @returns {Promise<{ok: boolean, items?: Array, source?: string, error?: string}>}
 */
export async function douyinSearch(keyword, { maxResults = 5 } = {}) {
  const cap = Math.min(Math.max(Number(maxResults) || 5, 1), 10);
  let lastError = "Douyin lagi ngeblok pencarian";

  for (const actor of ACTORS) {
    try {
      const run = _runner || apifyRunSync;
      const raw = await run(actor.id, buildInput(actor.id, keyword, cap), { maxItems: cap });
      const list = Array.isArray(raw) ? raw : [];
      // buang stub preview/error actor (zen-studio kadang bales {limit_reached})
      const clean = list
        .filter((x) => x && !x.limit_reached && (x.aweme_id || x.video_play_url || x.is_image_post))
        .map(normalizeDouyinItem);
      if (clean.length) return { ok: true, items: clean, source: actor.label };
      if (list.length && list.every((x) => x?.limit_reached)) {
        lastError = "sumber douyin sibuk, coba lagi bentar";
      }
    } catch (e) {
      lastError = e?.response?.data?.error?.message || e.message;
      console.error(`[douyin-search] ${actor.id} error:`, String(lastError).slice(0, 120));
    }
  }

  return { ok: false, error: lastError };
}
