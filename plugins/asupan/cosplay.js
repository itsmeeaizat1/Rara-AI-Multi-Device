// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cosplay",
  alias: ["cosplay", "cosplaypic"],
  category: "asupan",
  description: "Random cosplay photo",
  usage: ".cosplay",
  example: ".cosplay",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const res = await axios.get("https://api.waifu.pics/sfw/cuddle");
    if (!res.data?.url) throw new Error("Gagal mengambil gambar");
    await sock.sendMessage(from, { image: { url: res.data.url }, caption: "Cosplay ~" }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(novaWrap("cosplay", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
