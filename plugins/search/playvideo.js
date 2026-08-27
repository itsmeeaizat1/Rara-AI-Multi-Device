// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: PlayVideo (dipanggil dari tombol .play)
 * Pembuat Code: Aizat
 * Fitur: Download video YouTube dengan kualitas spesifik
 * API: yt-dlp (primary, gratis no apikey) → ytdl.js (fallback) → firefly (last resort)
 */

import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { downloadVideo } from "../../src/scraper/nova-ytdlp.js";
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

/**
 * ytdl.js fallback (ytmp3.mobi MP4)
 */
async function getVideoYtdl(url) {
  try {
    const result = await ytdl(url, "mp4");
    if (result?.status && result?.dl) {
      return { download: result.dl, title: result.title };
    }
  } catch (err) {
    console.error("[PlayVideo] ytdl error:", err.message);
  }
  return null;
}

/**
 * Firefly API last resort
 */
async function getVideoFirefly(url) {
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
  return null;
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

  const quality = match[1] || "720";
  const url = match[2];

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply("URL harus YouTube");
  }

  m.react("🕒");

  try {
    let videoBuffer = null;
    let videoTitle = "Video";

    // 1. Try yt-dlp (free, no API key, supports quality selection)
    try {
      console.log(`[PlayVideo] 🎥 yt-dlp ${quality}p...`);
      const result = await downloadVideo(url, quality);
      if (result?.buffer?.length > 10000) {
        videoBuffer = result.buffer;
        videoTitle = result.title;
      }
    } catch (err) {
      console.error("[PlayVideo] yt-dlp failed:", err.message);
    }

    // 2. Fallback: ytdl.js (no quality control)
    if (!videoBuffer) {
      const ytdlResult = await getVideoYtdl(url);
      if (ytdlResult?.download) {
        // Download the URL to buffer
        try {
          const { data } = await axios.get(ytdlResult.download, {
            responseType: "arraybuffer",
            timeout: 120000,
          });
          videoBuffer = Buffer.from(data);
          videoTitle = ytdlResult.title;
        } catch (err) {
          console.error("[PlayVideo] ytdl buffer error:", err.message);
        }
      }
    }

    // 3. Last resort: firefly API
    if (!videoBuffer) {
      const fireflyResult = await getVideoFirefly(url);
      if (fireflyResult?.download) {
        try {
          const { data } = await axios.get(fireflyResult.download, {
            responseType: "arraybuffer",
            timeout: 120000,
          });
          videoBuffer = Buffer.from(data);
          videoTitle = fireflyResult.title;
        } catch (err) {
          console.error("[PlayVideo] firefly buffer error:", err.message);
        }
      }
    }

    if (!videoBuffer || videoBuffer.length < 10000) {
      throw new Error("Semua API video gagal");
    }

    await sock.sendMessage(
      m.chat,
      {
        video: videoBuffer,
        caption: claraWrap("play", [
          `│ Judul: *${videoTitle}*`,
          `│ Quality: *${quality}p*`,
          `│ Format: *MP4*`,
        ].join("\n")),
        mimetype: "video/mp4",
        fileName: `${videoTitle}.mp4`,
      },
      { quoted: m },
    );

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
