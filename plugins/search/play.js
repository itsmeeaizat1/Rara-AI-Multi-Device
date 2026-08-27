// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Play
 * Pembuat Code: Aizat
 * Saluran: https://whatsapp.com/channel/0029Vb7g5Qt90x2yn7bOlM2U
 * Fitur: Search YouTube → pilih Audio (128/192/256/320 kbps) atau Video (360/480/720)
 * API: Cuki API (audio kbps) + ytdl.js (video fallback)
 */

import yts from "yt-search";
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { generateWAMessageFromContent } from "nova";

const pluginConfig = {
  name: "play",
  alias: ["play"],
  category: "search",
  description: "Putar musik/video YouTube dengan pilihan kualitas (Cuki API + ytdl)",
  usage: ".play <query>",
  example: ".play komang",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

const CUKI_APIKEY = config.APIkey?.cuki || "cuki-x";
const AUDIO_QUALITIES = [
  { value: "128", label: "128 kbps (Standar)" },
  { value: "192", label: "192 kbps (Baik)" },
  { value: "256", label: "256 kbps (Tinggi)" },
  { value: "320", label: "320 kbps (Terbaik)" },
];
const VIDEO_QUALITIES = [
  { value: "360", label: "360p (Hemat)" },
  { value: "480", label: "480p (Standar)" },
  { value: "720", label: "720p HD" },
];

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

/**
 * Download audio via Cuki API (support pilih kbps) → fallback ytdl.js
 */
async function getAudioDownload(url, quality = "128") {
  try {
    const apiUrl = `https://api.cuki.biz.id/api/downloader/ytmp3?apikey=${CUKI_APIKEY}&url=${encodeURIComponent(url)}&quality=${quality}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });

    if (data?.success && data?.data?.audio?.download?.downloadUrl) {
      return {
        download: data.data.audio.download.downloadUrl,
        title: data.data.metadata?.title || "Audio",
        quality: data.data.audio?.quality || quality,
        isCuki: true,
      };
    }
  } catch (err) {
    console.error("[Play] Cuki API error:", err.message);
  }

  // Fallback ke ytdl.js (ytmp3.mobi, default 128kbps)
  const fallback = await ytdl(url, "mp3");
  if (fallback?.status && fallback?.dl) {
    return {
      download: fallback.dl,
      title: fallback.title,
      quality: "128",
      isCuki: false,
    };
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan audio download URL");
}

/**
 * Download video via ytdl.js (ytmp3.mobi MP4) → fallback firefly
 */
async function getVideoDownload(url) {
  // Coba ytdl.js dulu
  try {
    const result = await ytdl(url, "mp4");
    if (result?.status && result?.dl) {
      return { download: result.dl, title: result.title };
    }
  } catch (err) {
    console.error("[Play] ytdl video error:", err.message);
  }

  // Fallback ke firefly API
  try {
    const { data } = await axios.get(
      `https://firefly.maiku.my.id/api/ytdown?apikey=${config.APIkey.firefly}&url=${encodeURIComponent(url)}`,
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
    console.error("[Play] Firefly API error:", err.message);
  }

  throw new Error("Gagal mendapatkan video download URL");
}

/**
 * Kirim audio ke chat
 */
async function sendAudio(sock, m, audio, video) {
  if (audio.isCuki) {
    // Cuki URL → download buffer → kirim
    try {
      const { data } = await axios.get(audio.download, {
        responseType: "arraybuffer",
        timeout: 60000,
      });
      const mp3Buffer = Buffer.from(data);
      if (!mp3Buffer.length) throw new Error("Audio kosong");

      await sock.sendMessage(
        m.chat,
        {
          audio: mp3Buffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${audio.title || video.title || "audio"}.mp3`,
        },
        { quoted: m },
      );
      return;
    } catch (err) {
      console.error("[Play] Cuki buffer error, trying fallback:", err.message);
    }
  }

  // Fallback path (ytdl.js) → convert via fallbackToMp3Buffer
  const mp3Buffer = await fallbackToMp3Buffer(audio.download);
  await sock.sendMessage(
    m.chat,
    {
      audio: mp3Buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${audio.title || video.title || "audio"}.mp3`,
    },
    { quoted: m },
  );
}

/**
 * Kirim video ke chat
 */
async function sendVideo(sock, m, videoInfo, videoMeta) {
  await sock.sendMedia(m.chat, videoInfo.download, null, m, {
    type: "video",
    caption: claraWrap("play", [
      `│ Judul: *${videoInfo.title || videoMeta.title}*`,
      `│ Channel: *${videoMeta.author.name}*`,
      `│ Durasi: *${videoMeta.duration.timestamp}*`,
    ].join("\n")),
  });
}

/**
 * Build interactive buttons message dengan pilihan Audio/Video
 */
async function sendChoiceButtons(sock, m, video) {
  const info = `🎵 *ɴᴏᴡ ᴘʟᴀʏɪɴɢ*

📌 *ᴊᴜᴅᴜʟ:* ${video.title}
👤 *ᴄʜᴀɴɴᴇʟ:* ${video.author.name}
⏱️ *ᴅᴜʀᴀsɪ:* ${video.duration.timestamp}
👀 *ᴠɪᴇᴡs:* ${formatViews(video.views)}
📅 *ᴜᴘʟᴏᴀᴅ:* ${video.ago}
🔗 ${video.url}

Pilih format & kualitas di bawah:`;

  const content = {
    buttonsMessage: {
      buttons: [
        {
          buttonId: `.ytmp3 ${video.url}`,
          buttonText: { displayText: "🎵 Audio MP3" },
          type: 1,
        },
        {
          buttonId: `.ytmp4 ${video.url}`,
          buttonText: { displayText: "🎥 Video MP4" },
          type: 1,
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "⬇️ Audio 320kbps",
            id: `${m.prefix}playaudio320 ${video.url}`,
          }),
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "⬇️ Audio 128kbps",
            id: `${m.prefix}playaudio128 ${video.url}`,
          }),
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "⬇️ Video 720p",
            id: `${m.prefix}playvideo720 ${video.url}`,
          }),
        },
      ],
      locationMessage: {
        jpegThumbnail: video.thumbnail || undefined,
        name: video.title.substring(0, 50),
        address: `📺 ${video.author.name} | ⏱️ ${video.duration.timestamp}`,
      },
      contentText: info,
      footerText: "Nova AI Whatsapp Bot",
      headerType: 6,
    },
  };

  const msg = generateWAMessageFromContent(m.chat, content, { quoted: m });
  await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
}

async function handler(m, { sock, text }) {
  const query = m.text?.trim();
  if (!query) {
    return m.reply(
      claraWrap("play", `🎵 *PLAY*\n\nContoh:\n\`${m.prefix}play komang\``),
    );
  }

  m.react("🕒");

  try {
    const search = await yts(query);
    if (!search.videos.length) throw "Video tidak ditemukan";

    const video = search.videos[0];

    // Tampilkan info + tombol pilihan
    await sendChoiceButtons(sock, m, video);

    m.react("🐣");
  } catch (err) {
    console.error("[Play]", err);
    m.reply(
      claraWrap(
        "play",
        "Wahhh, fitur putar musiknya lagi ada kendala kak, coba lagi nanti yak",
      ),
    );
  }
}

export { pluginConfig as config, handler };
