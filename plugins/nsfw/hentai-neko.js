// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// hentai-neko.js — Hentai neko (NSFW)
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hentai-neko",
  alias: ["hentai-neko", "hneko", "hentaineko"],
  category: "nsfw",
  description: "Hentai neko (NSFW)",
  usage: ".hentai-neko",
  example: ".hentai-neko",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://nekos.life/api/v2/img/nsfw_neko_gif", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(claraWrap("hentai-neko", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "hentai-neko ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("hentai-neko error:", err);
    await m.react("❌");
    return m.reply(claraWrap("hentai-neko", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
