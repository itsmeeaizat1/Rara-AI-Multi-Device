// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

const pluginConfig = {
  name: "emojitoanimasi",
  alias: ["emoji2sticker", "emojisticker", "e2s"],
  category: "tools",
  description: "Konversi emoji ke sticker animasi",
  usage: ".emojitoanimasi <emoji>",
  example: ".emojitoanimasi 😳",
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const emoji = m.text?.trim();

  if (!emoji) {
    return m.reply( `🎭 *EMOJI TO ANIMAsI*\n\n` +
        `Konversi emoji ke sticker animasi\n\n` +
        `*Contoh:*\n` +
        `\`${m.prefix}emojitoanimasi 😳\``, "emojitoanimasi");
  }

  m.react("🕒");

  try {
    const apiUrl = `https://api.neoxr.eu/api/emojito?q=${encodeURIComponent(emoji)}&apikey=${NEOXR_APIKEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });

    if (!data?.status || !data?.data?.url) {
      return m.reply(claraWrap("emojitoanimasi", "❌ *GAGAL*\n\nEmoji tidak ditemukan atau API error"));
    }

    const webpUrl = data.data.url;

    const webpRes = await axios.get(webpUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
    });
    const webpBuffer = Buffer.from(webpRes.data);

    await sock.sendMessage(
      m.chat,
      {
        sticker: webpBuffer,
        contextInfo: saluranCtx(),
      },
      { quoted: m },
    );

    m.react("🐣");
  } catch (error) {
    m.reply(claraWrap("emojitoanimasi", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
