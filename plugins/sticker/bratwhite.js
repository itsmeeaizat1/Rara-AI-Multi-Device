// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "bratwhite",
  alias: [],
  category: "sticker",
  description: "Membuat sticker brat white",
  usage: ".bratwhite <text>",
  example: ".bratwhite Hai semua",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply( `🖼️ *BRAT WHITE*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}bratwhite Hai semua\``, "bratwhite");
  }

  m.react("🐣");

  try {
    const url = `https://api.nova.my.id/api/bratwhite?text=${encodeURIComponent(text)}`;
    await sock.sendImageAsSticker(m.chat, url, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });
    m.react("✅");
  } catch (error) {
    m.reply(claraWrap("bratwhite", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
