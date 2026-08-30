// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const STYLES = ["avataaars", "bottts", "fun-emoji", "lorelei", "micah", "notionists", "open-peeps", "personas", "pixel-art", "adventurer"];

const pluginConfig = {
  name: "profilepic",
  alias: ["profilepic", "ppgen"],
  category: "asupan",
  description: "Generate profile picture dari nama",
  usage: ".profilepic <nama>",
  example: ".profilepic Aizat",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    const text = m.args?.join(" ").trim() || m.pushName || "Nova";
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const url = `https://api.dicebear.com/7.x/${style}/png?seed=${encodeURIComponent(text)}&size=512`;
    await sock.sendMessage(from, { image: { url }, caption: `Profile Pic: ${text}\nStyle: ${style}` }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(claraWrap("profilepic", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
