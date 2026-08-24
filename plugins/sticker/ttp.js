import axios from "axios";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ttp",
  alias: ["texttopicture"],
  category: "maker",
  description: "Membuat stiker keren dari teks",
  usage: ".ttp <teks>",
  example: ".ttp Hai Cantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ") || m.text?.trim();

  if (!text) {
    { const __navText = "❌ *Waduh, teksnya mana nih?*\n\nKamu harus memasukkan teks yang ingin dijadikan stiker.\n\nContoh: `.ttp Hai Cantik`"; return await m.reply( __navText, "ttp"); };
  }

  await m.react("🐣");

  try {
    const apiUrl = `https://api.nexray.eu.cc/maker/ttp?text=${encodeURIComponent(text)}`;

    const res = await axios.get(apiUrl, {
      responseType: "arraybuffer",
      timeout: 30000
    });

    const imageBuffer = Buffer.from(res.data);

    await sock.sendImageAsSticker(m.chat, imageBuffer, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });

    await m.react("✅");

  } catch (err) {
    console.error("[TTP Maker]", err.message);
    m.reply(claraWrap("ttp", "😔 *Terjadi masalah di sistem kami.* \n\nSistem gagal menghubungi server pembuat stiker. Silakan coba beberapa saat lagi ya."));
  }
}

export { pluginConfig as config, handler };
