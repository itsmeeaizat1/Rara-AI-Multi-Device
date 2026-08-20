// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "douyinv2",
  alias: ["douyinv2", "douyin2"],
  category: "download",
  description: "Download video Douyin (V2)",
  usage: ".douyinv2 <url>",
  example: ".douyinv2 https://v.douyin.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const API_BASE = sankaConfig.baseUrl;
import fs from "node:fs";
const sankaConfig = JSON.parse(fs.readFileSync(new URL("../../config/sankavollerei-api.json", import.meta.url), "utf8"));
const API_KEY = sankaConfig.apikey;
const AZBRY_BASE = "https://api.azbry.com/api/downloader/douyin";

const RATE_LIMIT = 25, RATE_WINDOW = 60000;
let reqTs = [];

async function rlGet(url, opts = {}) {
  const now = Date.now();
  reqTs = reqTs.filter(t => now - t < RATE_WINDOW);
  if (reqTs.length >= RATE_LIMIT) {
    const wait = RATE_WINDOW - (now - reqTs[0]) + 500;
    await new Promise(r => setTimeout(r, wait));
  }
  reqTs.push(Date.now());
  return axios.get(url, { timeout: 30000, ...opts });
}

async function douyinPrimary(url) {
  const res = await rlGet(`${API_BASE}/download/douyin?apikey=${API_KEY}&url=${encodeURIComponent(url)}`);
  const r = res.data?.result || res.data?.data;
  if (r && (r.play || r.video || r.url)) {
    return {
      title: r.title || r.desc || "Douyin Video",
      video: r.play || r.video || r.url,
      music: r.music || r.audio || null,
      cover: r.cover || r.thumbnail || null,
      author: r.author?.nickname || r.author || "Unknown",
      duration: r.duration || 0,
      source: "V2",
    };
  }
  throw new Error("V2 API gagal");
}

async function douyinAzbry(url) {
  const res = await axios.get(`${AZBRY_BASE}?url=${encodeURIComponent(url)}`, { timeout: 30000 });
  const r = res.data?.result;
  if (r && (r.video || r.play)) {
    return {
      title: r.title || r.desc || "Douyin Video",
      video: r.video || r.play,
      music: r.audio || r.music || null,
      cover: r.cover || null,
      author: r.author?.nickname || "Unknown",
      duration: r.duration || 0,
      source: "Azbry",
    };
  }
  throw new Error("Azbry API gagal");
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return sendReplyWithNav(sock, m,
      `╭┈┈⬡「 DOUYIN V2 」\n` +
      `┃ Usage: ${m.prefix}douyinv2 <url>\n` +
      `╰┈┈⬡\n\n` +
      `${m.prefix}douyinv2 https://v.douyin.com/xxx`,
      "douyinv2");
  }

  m.react("🕐");

  try {
    let data;
    try {
      data = await douyinPrimary(text);
    } catch (primaryErr) {
      console.log("V2 primary failed, trying Azbry:", primaryErr.message);
      data = await douyinAzbry(text);
    }

    if (!data.video) throw new Error("Video URL tidak ditemukan");

    let caption = `╭┈┈⬡「 DOUYIN V2 」\n`;
    caption += `┃ Title: ${data.title}\n`;
    caption += `┃ Author: ${data.author}\n`;
    if (data.duration > 0) caption += `┃ Durasi: ${data.duration}s\n`;
    caption += `┃ Source: ${data.source} API\n`;
    caption += `╰┈┈⬡`;

    await sock.sendMedia(m.chat, data.video, caption, m, { type: "video" });

    if (data.music) {
      try {
        await sock.sendMedia(m.chat, data.music, null, m, {
          type: "audio", mimetype: "audio/mpeg",
        });
      } catch {}
    }

    m.react("✅");
  } catch (e) {
    console.error("[DOUYINV2] Error:", e.message);
    m.reply(claraWrap("Douyinv2", `Gagal mengambil data Douyin.\n>${e.message || "Coba lagi nanti"}`));
  }
}

export { pluginConfig as config, handler };
