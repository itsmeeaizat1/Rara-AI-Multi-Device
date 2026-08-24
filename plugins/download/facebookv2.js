// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "facebookv2",
  alias: ["fbv2", "fbdlv2"],
  category: "download",
  description: "Download video Facebook via (V2)",
  usage: ".facebookv2 <url>",
  example: ".facebookv2 https://www.facebook.com/watch?v=xxx",
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
    return m.reply(
      `╭┈┈⬡「 FACEBOOK V2 」\n` +
      `┃ Usage: ${m.prefix}facebookv2 <url>\n` +
      `╰┈┈⬡\n\n` +
      `${m.prefix}facebookv2 https://www.facebook.com/watch?v=xxx`,
      "facebookv2");
  }
  m.react("🐣");
  try {
    const res = await rlGet(`${API_BASE}/download/facebook?apikey=${API_KEY}&url=${encodeURIComponent(text)}`);
    const r = res.data?.result || res.data?.data;
    if (!r) throw new Error("Gagal mengambil data Facebook");

    const videoUrl = r.media || (r.video && r.video[0]?.url) || null;
    if (!videoUrl) throw new Error("Video tidak ditemukan");

    let caption = `╭┈┈⬡「 FACEBOOK V2 」\n`;
    caption += `┃ Title: ${r.title || "Facebook Video"}\n`;
    if (r.duration) caption += `┃ Durasi: ${r.duration}\n`;
    caption += `┃ Source: API V2\n`;
    caption += `╰┈┈⬡`;

    await sock.sendMedia(m.chat, videoUrl, caption, m, { type: "video" });
    m.react("✅");
  } catch (e) {
    console.error("[FBV2]", e.message);
    m.reply(claraWrap("Facebookv2", `Gagal mengambil video.\n>${e.message}`));
  }
}
export { pluginConfig as config, handler };
