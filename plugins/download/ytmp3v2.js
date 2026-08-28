// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine, novaCaption, mediaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ytmp3v2",
  alias: ["ytmp3v2"],
  category: "download",
  description: "Download YouTube MP3 via (V2)",
  usage: ".ytmp3v2 <url>",
  example: ".ytmp3v2 https://youtu.be/xxx",
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
      novaGuide(
        "YTmp3 v2",
        "Kirim URL YouTube yang mau kamu download audionya!",
        `${m.prefix}ytmp3v2 https://youtu.be/xxx`
      )
    );
  }
  m.react("🕒");
  try {
    const res = await rlGet(`${API_BASE}/download/ytmp3?apikey=${API_KEY}&url=${encodeURIComponent(text)}`);
    const r = res.data?.result || res.data?.data;
    if (!r?.download) throw new Error("Gagal mengambil audio YouTube");

    const caption = mediaCaption({
        platformIcon: "▶️",
        platformName: "YouTube",
        title: r.title || "YouTube Audio",
        format: "🎵 MP3",
        method: "API V2",
    });

    await sock.sendMedia(m.chat, r.download, caption, m, {
      type: "audio", mimetype: "audio/mpeg",
      fileName: `${(r.title || "YouTube").replace(/[^\w\s-]/g, "").trim()}.mp3`
    });
    m.react("🐣");
  } catch (e) {
    console.error("[YTMP3V2]", e.message);
    m.reply(novaError("YTmp3 v2", "Gagal mengambil audio YouTube — coba lagi nanti ya!"));
  }
}
export { pluginConfig as config, handler };
