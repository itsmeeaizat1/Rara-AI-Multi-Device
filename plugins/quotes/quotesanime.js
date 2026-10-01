// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "quotesanime",
  alias: ["quotesanime", "animequote"],
  category: "quotes",
  description: "Random quotes dari anime",
  usage: ".quotesanime",
  example: ".quotesanime",
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const res = await axios.get("https://animechan.xyz/api/random");
    const { quote, character, anime } = res.data;
    let result = "";
    result += `
`;
    result += `"${quote}"\n`;
    result += `— ${character} (${anime})\n`;
    result += `
`;
    await sock.sendMessage(from, { text: result }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("quotesanime", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
