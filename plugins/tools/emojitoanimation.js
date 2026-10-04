// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-RaraMD";

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
    return m.reply(raraWrap("emojitoanimasi", [
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
      return m.reply(raraWrap("emojitoanimasi", "❌ *gagal*\n\nEmoji tidak ditemukan atau API error"));
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
    // sticker gak bisa caption → kartu dikirim sebagai teks setelahnya
    try {
      const info = await probeBuffer(webpBuffer);
      const card = mediaResultCard({
        header: "emojitoanimasi",
        type: "stiker",
        request: [["Emoji", String(emoji || "").slice(0, 40)]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
      if (card) await m.reply(card);
    } catch { /* best-effort */ }
  } catch (error) {
    await m.react("❌");
    m.reply(raraWrap("emojitoanimasi", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
