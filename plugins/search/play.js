// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Play
 * Pembuat Code: Aizat
 * Saluran: https://whatsapp.com/channel/0029Vb7g5Qt90x2yn7bOlM2U
 * Fitur: Search YouTube → pilih Audio (128/192/256/320 kbps) atau Video (360/480/720)
 * API: yt-dlp (primary, gratis no apikey) → Cuki API (secondary) → ytdl.js (fallback)
 */

import yts from "yt-search";
import axios from "axios";
import config from "../../config.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, toSC } from "../../src/lib/nova-menu-style.js";
import { downloadAudio, downloadVideo } from "../../src/scraper/nova-ytdlp.js";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { generateWAMessageFromContent } from "nova";

const pluginConfig = {
  name: "play",
  alias: ["play"],
  category: "search",
  description: "Putar musik/video YouTube dengan pilihan kualitas",
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
async function getAudioDownloadCuki(url, quality = "128") {
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

  throw new Error(fallback?.mess || "Gagal dapet audio download URL nih");
}

/**
 * Kirim audio ke chat (dari buffer atau URL)
 */
async function sendAudio(sock, m, audioBuffer, title, kbps) {
  await sock.sendMessage(
    m.chat,
    {
      audio: audioBuffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${title || "audio"}.mp3`,
    },
    { quoted: m },
  );
}

/**
 * Kirim video ke chat (dari buffer)
 */
async function sendVideo(sock, m, videoBuffer, title, quality, videoMeta) {
  const caption = claraWrap("play", [
    `│ Judul: *${title || videoMeta.title}*`,
    `│ Channel: *${videoMeta.author.name}*`,
    `│ Durasi: *${videoMeta.duration.timestamp}*`,
    `│ Quality: *${quality}*`,
  ].join("\n"));

  await sock.sendMessage(
    m.chat,
    {
      video: videoBuffer,
      caption,
      mimetype: "video/mp4",
      fileName: `${title || "video"}.mp4`,
    },
    { quoted: m },
  );
}

/**
 * Build interactive buttons message dengan pilihan Audio/Video + kbps
 */
async function sendChoiceButtons(sock, m, video) {
  const info = `╭─「 ✦ Now Playing ✦ 」
│
│ 📌 *Judul:* ${video.title}
│ 👤 *Channel:* ${video.author.name}
│ ⏱️ *Durasi:* ${video.duration.timestamp}
│ 👀 *Views:* ${formatViews(video.views)}
│ 📅 *Upload:* ${video.ago}
│ 🔗 ${video.url}
│
│ Pilih format & kualitas di bawah:`;

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
      claraWrap("play", [
        `│ 🎵 *PLAY YOUTUBE*`,
        `│`,
        `│ 📌 *Cara Pakai:*`,
        `│ \`${m.prefix}play <judul lagu>\``,
        `│`,
        `│ 💡 *Contoh:*`,
        `│ \`${m.prefix}play komang\``,
        `│ \`${m.prefix}play rizky febian\``,
        `│`,
        `│ ✨ Support: Audio (128/192/256/320 kbps)`,
        `│ ✨ Support: Video (360/480/720p)`,
      ].join("\n")),
    );
  }
  try {
    const search = await yts(query);
    if (!search.videos.length) throw "Video tidak ditemukan";

    const video = search.videos[0];

    // Tampilkan info + tombol pilihan audio/video
    await sendChoiceButtons(sock, m, video);
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
