// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktokv3.js — TikTok Downloader v3 (Sanka API + tikwm fallback)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";

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
  try {
    // Try IkyyXD tiktokv3 first
    const ikyyResult = await ikyyDl("tiktokv3", text);
    if (ikyyResult?.medias?.length) {
      const video = ikyyResult.medias.find(m => m.type === "video") || ikyyResult.medias[0];
      await sock.sendMedia(m.chat, video.url, ikyyResult.title || "TikTok", m, {
        type: "video", contextInfo: { forwardingScore: 0, isForwarded: false }
      });
      return;
    }

    const url = m.args.join(" ").trim();
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

      let _lines = [];
      _lines.push("✅ Berhasil!");
      if (r.title || r.desc) _lines.push(`Title: ${(r.title || r.desc).slice(0, 80)}`);
      if (r.author || r.username) _lines.push(`Author: @${r.author || r.username}`);
      _lines.push(`Size: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
      _lines.push(`Source: Sanka + tikwm`);

      await sock.sendMessage(m.chat, {
        video: buffer,
        caption: claraWrap("TikTok v3", _lines.join("\n")),
      }, { quoted: m });
    } else if (r.images && r.images.length > 0) {
      for (const img of r.images.slice(0, 5)) {
        await sock.sendMessage(m.chat, { image: { url: img } }, { quoted: m });
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
