// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { claraWrap, claraLine, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "ytmp3",
  alias: ["ytmp3"],
  category: "download",
  description: "Download audio YouTube",
  usage: ".ytmp3 <url>",
  example: ".ytmp3 https://youtube.com/watch?v=xxx",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

async function getAudioDownload(url) {
  try {
    const { data } = await axios.get(
      `https://api.nexray.eu.cc/downloader/v1/ytmp3?url=${encodeURIComponent(url)}`,
    );
    const download = data?.result?.url;
    const title = data?.result?.title;
    if (download) {
      return { download, title };
    }
  } catch (e) { console.error('[ytmp3.js]:', e.message); }

  const fallback = await ytdl(url, "mp3");
  if (fallback?.status && fallback?.dl) {
    return { download: fallback.dl, title: fallback.title, isFallback: true };
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan audio download URL");
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url)
    return m.reply( claraWrap("Ytmp3", `Contoh: ${m.prefix}ytmp4 https://youtube.com/watch?v=xxx`), { commandName: "ytmp3" });
  if (!url.includes("youtube.com") && !url.includes("youtu.be"))
    { const __navText = "❌ URL harus YouTube"; return await m.reply(__navText); };

  m.react("🕒");

  try {
    const result = await getAudioDownload(url);

    // Ambil metadata YouTube via oEmbed
    let ytMeta = {};
    try {
      const { data: oe } = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 8000 });
      ytMeta = { author: oe?.author_name, thumbnail: oe?.thumbnail_url };
    } catch {}

    const caption = mediaCaption({
      platformIcon: "▶️",
      platformName: "YouTube",
      title: result.title || "YouTube Audio",
      author: ytMeta.author || null,
      format: "🎵 MP3",
      method: result.isFallback ? "ytdl" : "Nexray",
    });

    if (result.isFallback) {
      const mp3Buffer = await fallbackToMp3Buffer(result.download);
      await sock.sendMessage(
        m.chat,
        {
          audio: mp3Buffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${result.title || "audio"}.mp3`,
          contextInfo: { externalAdReply: { title: result.title || "YouTube MP3", body: "Nova AI Downloader", thumbnailUrl: ytMeta.thumbnail, sourceUrl: url } },
        },
        { quoted: m },
      );
    } else {
      await sock.sendMedia(m.chat, result.download, null, m, {
        type: "audio",
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: result.title || "audio.mp3",
      });
    }
    // Kirim caption setelah audio
    await m.reply(caption);
    m.react("🐣");
  } catch (err) {
    console.error("[YTMP4]", err);
    m.reply(claraWrap("ytmp3", "Gagal mengunduh video."));
  }
}

export { pluginConfig as config, handler };
