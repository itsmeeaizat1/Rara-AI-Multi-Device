import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";
// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA

import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "qrcode",
  alias: ["qrcode"],
  category: "tools",
  description: "Buat QR code dari teks/link",
  usage: ".qrcode <teks>",
  example: ".qrcode https://wa.me/628xxxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = m.text?.trim();

    if (!text) {
      const out =
        raraCaption({
  emoji: "🛠️",
  name: "qrcode",
  description: "Buat QR code dari teks/link",
  usage: `${prefix}qrcode <teks>`,
  example: `${prefix}qrcode https://wa.me/628xxxx`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(out);
      return { handled: true };
    }

    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(text)}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Gagal generate QR");

    const buffer = Buffer.from(await res.arrayBuffer());

    let card = "";
    try {
      const info = await probeBuffer(buffer);
      card = mediaResultCard({
        header: "qrcode",
        type: "gambar",
        request: [["Data", String(text).slice(0, 80)]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
    } catch { /* best-effort */ }
    await sock.sendMessage(m.chat, {
      image: buffer,
      caption: (card || `QR Code untuk: ${text}`),
    }, { quoted: m });

    const out =
      raraWrap("QR Code", [`Text: *${text}*`,
        "Format: *png*",
        "Status: *berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}qrcode <teks> untuk buat QR lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.react("🐣");
    await m.reply(out);
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("Tools", "Gagal nih, coba lagi ya");

    await m.reply(raraWrap("qrcode", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
