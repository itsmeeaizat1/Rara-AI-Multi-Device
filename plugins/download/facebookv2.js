// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine, novaCaption, mediaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "facebookv2",
  alias: ["facebookv2"],
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
    return m.reply(novaGuide("Facebook V2", "Masukkan URL video Facebook yang mau diunduh!", `${m.prefix}facebookv2 https://www.facebook.com/watch?v=xxx`));
  }
  m.react("🕒");
  try {
    const res = await rlGet(`${API_BASE}/download/facebook?apikey=${API_KEY}&url=${encodeURIComponent(text)}`);
    const r = res.data?.result || res.data?.data;
    if (!r) {
      return m.reply(novaError("Facebook V2", "Gagal mengambil data dari server Facebook. Coba lagi nanti ya!"));
    }

    const videoUrl = r.media || (r.video && r.video[0]?.url) || null;
    if (!videoUrl) {
      return m.reply(novaEmpty("Facebook V2", "Video Facebook tidak ditemukan atau mungkin dibatasi privat."));
    }

    const caption = mediaCaption({
        platformIcon: "👥",
        platformName: "Facebook",
        title: r.title || "Facebook Video",
        duration: r.duration || null,
        format: "Video",
        method: "API V2",
    });

    await sock.sendMessage(m.chat, {
        video: { url: videoUrl },
        caption,
    }, { quoted: m });
    m.react("🐣");
  } catch (e) {
    console.error("[FBV2]", e.message);
    m.reply(novaError("Facebook V2", `Gagal mengunduh video Facebook — ${e.message || 'terjadi kesalahan'}`));
  }
}
export { pluginConfig as config, handler };