// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// play.js — Search YouTube, download & send audio
// Primary: IkyyXD /download/ytmp3 → Sanka AIO → ytdl fallback
import yts from "yt-search";
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";

const pluginConfig = {
  name: "play",
  alias: ["play"],
  category: "search",
  description: "Putar musik YouTube",
  usage: ".play <query>",
  example: ".play komang",
  cooldown: 15, energi: 2, isEnabled: true,
};

const sankaConfig = getSankaConfig();
const IKYY = "https://api.ikyyxd.my.id";

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

async function getAudioDownload(url) {
  // Method 1: IkyyXD ytmp3
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp3`, { params: { url }, timeout: 60000 });
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.audio?.url || r.download_url || r.url;
      if (dl) return { download: dl, title: r.title, method: "IkyyXD", thumbnail: r.thumbnail };
    }
  } catch (e) { console.error("[play.js] IkyyXD:", e.message); }

  // Method 2: Sanka AIO
  try {
    const { data } = await axios.get(
      `${sankaConfig.baseUrl}/download/aio?apikey=${sankaConfig.apikey}&url=${encodeURIComponent(url)}`,
      { timeout: 30000 }
    );
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.mp3 || r.audio || r.dl || r.url || (r.medias?.find(m => m.type?.includes("audio"))?.url);
      if (dl) return { download: dl, title: r.title || r.meta?.title, method: "Sanka" };
    }
  } catch (e) { console.error("[play.js] Sanka:", e.message); }

  // Method 3: ytdl-core
  const fallback = await ytdl(url, "mp3");
  if (fallback?.status && fallback?.dl) {
    return { download: fallback.dl, title: fallback.title, method: "ytdl", isFallback: true };
  }
  throw new Error("Gagal mendapatkan audio");
}

async function handler(m, { sock, text }) {
  const query = (text || m.text || "").trim();
  if (!query) {
    return m.reply(novaGuide("Play", "Kirim judul lagu yang mau diputar!", `${m.prefix}play komang`));
  }

  try {
    await m.react("🕒");

    const search = await yts(query);
    if (!search.videos?.length) {
      await m.react("❌");
      return m.reply(novaError("Play", "Lagu tidak ditemukan, coba kata kunci lain ya!"));
    }

    const video = search.videos[0];
    const url = video.url;

    const result = await getAudioDownload(url);

    const caption = mediaCaption({
      platformIcon: "▶️",
      platformName: "YouTube",
      title: result.title || video.title,
      author: video.author.name || null,
      format: "🎵 MP3",
      method: result.method,
    });

    await m.react("🐣");

    if (result.isFallback) {
      const mp3Buffer = await fallbackToMp3Buffer(result.download);
      await sock.sendMessage(m.chat, {
        audio: mp3Buffer, mimetype: "audio/mpeg", ptt: false,
        fileName: `${result.title || "audio"}.mp3`,
        contextInfo: { externalAdReply: { title: result.title || video.title, body: video.author.name || "Nova AI", thumbnailUrl: video.thumbnail, sourceUrl: url } },
      }, { quoted: m });
    } else {
      await sock.sendMedia(m.chat, result.download, null, m, {
        type: "audio", mimetype: "audio/mpeg", ptt: false,
        fileName: result.title || "audio.mp3",
      });
    }
    await m.reply(caption);
  } catch (err) {
    console.error("[Play]", err.message || err);
    await m.react("❌");
    return m.reply(novaError("Play", err.message || "Gagal memutar lagu, coba lagi nanti ya!"));
  }
}

export { pluginConfig as config, handler };
