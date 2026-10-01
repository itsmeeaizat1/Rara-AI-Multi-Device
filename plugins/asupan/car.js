// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "car",
  alias: ["car", "carpic"],
  category: "asupan",
  description: "Random car photo",
  usage: ".car",
  example: ".car",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const seed = Math.floor(Math.random() * 10000);
    const url = `https://image.pollinations.ai/prompt/luxury sports car aesthetic, seed=${seed}&width=768&height=512&nologo=true`;
    await sock.sendMessage(from, { image: { url }, caption: "Random Car ~" }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("car", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
