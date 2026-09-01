// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ytmp4.js — Download video YouTube (Sanka AIO + ytdl fallback)
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";

const pluginConfig = {
  name: "ytmp4",
  alias: ["ytmp4"],
  category: "download",
  description: "Download video YouTube",
  usage: ".ytmp4 <url>",
  example: ".ytmp4 https://youtube.com/watch?v=xxx",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

const sankaConfig = getSankaConfig();

async function getVideoDownloadUrl(url) {
  // Method 1: Sanka AIO API
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/aio?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 30000 }
    );
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.mp4 || r.video || r.dl || r.url || (r.medias?.find(m => m.type?.includes("video"))?.url);
      if (dl) return dl;
    }
  } catch (e) { console.error('[ytmp4.js] Sanka:', e.message); }

  // Method 2: ytdl-core (fallback lokal)
  const fallback = await ytdl(url, "mp4");
  if (fallback?.status && fallback?.dl) {
    return fallback.dl;
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan video download URL");
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("YTmp4", "Kirim URL video YouTube yang mau kamu download!", `${m.prefix}ytmp4 https://youtube.com/watch?v=xxx`));
  }
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply(novaGuide("YTmp4", "Link-nya harus URL YouTube yang valid ya!", `${m.prefix}ytmp4 https://youtu.be/xxx`));
  }
  try {
    const downloadUrl = await getVideoDownloadUrl(url);

    let ytMeta = {};
    try {
      const { data: oe } = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
      ytMeta = { author: oe?.author_name, thumbnail: oe?.thumbnail_url, title: oe?.title };
    } catch {}

    const caption = mediaCaption({
      platformIcon: "▶️",
      platformName: "YouTube",
      title: ytMeta.title || "YouTube Video",
      author: ytMeta.author || null,
      format: "📹 Video HD",
      method: "Sanka",
    });

    await sock.sendMessage(m.chat, {
      video: { url: downloadUrl },
      caption,
      contextInfo: { externalAdReply: { title: ytMeta.title || "YouTube Video", body: "Nova AI Downloader", thumbnailUrl: ytMeta.thumbnail, sourceUrl: url } },
    }, { quoted: m });
  } catch (err) {
    console.error("[YTMP4]", err);
    m.reply(novaError("YTmp4", "Gagal mengunduh video YouTube — coba lagi nanti atau ganti link ya!"));
  }
}

export { pluginConfig as config, handler };
