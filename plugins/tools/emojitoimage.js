// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-RaraMD";

const pluginConfig = {
  name: "emojitoimage",
  alias: ["emojitoimage"],
  category: "tools",
  description: "Konversi emoji ke gambar HD (style Apple)",
  usage: ".emojitoimage <emoji> [style]",
  example: ".emojitoimage 😳 apple",
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const STYLES = [
  "apple",
  "google",
  "microsoft",
  "samsung",
  "whatsapp",
  "twitter",
  "facebook",
];

async function handler(m, { sock }) {
  const args = m.args || [];
  const emoji = args[0]?.trim();
  const style = args[1]?.toLowerCase() || "apple";

  if (!emoji) {
    return m.reply(raraWrap("emojitoimage", [
      `Konversi emoji ke gambar HD.`,
      ``,
      `📌 Format: ${m.prefix}emojitoimage <emoji> [style]`,
      `💡 Contoh: ${m.prefix}emojitoimage 😳 apple`,
      ``,
      `Style tersedia: ${STYLES.join(", ")}`,
    ]));
  }

  const validStyle = STYLES.includes(style) ? style : "apple";
  try {
    await m.react("🕒");
    const apiUrl = `https://api.neoxr.eu/api/emoimg?q=${encodeURIComponent(emoji)}&style=${validStyle}&apikey=${NEOXR_APIKEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });

    if (!data?.status || !data?.data?.url) {
      await m.react("🐣");
      return m.reply(raraWrap("emojitoimage", "❌ *gagal*\n\nEmoji tidak ditemukan atau API error"));
    }

    const imgUrl = data.data.url;

    await sock.sendMedia(
      m.chat,
      imgUrl,
      `🖼️ *emoji to image*\n\nEmoji: ${emoji}\nStyle: ${validStyle}\nCode: ${data.data.code || "-"}`,
      m,
      { type: "image", contextInfo: saluranCtx() },
    );
  } catch (error) {
    await m.react("❌");
    m.reply(raraWrap("emojitoimage", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
