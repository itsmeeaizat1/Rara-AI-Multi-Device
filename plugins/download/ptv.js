// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ptv.js — Pinterest video download
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ptv",
  alias: ["ptv", "pinterestvideo", "pinvid"],
  category: "download",
  description: "Download video dari Pinterest",
  usage: ".ptv <url_pinterest>",
  example: ".ptv https://pinterest.com/pin/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const url = m.args?.[0]?.trim();
    if (!url || !url.includes("pin")) return m.reply(claraWrap("ptv", `Masukkan URL Pinterest!\n\nContoh: .ptv https://pinterest.com/pin/xxx`, "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/d/pin?url=${encodeURIComponent(url)}`);
    const data = res.data?.data || res.data;
    const videoUrl = data?.url || data?.video || data?.medias?.[0]?.url;
    if (!videoUrl) return m.reply(claraWrap("ptv", "Gagal mengambil video!", "error"));

    await sock.sendMessage(from, {
      video: { url: videoUrl },
      caption: "Pinterest Video ~"
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("ptv error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ptv", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
