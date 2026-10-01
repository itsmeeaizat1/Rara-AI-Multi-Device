// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// zettai.js — Zettai ryouiki (NSFW)
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "zettai",
  alias: ["zettai", "zettairyouiki"],
  category: "nsfw",
  description: "Zettai ryouiki (NSFW)",
  usage: ".zettai",
  example: ".zettai",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://nekos.life/api/v2/img/zettai_ryouiki", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(raraWrap("zettai", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "zettai ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("zettai error:", err);
    await m.react("❌");
    return m.reply(raraWrap("zettai", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
