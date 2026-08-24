// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "bratsquidward",
  alias: [],
  category: "sticker",
  description: "Membuat sticker brat squidward",
  usage: ".bratsquidward <text>",
  example: ".bratsquidward Hai semua",
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
    return m.reply( `🖼️ *BRAT SQUIDWARD*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}bratsquidward Hai semua\``, "bratsquidward");
  }

  m.react("🕒");

  try {
    const url = `https://api.nova.my.id/api/bratsquidward?text=${encodeURIComponent(text)}`;
    await sock.sendImageAsSticker(m.chat, url, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });
    m.react("✅");
  } catch (error) {
    m.reply(claraWrap("bratsquidward", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
