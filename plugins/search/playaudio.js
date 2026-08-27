// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: PlayAudio (dipanggil dari tombol .play)
 * Pembuat Code: Aizat
 * Fitur: Download audio YouTube dengan kbps spesifik via Cuki API
 */

import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const CUKI_APIKEY = config.APIkey?.cuki || "cuki-x";

const pluginConfig = {
  name: "playaudio",
  alias: ["playaudio"],
  category: "search",
  description: "Download audio YouTube dengan kualitas kbps spesifik (Cuki API)",
  usage: ".playaudio<kbps> <url> (dipanggil dari tombol .play)",
  example: ".playaudio320 https://youtube.com/watch?v=xxx",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
  isHidden: true,
};

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
    console.error("[PlayAudio] Cuki API error:", err.message);
  }

  // Fallback ke ytdl.js
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

async function handler(m, { sock }) {
  // Parse: .playaudio320 <url> atau .playaudio <url>
  const rawText = m.text?.trim() || "";
  const match = rawText.match(/^(\d{3,4})?\s*(https?:\/\/\S+)/);
  if (!match) {
    return m.reply(
      claraWrap("playaudio", `Contoh: ${m.prefix}playaudio320 https://youtube.com/watch?v=xxx`),
    );
  }

  const quality = match[1] || "128";
  const url = match[2];

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return m.reply("URL harus YouTube");
  }

  m.react("🕒");

  try {
    const audio = await getAudioDownload(url, quality);

    if (audio.isCuki) {
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
            fileName: `${audio.title}.mp3`,
          },
          { quoted: m },
        );
        m.react("🐣");
        return;
      } catch (err) {
        console.error("[PlayAudio] Cuki buffer error:", err.message);
      }
    }

    // Fallback path
    const mp3Buffer = await fallbackToMp3Buffer(audio.download);
    await sock.sendMessage(
      m.chat,
      {
        audio: mp3Buffer,
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${audio.title}.mp3`,
      },
      { quoted: m },
    );
    m.react("🐣");
  } catch (err) {
    console.error("[PlayAudio]", err);
    m.reply(
      claraWrap(
        "playaudio",
        `Gagal mengunduh audio (${quality}kbps). Coba lagi nanti ya`,
      ),
    );
  }
}

export { pluginConfig as config, handler };
