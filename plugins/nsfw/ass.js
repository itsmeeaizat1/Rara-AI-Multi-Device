// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ass.js — Random ass (NSFW)
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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
      return m.reply(claraWrap("ass", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "ass ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("ass error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ass", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
