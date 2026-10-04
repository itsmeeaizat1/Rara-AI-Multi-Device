// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js"
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";;
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "qr",
  alias: ["qr", "qrcode"],
  category: "tools",
  description: "Membuat QR Code dari teks atau link URL",
  usage: ".qr <teks/url>",
  example: ".qr https://google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args?.join(" ").trim() || (m.quoted && (m.quoted.text || m.quoted.caption));
    if (!text) {
      return m.reply(raraWrap("qr", `Masukkan teks atau URL untuk dibuatkan QR Code!\n\nContoh: ${m.prefix}qr https://google.com`, "guide"));
    }

    await m.react("🕒");

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;

    const res = await axios.get(qrUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
    });

    const buffer = Buffer.from(res.data);

    await m.react("🐣");

    let card = "";
    try {
      const info = await probeBuffer(buffer);
      card = mediaResultCard({
        header: "qr",
        type: "gambar",
        request: [["Data", String(text).slice(0, 80)]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
    } catch { /* best-effort */ }
    return await sock.sendMessage(
      m.chat,
      {
        image: buffer,
        caption: (card || `✅ *Qr code generated*\n\nData: ${text}`),
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("qr error:", err);
    await m.react("❌");
    return m.reply(raraWrap("qr", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
