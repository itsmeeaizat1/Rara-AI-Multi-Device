// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

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
      return m.reply(novaWrap("qr", `Masukkan teks atau URL untuk dibuatkan QR Code!\n\nContoh: ${m.prefix}qr https://google.com`, "guide"));
    }

    await m.react("🕒");

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;

    const res = await axios.get(qrUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
    });

    const buffer = Buffer.from(res.data);

    await m.react("🐣");

    return await sock.sendMessage(
      m.chat,
      {
        image: buffer,
        caption: `✅ *Qr code generated*\n\nData: ${text}`,
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("qr error:", err);
    await m.react("❌");
    return m.reply(novaWrap("qr", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
