// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraWrap, raraLine, raraCaption, raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";

const pluginConfig = {
  name: "tiktokv2",
  alias: ["tiktokv2"],
  category: "download",
  description: "Download TikTok tanpa watermark via (V2)",
  usage: ".tiktokv2 <url>",
  example: ".tiktokv2 https://vt.tiktok.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}

const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

const RATE_LIMIT = 25, RATE_WINDOW = 60000;
let reqTs = [];

async function rlGet(url) {
  const now = Date.now();
  reqTs = reqTs.filter(t => now - t < RATE_WINDOW);
  if (reqTs.length >= RATE_LIMIT) {
    await new Promise(r => setTimeout(r, RATE_WINDOW - (now - reqTs[0]) + 500));
  }
  reqTs.push(Date.now());
  return axios.get(url, { timeout: 30000 });
}

async function handler(m, { sock }) {
  await m.react("🕒");
  const text = m.text?.trim();
  if (!text) {
    return m.reply(raraNoInput("TikTok V2", "Masukkan link video TikTok yang mau kamu download!", `${m.prefix}tiktokv2 https://vt.tiktok.com/xxx`));
  }
  try {
    // Try IkyyXD tiktokkv2 first
    const ikyyResult = await ikyyDl("tiktokkv2", text);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "TikTok V2",
        title: ikyyResult.title || "TikTok Video",
        author: ikyyResult.author || null,
        duration: ikyyResult.duration || null,
        description: ikyyResult.description ? String(ikyyResult.description).slice(0, 120) : null,
        format: "Video (No Watermark)", method: "IkyyXD",
      });
      await m.react("🐣");
      let ikyyCard = "";
      try {
        const info = await probeMedia(video.url);
        ikyyCard = mediaResultCard({
          header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
          title: ikyyResult.title || "TikTok Video",
          author: ikyyResult.author || null,
          type: "video",
          platform: "TikTok",
          duration: ikyyResult.duration || null,
          size: info.size,
          mime: info.mime,
        });
      } catch {}

      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption: ikyyCard || caption,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
      return;
    }

    const res = await rlGet(`${API_BASE}/download/tiktok?apikey=${API_KEY}&url=${encodeURIComponent(text)}`);
    const r = res.data?.result || res.data?.data;
    if (!r?.play) throw new Error("Gagal mengambil video TikTok");

    const caption = mediaCaption({
      platformIcon: "🎵", platformName: "TikTok V2",
      title: r.title || "TikTok Video",
      author: r.author?.nickname || null,
      authorHandle: r.author?.unique_id || null,
      duration: r.duration ? `${r.duration}s` : null,
      views: r.play_count ? parseInt(r.play_count).toLocaleString() : null,
      likes: r.digg_count ? parseInt(r.digg_count).toLocaleString() : null,
      description: r.desc ? String(r.desc).slice(0, 120) : null,
      format: "Video (No Watermark)", method: "Sanka",
    });

    await m.react("🐣");
    let card = "";
    try {
      const info = await probeMedia(r.play);
      card = mediaResultCard({
        header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
        title: r.title || "TikTok Video",
        author: r.author?.nickname || null,
        authorHandle: r.author?.unique_id || null,
        type: "video",
        platform: "TikTok",
        duration: r.duration || null,
        views: r.play_count || null,
        likes: r.digg_count || null,
        size: info.size,
        mime: info.mime,
      });
    } catch {}

    await sock.sendMessage(m.chat, {
        video: { url: r.play },
        caption: card || caption,
    }, { quoted: m });
      await m.reply(raraBerhasil("tiktokv2"));
  } catch (e) {
    console.error("[TIKTOKV2]", e.message);
    m.reply(raraError("TikTok V2", e.message || "Gagal mengambil video TikTok"));
  }
}
export { pluginConfig as config, handler };
