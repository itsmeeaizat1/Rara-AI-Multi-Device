// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { f } from "../../src/lib/nova-http.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";
import { claraWrap, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "text2imgv2",
  alias: ["text2imgv2", "text2img"],
  category: "ai",
  description: "Buat gambar dari teks",
  usage: ".text2img <teks>",
  example: ".text2img Buat gambar dari teks",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(claraWrap("Text To Image", `📿 *ᴛᴇxᴛ ᴛᴏ ɪᴍᴀɢᴇ*\n\nMasukkan teks\n\n\`Contoh: ${m.prefix}text2img Buat gambar dari teks\``), "text2img");
  }

  m.react("🕒");

  try {
    const url = `https://firefly.maiku.my.id/api/deepai?apikey=${config.APIkey.firefly}&prompt=${encodeURIComponent(text)}`;
    const data = await axios.get(url);

    const content = data.data.data.output_url;

    m.react("🐣");
    const caption = mediaCaption({
      platformIcon: "🎨",
      platformName: "AI Image",
      title: text.slice(0, 60),
      format: "Image",
      method: "Nova AI",
    });
    await sock.sendMessage(m.chat, {
      image: { url: content },
      caption,
    }, { quoted: m });
  } catch (error) {
    console.error(error);
    m.reply(claraWrap("text2imgv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
