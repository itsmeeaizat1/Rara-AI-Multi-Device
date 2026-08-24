// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "clone",
  alias: ["clone", "ganti", "clonepp", "gantipp"],
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
  try {
    const prefix = botConfig.command?.prefix || ".";

    if (!m.isGroup) {
      const text =
        claraWrap("Clone", ["  ┊  ➶ Perintah ini hanya untuk grup."].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("clone", text));
      return { handled: true };
    }

    const picture = await sock.profilePictureUrl(m.chat, "image").catch(() => null);

    if (!picture) {
      const text =
        claraWrap("Clone", ["  ┊  ➶ Grup ini belum memiliki foto profil."].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "clone");
      return { handled: true };
    }

    const res = await fetch(picture);
    const buffer = Buffer.from(await res.arrayBuffer());

    await sock.sendMessage(m.chat, {
      image: buffer,
      caption: "Clone foto profil grup berhasil.",
    });

    const text =
      claraWrap("Clone", [`  ┊  ➶ Group: *${m.chat}*`,
        "  ┊  ➶ Status: *SUCCESS*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("clone", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "clone");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
