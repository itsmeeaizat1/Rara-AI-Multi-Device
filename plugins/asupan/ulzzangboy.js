// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ulzzangboy",
  alias: ["ulzzangboy", "ulzzangboypic"],
  category: "asupan",
  description: "Random ulzzang Boy photo",
  usage: ".ulzzangboy",
  example: ".ulzzangboy",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const seed = Math.floor(Math.random() * 10000);
    const url = `https://image.pollinations.ai/prompt/${query} aesthetic portrait, seed=${seed}&width=512&height=768&nologo=true`;
    await sock.sendMessage(from, { image: { url }, caption: "ulzzang Boy ~" }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(novaWrap("ulzzangboy", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
