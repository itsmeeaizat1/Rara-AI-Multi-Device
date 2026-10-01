// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// yuri.js — Yuri (NSFW)
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "yuri",
  alias: ["yuri"],
  category: "nsfw",
  description: "Yuri (NSFW)",
  usage: ".yuri",
  example: ".yuri",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://nekos.life/api/v2/img/yuri", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(raraWrap("yuri", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "yuri ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("yuri error:", err);
    await m.react("❌");
    return m.reply(raraWrap("yuri", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
