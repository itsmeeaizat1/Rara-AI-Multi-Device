// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

const pluginConfig = {
  name: "emojitoimage",
  alias: ["emoji2img", "emojiimg", "e2i"],
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
    return m.reply( `🖼️ *ᴇᴍᴏᴊɪ ᴛᴏ ɪᴍᴀɢᴇ*\n\n` +
        `Konversi emoji ke gambar HD\n\n` +
        `*ꜰᴏʀᴍᴀᴛ:*\n` +
        `\`${m.prefix}emojitoimage <emoji> [style]\`\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `\`${m.prefix}emojitoimage 😳 apple\`\n\n` +
        `*ꜱᴛʏʟᴇ ᴛᴇʀꜱᴇᴅɪᴀ:*\n` +
        `${STYLES.join(", ")}`, "emojitoimage");
  }

  const validStyle = STYLES.includes(style) ? style : "apple";

  m.react("🕒");

  try {
    const apiUrl = `https://api.neoxr.eu/api/emoimg?q=${encodeURIComponent(emoji)}&style=${validStyle}&apikey=${NEOXR_APIKEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });

    if (!data?.status || !data?.data?.url) {
      return m.reply(claraWrap("emojitoimage", "❌ *ɢᴀɢᴀʟ*\n\nEmoji tidak ditemukan atau API error"));
    }

    const imgUrl = data.data.url;

    await sock.sendMedia(
      m.chat,
      imgUrl,
      `🖼️ *ᴇᴍᴏᴊɪ ᴛᴏ ɪᴍᴀɢᴇ*\n\nEmoji: ${emoji}\nStyle: ${validStyle}\nCode: ${data.data.code || "-"}`,
      m,
      { type: "image", contextInfo: saluranCtx() },
    );

    m.react("🐣");
  } catch (error) {
    m.reply(claraWrap("emojitoimage", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
