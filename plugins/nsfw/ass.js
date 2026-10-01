// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ass.js — Random ass (NSFW)
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ass",
  alias: ["ass"],
  category: "nsfw",
  description: "Random ass (NSFW)",
  usage: ".ass",
  example: ".ass",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://nekos.life/api/v2/img/ass", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(raraWrap("ass", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "ass ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("ass error:", err);
    await m.react("❌");
    return m.reply(raraWrap("ass", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
