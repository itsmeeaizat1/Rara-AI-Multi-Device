// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gifblowjob.js — GIF blowjob (NSFW)
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "gifblowjob",
  alias: ["gifblowjob", "blowjob"],
  category: "nsfw",
  description: "GIF blowjob (NSFW)",
  usage: ".gifblowjob",
  example: ".gifblowjob",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://nekos.life/api/v2/img/blowjob", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(raraWrap("gifblowjob", "Gagal mengambil gambar!", "error"));
    }
    await sock.sendMessage(from, { image: { url }, caption: "gifblowjob ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("gifblowjob error:", err);
    await m.react("❌");
    return m.reply(raraWrap("gifblowjob", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
