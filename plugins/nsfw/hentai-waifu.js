// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// hentai-waifu.js — Hentai waifu (NSFW)
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hentai-waifu",
  alias: ["hentai-waifu", "hwaifu", "hentaiwaifu"],
  category: "nsfw",
  description: "Hentai waifu (NSFW)",
  usage: ".hentai-waifu",
  example: ".hentai-waifu",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://api.waifu.pics/nsfw/waifu", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(novaWrap("hentai-waifu", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "hentai-waifu ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("hentai-waifu error:", err);
    await m.react("❌");
    return m.reply(novaWrap("hentai-waifu", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
