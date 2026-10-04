// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// animetoreal — gambar ANIME → versi REALISTIS (kebalikan .jadianime)
// Engine: KuroNeko animetoreal (live3d.io). Key: apikeys.json kuroneko.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { animeToReal, uploadToUguu } from "../../src/scraper/kuroneko.js";

const pluginConfig = {
  name: "animetoreal",
  alias: ["animejadiasli", "toreal", "realify"],
  category: "ai",
  description: "Gambar anime jadi versi realistis — kebalikan jadianime!",
  usage: ".animetoreal (reply/kirim gambar anime)",
  example: ".animetoreal (reply gambar anime/waifu)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted?.type === "imageMessage"));

  if (!isImage) {
    return m.reply(raraWrap("animetoreal", `Reply/kirim gambar ANIME yang mau dijadiin versi realistis!\n\nContoh: ${m.prefix}animetoreal (reply gambar waifu)`, "guide"));
  }
  try {
    await m.react("🕒");
    let buffer;
    if (m.quoted && m.quoted.isMedia) buffer = await m.quoted.download();
    else if (m.isMedia) buffer = await m.download();
    if (!buffer) throw new Error("gagal download gambar");

    const imageUrl = await uploadToUguu(buffer, "img.jpg");
    const resultUrl = await animeToReal(imageUrl);

    const axios = (await import("axios")).default;
    const res = await axios.get(resultUrl, { responseType: "arraybuffer", timeout: 60000 });
    const buf = Buffer.from(res.data);
    if (!buf || buf.length < 5000) throw new Error("hasil kosong");

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: buf,
      caption: raraWrap("animetoreal", `✨ Anime → versi realistis!`),
    }, { quoted: m });
  } catch (err) {
    console.error("animetoreal error:", err);
    await m.react("❌");
    return m.reply(raraWrap("animetoreal", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
