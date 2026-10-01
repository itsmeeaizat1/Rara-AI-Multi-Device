// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// xnxxdl.js — Download video NSFW
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "xnxxdl",
  alias: ["xnxxdl", "xnxxdownload"],
  category: "nsfw",
  description: "Download video NSFW dari URL",
  usage: ".xnxxdl <url>",
  example: ".xnxxdl https://...",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const url = m.args?.[0]?.trim();
    if (!url) return m.reply(novaWrap("xnxxdl", "Masukkan URL video!", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/d/xnxx?url=${encodeURIComponent(url)}`, { timeout: 30000 });
    const data = res.data?.data || res.data;
    if (!data?.url && !data?.files?.high) return m.reply(novaWrap("xnxxdl", "Gagal mengambil video!", "error"));

    const videoUrl = data.url || data.files?.high || data.files?.low;
    await sock.sendMessage(m.key.remoteJid, { video: { url: videoUrl }, caption: data.title || "NSFW Video" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("xnxxdl error:", err);
    await m.react("❌");
    return m.reply(novaWrap("xnxxdl", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
