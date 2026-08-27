// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: PlayVideo (dipanggil dari tombol .play)
 * Pembuat Code: Aizat
 * Fitur: Download video YouTube dengan kualitas spesifik via ytdl.js + firefly fallback
 */

import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "playvideo",
  alias: ["playvideo"],
  category: "search",
  description: "Download video YouTube dengan kualitas spesifik",
  usage: ".playvideo<quality> <url> (dipanggil dari tombol .play)",
  example: ".playvideo720 https://youtube.com/watch?v=xxx",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
  isHidden: true,
};

async function getVideoDownload(url) {
  // Coba ytdl.js dulu (ytmp3.mobi MP4)
  try {
    const result = await ytdl(url, "mp4");
    if (result?.status && result?.dl) {
      return { download: result.dl, title: result.title };
    }
  } catch (err) {
    console.error("[PlayVideo] ytdl error:", err.message);
  }

  // Fallback ke firefly API
  try {
    const { data } = await axios.get(
      `https://firefly.maiku.my.id/api/ytdown?apikey=${config.APIkey?.firefly || ""}&url=${encodeURIComponent(url)}`,
      { timeout: 30000 },
    );

    if (data?.status && data?.data?.mediaItems) {
      const video =
        data.data.mediaItems.find((m) => m.type === "Video" && m.mediaQuality === "HD") ||
        data.data.mediaItems.find((m) => m.type === "Video" && m.mediaQuality === "SD") ||
        data.data.mediaItems.find((m) => m.type === "Video");

      if (video && video.mediaUrl) {
        let attempts = 0;
        while (attempts < 10) {
          const { data: fileData } = await axios.get(video.mediaUrl, { timeout: 10000 });
          if (fileData?.status === "completed" && fileData?.fileUrl) {
            return { download: fileData.fileUrl, title: "Video" };
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
          attempts++;
        }
      }
    }
  } catch (err) {
    console.error("[PlayVideo] Firefly API error:", err.message);
  }

  throw new Error("Gagal mendapatkan video download URL");
}

async function handler(m, { sock }) {
  // Parse: .playvideo720 <url> atau .playvideo <url>
  const rawText = m.text?.trim() || "";
  const match = rawText.match(/^(\d{3,4})?\s*(https?:\/\/\S+)/);
  if (!match) {
    return m.reply(
      claraWrap("playvideo", `Contoh: ${m.prefix}playvideo720 https://youtube.com/watch?v=xxx`),
    );
  }

  const url = match[2];

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply("URL harus YouTube");
  }

  m.react("🕒");

  try {
    const video = await getVideoDownload(url);

    await sock.sendMedia(m.chat, video.download, null, m, {
      type: "video",
      caption: claraWrap("play", [
        `│ Judul: *${video.title}*`,
        `│ Format: *MP4*`,
      ].join("\n")),
    });

    m.react("🐣");
  } catch (err) {
    console.error("[PlayVideo]", err);
    m.reply(
      claraWrap(
        "playvideo",
        "Gagal mengunduh video. Coba lagi nanti ya",
      ),
    );
  }
}

export { pluginConfig as config, handler };
