// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// SaveNow Downloader — All-in-one via savenow.to API (4kdownload.to)
// Support: YouTube, Instagram, TikTok, Facebook, Twitter/X, dll
// Format: mp3 (audio), 360/480/720/1080 (video mp4)
import axios from "axios";
import { getSaveNowKey } from "../../src/lib/config/env-loader.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "savenow",
  alias: ["savenow", "sn", "snnow"],
  category: "download",
  description: "Download video/audio dari YouTube, IG, TikTok, FB (via savenow.to)",
  usage: ".savenow <url> [format]",
  example: ".savenow https://youtube.com/watch?v=xxx mp3\n.savenow https://youtube.com/watch?v=xxx 720\n.savenow https://instagram.com/reel/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const SAVENOW_BASE = "https://p.savenow.to/api/v2";
const POLL_INTERVAL = 3000; // 3 detik
const POLL_MAX = 40; // max 40x = ~2 menit
const VALID_FORMATS = ["mp3", "360", "480", "720", "1080"];

const FORMAT_LABELS = {
  mp3: "🎵 Audio (MP3)",
  "360": "📹 Video 360p",
  "480": "📹 Video 480p",
  "720": "📹 Video 720p",
  "1080": "📹 Video 1080p",
};

const PLATFORM_ICONS = {
  youtube: "▶️",
  "youtu.be": "▶️",
  instagram: "📸",
  tiktok: "🎵",
  facebook: "👥",
  "fb.watch": "👥",
  twitter: "🐦",
  "x.com": "🐦",
  pinterest: "📌",
  reddit: "🤖",
  threads: "🧵",
  dailymotion: "🎬",
  vimeo: "🎬",
};

function getPlatformIcon(url) {
  const lower = url.toLowerCase();
  for (const [key, icon] of Object.entries(PLATFORM_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "🌐";
}

function isAudioFormat(format) {
  return format === "mp3";
}

function parseArgs(text) {
  const parts = text.trim().split(/\s+/);
  let url = "";
  let format = "mp3"; // default mp3

  for (const part of parts) {
    if (part.startsWith("http")) {
      url = part;
    } else if (VALID_FORMATS.includes(part.toLowerCase())) {
      format = part.toLowerCase();
    }
  }

  return { url, format };
}

/**
 * Request download ke savenow.to API
 * Returns: { id, progress_url, title, thumbnail_url, format, full_format }
 */
async function requestDownload(url, format, apiKey) {
  const params = new URLSearchParams({
    format: format,
    url: url,
    apikey: apiKey,
  });

  const { data } = await axios.get(
    `${SAVENOW_BASE}/download?${params.toString()}`,
    { timeout: 15000 }
  );

  if (!data?.success && data?.success !== undefined) {
    throw new Error(data?.message || "Gagal request download ke savenow.to");
  }

  return {
    id: data.id,
    progress_url: data.progress_url,
    title: data.title || data.info?.title || "Tanpa Judul",
    thumbnail_url: data.thumbnail_url || data.info?.image || null,
    format: data.format || format,
    full_format: data.full_format || format,
  };
}

/**
 * Polling progress sampai download siap
 * Returns: { download_url, title, thumbnail_url }
 */
async function pollProgress(progressUrl, title, thumbnailUrl) {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const { data } = await axios.get(progressUrl, { timeout: 15000 });

    if (data?.success === 1 || data?.progress >= 1000) {
      if (data.download_url) {
        return {
          download_url: data.download_url,
          title: data.title || title,
          thumbnail_url: data.thumbnail_url || data.info?.image || thumbnailUrl,
        };
      }
    }

    // Kalau ada error message tapi success false
    if (data?.success === 0 && data?.progress === 0 && data?.download_url === "" && i > 10) {
      // Kasih kesempatan lebih lama, mungkin lagi proses
      continue;
    }
  }

  throw new Error("Timeout — server savenow.to lambat merespon. Coba lagi nanti.");
}

/**
 * Download buffer dari URL, dengan limit ukuran
 */
async function downloadBuffer(url, maxSizeMB = 100) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: maxSizeMB * 1024 * 1024,
  });
  return Buffer.from(response.data);
}

async function handler(m, { sock }) {
  const text = m.text?.trim();

  if (!text) {
    return m.reply(
      novaGuide(
        "SaveNow",
        "Masukkan URL media yang mau kamu download ya!\nFormat: mp3, 360, 480, 720, 1080 (default: mp3)",
        `${m.prefix}savenow https://youtu.be/xxx 720`
      )
    );
  }

  const { url, format } = parseArgs(text);

  if (!url || !url.startsWith("http")) {
    await m.react("❗");
    return m.reply(
      novaGuide("SaveNow", "URL-nya tidak valid nih! Kirim link dari YouTube, IG, TikTok, FB, dll", `${m.prefix}savenow https://youtu.be/xxx`)
    );
  }

  const apiKey = getSaveNowKey();
  if (!apiKey) {
    return m.reply(
      novaError("SaveNow", "API key savenow.to belum terkonfigurasi. Hubungi owner bot ya!")
    );
  }

  // Loading reaksi
  try {
    // Step 1: Request download
    const request = await requestDownload(url, format, apiKey);
    const platformIcon = getPlatformIcon(url);

    // Kirim info sedang diproses
    let progressMsg = await m.reply(
      "╭─「 " + platformIcon + " SaveNow 」\n" +
      "" + FORMAT_LABELS[format] + "\n" +
      "" + (request.title || "Tanpa Judul").slice(0, 60) + "\n" +
      "│ ⏳ Sedang diproses server...\n" +
      "╰──────────"
    );

    // Step 2: Poll progress
    const result = await pollProgress(
      request.progress_url,
      request.title,
      request.thumbnail_url
    );

    // Step 3: Download buffer
    const isAudio = isAudioFormat(format);
    const maxSize = isAudio ? 50 : 100; // 50MB audio, 100MB video
    let buffer;
    try {
      buffer = await downloadBuffer(result.download_url, maxSize);
    } catch (dlErr) {
      // Kalau buffer terlalu besar, kirim URL aja
      if (dlErr?.code === "ERR_BAD_RESPONSE" || String(dlErr).includes("maxContentLength")) {
        return m.reply(
          novaError("SaveNow", `File terlalu besar untuk dikirim langsung. Download manual:\n${result.download_url}`)
        );
      }
      throw dlErr;
    }

    // Hapus pesan progress
    if (progressMsg?.key) {
      try { await sock.sendMessage(m.chat, { delete: progressMsg.key }); } catch {}
    }

    // Step 4: Kirim media
    const ctxInfo = saluranCtx();

    if (isAudio) {
      await sock.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: "audio/mpeg",
          fileName: (result.title || "audio").slice(0, 50) + ".mp3",
          contextInfo: ctxInfo,
        },
        { quoted: m }
      );
    } else {
      await sock.sendMessage(
        m.chat,
        {
          video: buffer,
          caption:
            "╭─「 " + platformIcon + " SaveNow 」\n" +
            "" + FORMAT_LABELS[format] + "\n" +
            "" + (result.title || "Tanpa Judul").slice(0, 60) + "\n" +
            "╰──────────",
          contextInfo: ctxInfo,
        },
        { quoted: m }
      );
    }
  } catch (error) {
    console.error("[savenow.js]:", error.message);
    m.reply(
      novaError(
        "SaveNow",
        "Gagal download — coba ganti format atau coba lagi nanti ya!"
      )
    );
  }
}

export { pluginConfig as config, handler };
