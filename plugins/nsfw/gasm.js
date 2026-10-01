// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gasm.js — Random gasm (NSFW)
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "gasm",
  alias: ["gasm"],
  category: "nsfw",
  description: "Random gasm (NSFW)",
  usage: ".gasm",
  example: ".gasm",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://nekos.life/api/v2/img/gasm", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(raraWrap("gasm", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "gasm ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("gasm error:", err);
    await m.react("❌");
    return m.reply(raraWrap("gasm", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
