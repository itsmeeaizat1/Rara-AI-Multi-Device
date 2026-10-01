// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

const pluginConfig = {
  name: "emojitoanimasi",
  alias: ["emojitoanimasi"],
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
    return m.reply(novaWrap("emojitoanimasi", [
      `Konversi emoji ke sticker animasi.`,
      ``,
      `📌 Format: ${m.prefix}emojitoanimasi <emoji>`,
      `💡 Contoh: ${m.prefix}emojitoanimasi 😳`,
    ]));
  }
  try {
    await m.react("🕒");
    const apiUrl = `https://api.neoxr.eu/api/emojito?q=${encodeURIComponent(emoji)}&apikey=${NEOXR_APIKEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });

    if (!data?.status || !data?.data?.url) {
      return m.reply(novaWrap("emojitoanimasi", "❌ *gagal*\n\nEmoji tidak ditemukan atau API error"));
    }

    const webpUrl = data.data.url;

    const webpRes = await axios.get(webpUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
    });
    const webpBuffer = Buffer.from(webpRes.data);

    await m.react("🐣");
    await sock.sendMessage(
      m.chat,
      {
        sticker: webpBuffer,
        contextInfo: saluranCtx(),
      },
      { quoted: m },
    );
  } catch (error) {
    await m.react("❌");
    m.reply(novaWrap("emojitoanimasi", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
