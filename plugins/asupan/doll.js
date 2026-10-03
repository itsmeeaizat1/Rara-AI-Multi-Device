// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "boneka",
  alias: ["boneka", "bonekapic"],
  category: "asupan",
  description: "Random Boneka photo",
  usage: ".boneka",
  example: ".boneka",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const seed = Math.floor(Math.random() * 10000);
    const query = "Boneka doll"; // subjek foto (dulu variabel ini tidak pernah dideklarasikan -> ReferenceError)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(query + " aesthetic photo")}?seed=${seed}&width=512&height=768&nologo=true`;
    await sock.sendMessage(from, { image: { url }, caption: "Boneka ~" }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("boneka", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
