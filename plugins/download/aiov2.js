// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import {  claraWrap, claraLine, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aiov2",
  alias: ["aiov2"],
  category: "download",
  description: "AIO Downloader all-in-one sosmed via V2 API (V2)",
  usage: ".aiov2 <url>",
  example: ".aiov2 https://vt.tiktok.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

// === RATE LIMITER (25 req/min) ===
const RATE_LIMIT = 25, RATE_WINDOW = 60000;
let reqTs = [];

async function rlGet(url) {
  const now = Date.now();
  reqTs = reqTs.filter(t => now - t < RATE_WINDOW);
  if (reqTs.length >= RATE_LIMIT) {
    const oldest = reqTs[0];
    const wait = RATE_WINDOW - (now - oldest) + 500;
    console.log(`[AIOV2] Rate limit, waiting ${Math.ceil(wait/1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  reqTs.push(Date.now());
  return axios.get(url, { timeout: 30000 });
}

function formatSize(bytes) {
  if (!bytes) return "Unknown";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return novaCaption({
  emoji: "🌐",
  name: "aiov2",
  description: "AIO Downloader all-in-one sosmed via V2 API (V2)",
  usage: `$m.prefixaiov2 <url>`,
  example: `$m.prefixaiov2 https://vt.tiktok.com/xxx`,
}), "aiov2")
  }

  m.react("🕒");

  try {
    const res = await rlGet(
      `${API_BASE}/download/aio?apikey=${API_KEY}&url=${encodeURIComponent(text)}`
    );

    const r = res.data?.result || res.data?.data;
    if (!r) throw new Error("Gagal mengambil data dari V2 API");

    const medias = r.medias || [];
    if (!medias.length) throw new Error("Media tidak ditemukan untuk URL ini");

    let caption = `╭──「 AIO V2 」\n`;
    caption += `│ Title: ${r.title || "Media"}\n`;
    caption += `│ Source: ${r.source || "Unknown"}\n`;
    if (r.duration) caption += `│ Durasi: ${r.duration}s\n`;
    if (r.thumbnail) caption += `│ Thumb: tersedia\n`;
    caption += `│ Quality: ${medias.length} opsi tersedia\n`;
    caption += `╰──────────❀`;

    // Pick best quality (usually last in array)
    const best = medias[medias.length - 1];
    const mediaUrl = best?.url || best?.download || null;
    if (!mediaUrl) throw new Error("URL media tidak valid");

    // Determine if audio or video based on extension/type
    const isAudio = (best.type || "").includes("audio") || (best.extension || "").match(/mp3|m4a|wav/i);
    const mediaType = isAudio ? "audio" : "video";

    if (isAudio) {
      await sock.sendMedia(m.chat, mediaUrl, caption, m, {
        type: "audio",
        mimetype: "audio/mpeg",
        fileName: `${(r.title || "audio").replace(/[^\w\s-]/g, "").trim()}.mp3`,
      });
    } else {
      await sock.sendMedia(m.chat, mediaUrl, caption, m, { type: "video" });
    }

    m.react("🐣");
  } catch (e) {
    console.error("[AIOV2] Error:", e.message);
    m.reply(claraWrap("Aiov2", `Gagal mengambil media.\n>${e.message || "Coba lagi nanti"}`));
  }
}

export { pluginConfig as config, handler };
