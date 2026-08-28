// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tiktokv2",
  alias: ["tiktokv2"],
  category: "download",
  description: "Download TikTok tanpa watermark via (V2)",
  usage: ".tiktokv2 <url>",
  example: ".tiktokv2 https://vt.tiktok.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

import { getSankaConfig } from "../../src/lib/config/env-loader.js";
const sankaConfig = getSankaConfig();
const API_BASE = sankaConfig.baseUrl;
const API_KEY = sankaConfig.apikey;

const RATE_LIMIT = 25, RATE_WINDOW = 60000;
let reqTs = [];

async function rlGet(url) {
  const now = Date.now();
  reqTs = reqTs.filter(t => now - t < RATE_WINDOW);
  if (reqTs.length >= RATE_LIMIT) {
    await new Promise(r => setTimeout(r, RATE_WINDOW - (now - reqTs[0]) + 500));
  }
  reqTs.push(Date.now());
  return axios.get(url, { timeout: 30000 });
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(novaNoInput("TikTok V2", "Masukkan link video TikTok yang mau kamu download!", `${m.prefix}tiktokv2 https://vt.tiktok.com/xxx`));
  }
  m.react("🕒");
  try {
    const res = await rlGet(`${API_BASE}/download/tiktok?apikey=${API_KEY}&url=${encodeURIComponent(text)}`);
    const r = res.data?.result || res.data?.data;
    if (!r?.play) throw new Error("Gagal mengambil video TikTok");

    const caption = `╭──「 TikTok V2 」\n│ Title: ${r.title || "TikTok Video"}\n│ Author: ${r.author?.nickname || "-"}\n╰──────────❀`;

    await sock.sendMessage(m.chat, {
        video: { url: r.play },
        caption,
    }, { quoted: m });
    m.react("🐣");
  } catch (e) {
    console.error("[TIKTOKV2]", e.message);
    m.reply(novaError("TikTok V2", e.message || "Gagal mengambil video TikTok"));
  }
}
export { pluginConfig as config, handler };
