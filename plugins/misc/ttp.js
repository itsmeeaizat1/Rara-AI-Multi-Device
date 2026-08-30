// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ttp.js — Text to PNG (sticker)
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ttp",
  alias: ["ttp", "texttopng"],
  category: "misc",
  description: "Convert teks ke PNG (sticker)",
  usage: ".ttp <teks>",
  example: ".ttp Hello World",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    const text = m.args?.join(" ").trim();
    if (!text) return m.reply(claraWrap("ttp", `Masukkan teks!\n\nContoh: ${m.prefix}ttp Hello World`, "guide"));

    await m.react("🕒");
    const url = `https://api.siputzx.my.id/api/canvas/ttp?text=${encodeURIComponent(text)}`;
    await sock.sendMessage(from, {
      sticker: { url },
      packname: "Nova-AI",
      author: "TTP"
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("ttp error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ttp", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
