// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ytmp4v2",
  alias: ["ytmp4v2"],
  category: "download",
  description: "Download YouTube MP4 via (V2)",
  usage: ".ytmp4v2 <url>",
  example: ".ytmp4v2 https://youtu.be/xxx",
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
      `╭┈┈⬡「 YTMP4 V2 」\n` +
      `┃ Usage: ${m.prefix}ytmp4v2 <url>\n` +
      `╰┈┈⬡\n\n` +
      `${m.prefix}ytmp4v2 https://youtu.be/xxx`,
      "ytmp4v2");
  }
  m.react("🕒");
  try {
    const res = await rlGet(`${API_BASE}/download/ytmp4?apikey=${API_KEY}&url=${encodeURIComponent(text)}`);
    const r = res.data?.result || res.data?.data;
    if (!r?.download) throw new Error("Gagal mengambil video YouTube");

    let caption = `╭┈┈⬡「 YTMP4 V2 」\n`;
    caption += `┃ Title: ${r.title || "YouTube Video"}\n`;
    caption += `┃ Source: API V2\n`;
    caption += `╰┈┈⬡`;

    await sock.sendMedia(m.chat, r.download, caption, m, { type: "video" });
    m.react("🐣");
  } catch (e) {
    console.error("[YTMP4V2]", e.message);
    m.reply(claraWrap("Ytmp4v2", `Gagal mengambil video.\n>${e.message}`));
  }
}
export { pluginConfig as config, handler };
