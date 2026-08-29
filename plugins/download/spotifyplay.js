// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spotifyplay",
  alias: ["spotifyplay"],
  category: "download",
  description: "Cari & download lagu dari Spotify berdasarkan judul/artist",
  usage: ".spotifyplay <judul lagu>",
  example: ".spotifyplay blinding lights the weeknd",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

// === RATE LIMITER (25 req/min safety margin) ===
const RATE_LIMIT = 25;
const RATE_WINDOW = 60000;
let requestTimestamps = [];

async function rateLimitedGet(url) {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((ts) => now - ts < RATE_WINDOW);
  if (requestTimestamps.length >= RATE_LIMIT) {
    const oldest = requestTimestamps[0];
    const waitTime = RATE_WINDOW - (now - oldest) + 500;
    console.log(`[SPOTIFYPLAY] Rate limit, waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise((r) => setTimeout(r, waitTime));
  }
  requestTimestamps.push(Date.now());
  return axios.get(url, { timeout: 30000 });
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "Unknown";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function spotifySearch(query) {
  const res = await rateLimitedGet(
    `${API_BASE}/download/spotify/play?apikey=${API_KEY}&q=${encodeURIComponent(query)}`
  );
  if (res.data?.status === true && res.data?.data?.download) {
    return res.data.data;
  }
  throw new Error("Lagu tidak ditemukan atau gagal mengambil data");
}

async function spotifyUrlDownload(url) {
  const res = await rateLimitedGet(
    `${API_BASE}/download/spotify?apikey=${API_KEY}&url=${encodeURIComponent(url)}`
  );
  if (res.data?.status === true && res.data?.data?.download) {
    return res.data.data;
  }
  throw new Error("Gagal mengambil data Spotify");
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  const prefix = m.prefix;

  if (!text) {
    return m.reply(novaGuide("Spotify Play", "Masukkan judul lagu atau link Spotify yang mau dicari!", `${m.prefix}spotifyplay blinding lights the weeknd`));
  }
  try {
    let data;
    const isSpotifyUrl = text.match(/open\.spotify\.com\/(track|album|playlist)/i);

    if (isSpotifyUrl) {
      data = await spotifyUrlDownload(text);
    } else {
      data = await spotifySearch(text);
    }

    if (!data.download) {
      return m.reply(novaEmpty("Spotify Play", "Link download audio lagu ini tidak tersedia."));
    }

    // Download audio buffer
    const audioRes = await axios.get(data.download, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36" },
    });

    if (!audioRes.data || audioRes.data.byteLength === 0) {
      return m.reply(novaError("Spotify Play", "Audio lagu kosong atau gagal diunduh dari server."));
    }

    const audioBuffer = Buffer.from(audioRes.data);
    const safeTitle = (data.title || "Spotify").replace(/[^\w\s-]/g, "").trim() || "Spotify";
    const safeArtist = (data.artis || "Unknown").replace(/[^\w\s-]/g, "").trim() || "Unknown";

    // Build caption
    let caption = `╭──「 SPOTIFY PLAY 」\n`;
    caption += `│ Judul: ${data.title || "Unknown"}\n`;
    caption += `│ Artist: ${data.artis || "Unknown"}\n`;
    if (data.album) caption += `│ Album: ${data.album}\n`;
    if (data.durasi && data.durasi > 0) caption += `│ Durasi: ${formatDuration(data.durasi)}\n`;
    if (data.size) caption += `│ Size: ${formatSize(data.size)}\n`;
    caption += `╰──────────`;

    // Send thumbnail if available
    if (data.image) {
      try {
        await sock.sendMessage(m.chat, {
          image: { url: data.image },
          caption: caption,
        }, { quoted: m });
      } catch {
        await m.reply(claraWrap("spotifyplay", caption));
      }
    } else {
      await m.reply(claraWrap("spotifyplay", caption));
    }

    // Send audio
    await sock.sendMedia(m.chat, audioBuffer, null, m, {
      type: "audio",
      mimetype: "audio/mpeg",
      fileName: `${safeTitle} - ${safeArtist}.mp3`,
    });
  } catch (e) {
    console.error("[SPOTIFYPLAY] Error:", e.message);
    m.reply(novaError("Spotify Play", `Gagal mengambil data Spotify — ${e.message || "coba lagi nanti ya"}`));
  }
}

export { pluginConfig as config, handler };