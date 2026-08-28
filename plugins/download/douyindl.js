// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "douyindl",
  alias: ["douyindl"],
  category: "download",
  description: "Download video/audio dari Douyin (TikTok China)",
  usage: ".douyindl <url>",
  example: ".douyindl https://v.douyin.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function douyinFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`https://api.azbry.com/api/downloader/douyin?url=${encodeURIComponent(url)}`, { timeout: 30000 });
      if (res.data?.status && res.data?.result) {
        return res.data;
      }
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error("Gagal mengambil data dari server");
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(novaNoInput("Douyin DL", "Kirim URL Douyin (TikTok China) yang mau didownload!", `${m.prefix}douyindl https://v.douyin.com/xxx`));
  }

  m.react("🕒");

  try {
    const data = await douyinFetch(text);
    const result = data.result;

    let caption = `🎵 *${result.platform || "Douyin"}*\n\n${result.title || ""}`;

    if (result.video) {
      await sock.sendMedia(m.chat, result.video, caption, m, {
        type: "video",
      });
    }

    if (result.audio) {
      await sock.sendMedia(m.chat, result.audio, null, m, {
        type: "audio",
      });
    }

    m.react("🐣");
  } catch (e) {
    console.error(e);
    m.reply(novaError("Douyin DL", "Gagal mengambil data Douyin. Coba lagi nanti ya!"));
  }
}

export { pluginConfig as config, handler };