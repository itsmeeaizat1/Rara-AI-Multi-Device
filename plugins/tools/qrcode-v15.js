// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

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
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const text = m.text?.trim();

    if (!text) {
      const out =
        novaCaption({
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

    await sock.sendMessage(m.chat, {
      image: buffer,
      caption: `QR Code untuk: ${text}`,
    });

    const out =
      claraWrap("QR Code", [`Text: *${text}*`,
        "Format: *ᴘɴɢ*",
        "Status: *ʙᴇʀʜᴀꜱɪʟ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}qrcode <teks> untuk buat QR lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply(claraWrap("qrcode", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
