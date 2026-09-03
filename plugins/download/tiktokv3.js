// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktokv3.js — TikTok Downloader v3 (Sanka API + tikwm fallback)
import axios from "axios";
import { claraWrap, mediaCaption } from "../../src/lib/nova-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";

const pluginConfig = {
  name: "tiktokv3",
  alias: ["tiktokv3", "ttdl3", "tt3"],
  category: "download",
  description: "Download TikTok video v3 (Sanka + tikwm)",
  usage: ".tiktokv3 <url TikTok>",
  example: ".tiktokv3 https://www.tiktok.com/@user/video/123",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

const sankaConfig = getSankaConfig();

async function tiktokDownload(url) {
  // Method 1: Sanka API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/tiktok?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (data?.status && data?.result) {
      return data.result;
    }
  } catch (e) { console.error('[tiktokv3.js] Sanka:', e.message); }

  // Method 2: tikwm.com
  try {
    const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (data?.code === 0 && data?.data) {
      return {
        title: data.data.title,
        author: data.data.author?.nickname,
        username: data.data.author?.id,
        video: { noWatermark: data.data.play, watermark: data.data.wmplay },
        music: data.data.music,
      };
    }
  } catch (e) { console.error('[tiktokv3.js] tikwm:', e.message); }

  throw new Error("Gagal download TikTok");
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim() || m.text?.trim() || "";
  try {
    // Try IkyyXD tiktokv3 first
    const ikyyResult = await ikyyDl("tiktokv3", text);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "TikTok V3",
        title: ikyyResult.title || "TikTok Video",
        author: ikyyResult.author || null,
        duration: ikyyResult.duration || null,
        description: ikyyResult.description ? String(ikyyResult.description).slice(0, 120) : null,
        format: "Video (No Watermark)", method: "IkyyXD",
      });
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption,
        contextInfo: mediaPreviewCard({ title: ikyyResult.title || "TikTok Video", body: "TikTok V3", sourceUrl: text, thumbnailUrl: ikyyResult.thumbnail || "" }),
      }, { quoted: m });
      return;
    }

    const url = text;
    if (!url || !url.match(/tiktok\.com|vt\.tiktok/i)) {
      return m.reply(claraWrap("tiktokv3", `Kirim URL TikTok yang valid.\n\nContoh: ${m.prefix}tiktokv3 https://www.tiktok.com/@user/video/123`, "guide"));
    }

    await m.react("🕒");
    const r = await tiktokDownload(url);
    await m.react("🐣");

    const videoUrl = r.video?.noWatermark || r.video?.url || r.video?.watermark || r.video;
    if (videoUrl && !r.images) {
      const vidRes = await axios.get(videoUrl, {
        responseType: "arraybuffer", timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const buffer = Buffer.from(vidRes.data);

      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "TikTok V3",
        title: r.title || r.desc || "TikTok Video",
        author: r.author || r.username || null,
        duration: r.duration ? `${r.duration}s` : null,
        views: r.play_count ? parseInt(r.play_count).toLocaleString() : null,
        likes: r.digg_count ? parseInt(r.digg_count).toLocaleString() : null,
        format: `Video (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`,
        method: "Sanka + tikwm",
      });

      await sock.sendMessage(m.chat, {
        video: buffer,
        caption,
        contextInfo: mediaPreviewCard({ title: r.title || r.desc || "TikTok Video", body: "TikTok V3", sourceUrl: url, thumbnailUrl: r.cover || "" }),
      }, { quoted: m });
    } else if (r.images && r.images.length > 0) {
      for (const img of r.images.slice(0, 5)) {
        await sock.sendMessage(m.chat, { image: { url: img }, contextInfo: mediaPreviewCard({ title: r.title || r.desc || "TikTok Photo", body: "TikTok V3 • Image", sourceUrl: url, thumbnailUrl: r.cover || img }) }, { quoted: m });
      }
    }

    // Audio
    if (r.music) {
      const audRes = await axios.get(r.music, {
        responseType: "arraybuffer", timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      await sock.sendMessage(m.chat, {
        audio: Buffer.from(audRes.data),
        mimetype: "audio/mp4", ptt: false,
      }, { quoted: m });
    }
  } catch (err) {
    console.error("[tiktokv3]", err);
    await m.react("❌");
    m.reply(claraWrap("tiktokv3", "Gagal download. URL mungkin invalid atau private.", "error"));
  }
}

export { pluginConfig as config, handler };
