// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import config from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
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


async function getVideoDownloadUrl(url) {
  try {
    const { data } = await axios.get(
      `https://firefly.maiku.my.id/api/ytdown?apikey=${config.APIkey.firefly}&url=${encodeURIComponent(url)}`
    );

    if (data?.status && data?.data?.mediaItems) {
      const mediaItems = data.data.mediaItems;
      const video = mediaItems.find(m => m.type === "Video" && m.mediaQuality === "HD") ||
        mediaItems.find(m => m.type === "Video" && m.mediaQuality === "SD") ||
        mediaItems.find(m => m.type === "Video");

      if (video && video.mediaUrl) {
        let attempts = 0;
        while (attempts < 10) {
          const { data: fileData } = await axios.get(video.mediaUrl);
          if (fileData?.status === "completed" && fileData?.fileUrl) {
            return fileData.fileUrl;
          }
          await new Promise(resolve => setTimeout(resolve, 3000));
          attempts++;
        }
        throw new Error("Timeout processing video");
      }
    }
  } catch (e) { console.error('[ytmp4.js]:', e.message); }

  const fallback = await ytdl(url, "mp4");
  if (fallback?.status && fallback?.dl) {
    return fallback.dl;
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan video download URL");
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(
      novaGuide(
        "YTmp4",
        "Kirim URL video YouTube yang mau kamu download!",
        `${m.prefix}ytmp4 https://youtube.com/watch?v=xxx`
      )
    );
  }
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return await m.reply(
      novaGuide(
        "YTmp4",
        "Link-nya harus URL YouTube yang valid ya!",
        `${m.prefix}ytmp4 https://youtu.be/xxx`
      )
    );
  }
  try {
    const downloadUrl = await getVideoDownloadUrl(url);

    // Ambil metadata YouTube via oEmbed
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
      method: "Firefly",
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
