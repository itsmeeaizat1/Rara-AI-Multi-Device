// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ytmp3.js — Download audio YouTube
// Primary: IkyyXD /download/ytmp3 → Sanka AIO → ytdl fallback
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { novaError, novaGuide, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { getSankaConfig } from "../../src/lib/config/env-loader.js";

const pluginConfig = {
  name: "ytmp3",
  alias: ["ytmp3"],
  category: "download",
  description: "Download audio YouTube",
  usage: ".ytmp3 <url>",
  example: ".ytmp3 https://youtube.com/watch?v=xxx",
  cooldown: 20, energi: 2, isEnabled: true,
};

const sankaConfig = getSankaConfig();
const IKYY = "https://api.ikyyxd.my.id";

async function getAudioDownload(url) {
  // Method 1: IkyyXD ytmp3
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp3`, {
      params: { url },
      timeout: 60000,
    });
    if (data?.status && data?.result) {
      const r = data.result;
      const dl = r.audio?.url || r.download_url || r.url;
      if (dl) return { download: dl, title: r.title || "YouTube Audio", method: "IkyyXD", thumbnail: r.thumbnail };
    }
  } catch (e) { console.error("[ytmp3.js] IkyyXD:", e.message); }

  // Method 2: Sanka AIO API
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
  } catch (e) { console.error("[ytmp3.js] Sanka:", e.message); }

  // Method 3: ytdl-core (fallback lokal)
  const fallback = await ytdl(url, "mp3");
  if (fallback?.status && fallback?.dl) {
    return { download: fallback.dl, title: fallback.title, method: "ytdl", isFallback: true };
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan audio download URL");
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("YTmp3", "Kirim URL YouTube yang ingin kamu konversi ke audio MP3!", `${m.prefix}ytmp3 https://youtube.com/watch?v=xxx`));
  }
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply(novaGuide("YTmp3", "Link-nya harus URL YouTube yang valid ya!", `${m.prefix}ytmp3 https://youtu.be/xxx`));
  }

  try {
    await m.react("🕒");
    const result = await getAudioDownload(url);

    let ytMeta = {};
    try {
      const { data: oe } = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
      ytMeta = { author: oe?.author_name, thumbnail: result.thumbnail || oe?.thumbnail_url };
    } catch {}

    const caption = mediaCaption({
      platformIcon: "▶️",
      platformName: "YouTube",
      title: result.title || "YouTube Audio",
      author: ytMeta.author || null,
      duration: result.duration || null,
      views: result.views || null,
      description: result.description ? String(result.description).slice(0, 120) : null,
      format: "🎵 MP3",
      method: result.method,
    });

    await m.react("🐣");

    if (result.isFallback) {
      const mp3Buffer = await fallbackToMp3Buffer(result.download);
      await sock.sendMessage(m.chat, {
        audio: mp3Buffer, mimetype: "audio/mpeg", ptt: false,
        fileName: `${result.title || "audio"}.mp3`,
        contextInfo: { externalAdReply: { title: result.title || "YouTube MP3", body: "Nova AI Downloader", thumbnailUrl: ytMeta.thumbnail, sourceUrl: url } },
      }, { quoted: m });
    } else {
      await sock.sendMedia(m.chat, result.download, null, m, {
        type: "audio", mimetype: "audio/mpeg", ptt: false,
        fileName: result.title || "audio.mp3",
      });
      await m.reply(novaBerhasil("ytmp3"));
    }
    await m.reply(caption);
  } catch (err) {
    console.error("[YTMP3]", err);
    await m.react("❌");
    m.reply(novaGagal("YTmp3"));
  }
}

export { pluginConfig as config, handler };
