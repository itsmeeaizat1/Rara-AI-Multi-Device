// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fetch from "node-fetch";
import { downloadMediaMessage, getContentType } from "rara";
import te from "../../src/lib/rara-error.js";
import { uploadToCatbox } from "../../src/lib/rara-uploader.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "gura",
  alias: ["gura"],
  category: "maker",
  description: "Bikin efek canvas gura dari fotomu",
  usage: ".gura (reply/kirim foto)",
  example: ".gura",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let media = null;

  if (m.quoted?.message) {
    const type = getContentType(m.quoted.message);
    if (!type || type !== "imageMessage") {
      return m.reply(raraWrap("Gura", "⚠️ Kak, tolong reply ke pesan gambar ya!"));
    }
    media = await downloadMediaMessage(m.quoted, "buffer", {});
  } else if (m.message) {
    const type = getContentType(m.message);
    if (!type || type !== "imageMessage") {
      return m.reply(`*Gura Canvas*\n\nKirim atau reply foto dengan perintah \`${m.prefix}gura\` untuk memberikan efek Gura!`);
    }
    media = await downloadMediaMessage(m, "buffer", {});
  }

  if (!media) return m.reply(raraError("Gura", "Gagal baca media nih, coba lagi ya"));
  await m.react("🕒");
  try {
    const imgUrl = await uploadToCatbox(media);

    const apiUrl = `https://api.nexray.eu.cc/canvas/gura?url=${encodeURIComponent(imgUrl)}`;
    const res = await fetch(apiUrl);
    
    if (!res.ok) throw new Error("API Nexray error");
    
    const buffer = Buffer.from(await res.arrayBuffer());

    await m.react("🐣");
    await sock.sendMessage(m.chat, { image: buffer }, { quoted: m });
    await m.reply(mediaInfoCaption({ header: "Gura", fields: [
      { label: "Efek", value: "Gura Canvas" }, { label: "Hasil", value: "Gambar" },
      { label: "Ukuran", value: (buffer.length / 1024).toFixed(1) + " KB" },
    ] }));
  } catch (err) {
    await m.react("❌");
    m.reply(raraWrap("gura", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
