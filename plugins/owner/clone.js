// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput, tipText,  novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "clone",
  alias: ["clone"],
  category: "owner",
  description: "Clone foto profil grup (owner only)",
  usage: ".clone",
  example: ".clone",
  isOwner: true,
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

    if (!m.isGroup) {
      const text =
        novaWrap("Clone", ["Perintah ini hanya untuk grup."].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "clone");
      return { handled: true };
    }

    await m.react("🕒");
    const picture = await sock.profilePictureUrl(m.chat, "image").catch(() => null);

    if (!picture) {
      const text =
        novaWrap("Clone", ["Grup ini belum memiliki foto profil."].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "clone");
      return { handled: true };
    }

    const res = await fetch(picture);
    const buffer = Buffer.from(await res.arrayBuffer());

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      image: buffer,
      caption: "Clone foto profil grup berhasil.",
    });

    const text =
      novaWrap("Clone", [`Group: *${m.chat}*`,
        "Status: *SUCCESS*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "clone");
  } catch (error) {
    await m.react("❌");
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Owner", "Gagal nih, coba lagi ya");

    await m.reply( text, "clone");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
