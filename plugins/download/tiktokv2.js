import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tiktokv2",
  alias: ["ttv2", "tiktokdlv2"],
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

const API_BASE = "https://www.sankavollerei.web.id";
const API_KEY = "planaai";

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
    return sendReplyWithNav(sock, m,
      `╭┈┈⬡「 TIKTOK V2 」\n` +
      `┃ Usage: ${m.prefix}tiktokv2 <url>\n` +
      `╰┈┈⬡\n\n` +
      `> ${m.prefix}tiktokv2 https://vt.tiktok.com/xxx`,
      "tiktokv2");
  }
  m.react("🕐");
  try {
    const res = await rlGet(`${API_BASE}/download/tiktok?apikey=${API_KEY}&url=${encodeURIComponent(text)}`);
    const r = res.data?.result || res.data?.data;
    if (!r?.play) throw new Error("Gagal mengambil video TikTok");

    let caption = `╭┈┈⬡「 TIKTOK V2 」\n`;
    caption += `┃ Title: ${r.title || "TikTok Video"}\n`;
    caption += `┃ Author: ${r.author?.nickname || "Unknown"}\n`;
    if (r.duration) caption += `┃ Durasi: ${r.duration}s\n`;
    caption += `┃ Views: ${(r.play_count || 0).toLocaleString()}\n`;
    caption += `┃ Likes: ${(r.digg_count || 0).toLocaleString()}\n`;
    caption += `┃ Source: API V2\n`;
    caption += `╰┈┈⬡`;

    await sock.sendMedia(m.chat, r.play, caption, m, { type: "video" });
    m.react("✅");
  } catch (e) {
    console.error("[TIKTOKV2]", e.message);
    m.reply(claraWrap("Tiktokv2", `Gagal mengambil video.\n>${e.message}`));
  }
}
export { pluginConfig as config, handler };
