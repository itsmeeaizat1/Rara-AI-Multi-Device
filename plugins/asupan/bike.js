// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bike",
  alias: ["bike", "bikepic"],
  category: "asupan",
  description: "Random motorcycle photo",
  usage: ".bike",
  example: ".bike",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const seed = Math.floor(Math.random() * 10000);
    const url = `https://image.pollinations.ai/prompt/sport motorcycle aesthetic, seed=${seed}&width=768&height=512&nologo=true`;
    await sock.sendMessage(from, { image: { url }, caption: "Random Bike ~" }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(claraWrap("bike", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
