// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// milf.js — Random MILF (NSFW)
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "milf",
  alias: ["milf"],
  category: "nsfw",
  description: "Random MILF (NSFW)",
  usage: ".milf",
  example: ".milf",
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
      return m.reply(claraWrap("milf", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "milf ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("milf error:", err);
    await m.react("❌");
    return m.reply(claraWrap("milf", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
