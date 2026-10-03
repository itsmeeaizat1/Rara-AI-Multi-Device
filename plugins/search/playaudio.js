// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: PlayAudio (dipanggil dari tombol .play)
 * Pembuat Code: Aizat
 * Fitur: Download audio YouTube dengan kbps spesifik
 * API: yt-dlp (primary, gratis no apikey) → Cuki API (fallback) → ytdl.js (last resort)
 */

import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { downloadAudio } from "../../src/scraper/rara-ytdlp.js";
import config from "../../config.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard } from "../../src/lib/rara-media-result.js";

const CUKI_APIKEY = config.APIkey?.cuki || "cuki-x";

const pluginConfig = {
  name: "playaudio",
  alias: ["playaudio"],
  category: "search",
  description: "Download audio YouTube dengan kualitas kbps spesifik",
  usage: ".playaudio<kbps> <url> (dipanggil dari tombol .play)",
  example: ".playaudio320 https://youtube.com/watch?v=xxx",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
  isHidden: true,
};

/**
 * Cuki API fallback — download audio dengan kbps spesifik
 */
async function getAudioCuki(url, quality = "128") {
  try {
    const apiUrl = `https://api.cuki.biz.id/api/downloader/ytmp3?apikey=${CUKI_APIKEY}&url=${encodeURIComponent(url)}&quality=${quality}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });

    if (data?.success && data?.data?.audio?.download?.downloadUrl) {
      // Download the buffer
      const { data: audioData } = await axios.get(
        data.data.audio.download.downloadUrl,
        { responseType: "arraybuffer", timeout: 60000 },
      );
      const buffer = Buffer.from(audioData);
      if (buffer.length > 10000) {
        return {
          buffer,
          title: data.data.metadata?.title || "Audio",
          quality: data.data.audio?.quality || quality,
        };
      }
    }
  } catch (err) {
    console.error("[PlayAudio] Cuki API error:", err.message);
  }
  return null;
}

/**
 * ytdl.js last resort fallback
 */
async function getAudioYtdl(url) {
  const result = await ytdl(url, "mp3");
  if (result?.status && result?.dl) {
    const buffer = await fallbackToMp3Buffer(result.dl);
    return { buffer, title: result.title, quality: "128" };
  }
  return null;
}

async function handler(m, { sock }) {
  // Parse: .playaudio320 <url> atau .playaudio <url>
  const rawText = m.text?.trim() || "";
  const match = rawText.match(/^(\d{3,4})?\s*(https?:\/\/\S+)/);
  if (!match) {
    return m.reply(
      raraWrap("playaudio", `Contoh: ${m.prefix}playaudio320 https://youtube.com/watch?v=xxx`),
    );
  }

  const quality = match[1] || "128";
  const url = match[2];

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply("URL harus YouTube");
  }
  try {
    let audioResult = null;

    // 1. Try yt-dlp (free, no API key, supports kbps selection)
    try {
      console.log(`[PlayAudio] 🎵 yt-dlp ${quality}kbps...`);
      audioResult = await downloadAudio(url, quality);
    } catch (err) {
      console.error("[PlayAudio] yt-dlp failed:", err.message);
    }

    // 2. Fallback: Cuki API (supports kbps)
    if (!audioResult) {
      try {
        console.log(`[PlayAudio] 🎵 Cuki API ${quality}kbps...`);
        audioResult = await getAudioCuki(url, quality);
      } catch (err) {
        console.error("[PlayAudio] Cuki failed:", err.message);
      }
    }

    // 3. Last resort: ytdl.js (128kbps only)
    if (!audioResult) {
      try {
        console.log("[PlayAudio] 🎵 ytdl.js fallback (128kbps)...");
        audioResult = await getAudioYtdl(url);
      } catch (err) {
        console.error("[PlayAudio] ytdl.js failed:", err.message);
      }
    }

    if (!audioResult || !audioResult.buffer || audioResult.buffer.length < 10000) {
      throw new Error("Semua API audio gagal");
    }

    await sock.sendMessage(
      m.chat,
      {
        audio: audioResult.buffer,
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${audioResult.title || "audio"}.mp3`,
      },
      { quoted: m },
    );
    const info = mediaResultCard({ header: "Play Audio", title: audioResult.title, type: "audio", ext: "mp3",
      size: audioResult.buffer.length, bitrate: Number(quality) || undefined });
    if (info) await m.reply(info);
  } catch (err) {
    console.error("[PlayAudio]", err);
    m.reply(
      raraWrap(
        "playaudio",
        `Gagal download audio nih (${quality}kbps), coba lagi ya`,
      ),
    );
  }
}

export { pluginConfig as config, handler };
