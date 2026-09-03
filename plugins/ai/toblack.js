// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { uploadImage } from "../../src/lib/nova-uploader.js";
import { f } from "../../src/lib/nova-http.js";
import te from "../../src/lib/nova-error.js";
import { live3d } from "../../src/scraper/seaart.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "toblack",
  alias: ["toblack"],
  category: 'ai image',
  description: "Ubah gambar ke skin tone lebih gelap",
  usage: ".toblack (reply gambar)",
  example: ".toblack",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!isImage) {
    return m.reply(claraWrap("Black sTyle", `Kirim/reply gambar\n\n\`${m.prefix}toblack\``), "toblack");
  }

  const PROMPT = `Transform skin tone to a darker complexion, maintain facial features, realistic shadows, high detail, natural skin texture, no distortion`;

  try {
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }

    if (!buffer) {
      return m.reply(claraWrap("toblack", `❌ Gagal mendownload gambar`));
    }
    const result = await live3d(buffer, PROMPT);
    await sock.sendMedia(m.chat, result.image, null, m, {
      type: "image",
    });
  } catch (error) {
    console.log(error);
    m.reply(claraWrap("toblack", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
