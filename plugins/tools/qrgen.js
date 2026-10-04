// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// qrgen.js — QR Code Generator v2 (qrcode npm, local generation)
import QRCode from "qrcode";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "qrgen",
  alias: ["qrgen", "qrcodegen", "qrcreate", "makeqr"],
  category: "tools",
  description: "Generate QR Code dari teks/URL (local, qrcode npm)",
  usage: ".qrgen <teks/url>",
  example: ".qrgen https://google.com\n.qrgen Halo dunia",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim() || m.text?.trim();
    if (!text) {
      return m.reply(raraWrap("qrgen", `Mau buat QR Code dari apa?\n\nContoh:\n${m.prefix}qrgen https://google.com\n${m.prefix}qrgen Halo dunia`, "guide"));
    }

    if (text.length > 1000) {
      return m.reply("❌ Teks terlalu panjang! Maksimal 1000 karakter.");
    }

    await m.react("🕒");

    // Generate QR to buffer
    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: "M",
      type: "png",
      quality: 0.92,
      margin: 2,
      width: 512,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    await m.react("🐣");
    const caption = `✅ *Qr code*

Content: ${text.slice(0, 60)}${text.length > 60 ? "..." : ""}`;
    return await sock.sendMessage(m.chat, { image: buffer, caption });
  } catch (err) {
    console.error("qrgen error:", err);
    await m.react("❌");
    return m.reply(`❌ ${err.message || "Error"}`);
  }
}

export { pluginConfig as config, handler };
