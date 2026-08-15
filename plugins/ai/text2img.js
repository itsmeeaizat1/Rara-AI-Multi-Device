// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { f } from "../../src/lib/nova-http.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "text2imgv2",
  alias: ["aitext2img", "t2i", "txt2imgai"],
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
    return sendReplyWithNav(sock, m, claraWrap("ᴛᴇxᴛ ᴛᴏ ɪᴍᴀɢᴇ", `📿 *ᴛᴇxᴛ ᴛᴏ ɪᴍᴀɢᴇ*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}text2img Buat gambar dari teks\``), "text2img");
  }

  m.react("🕐");

  try {
    const url = `https://firefly.maiku.my.id/api/deepai?apikey=${config.APIkey.firefly}&prompt=${encodeURIComponent(text)}`;
    const data = await axios.get(url);

    const content = data.data.data.output_url;

    m.react("✅");
    await sock.sendMedia(m.chat, content, text, m, {
      type: "image",
    });
  } catch (error) {
    console.error(error);
    m.reply(claraWrap("text2imgv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
