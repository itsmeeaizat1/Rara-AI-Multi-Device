// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setgrouptitle",
  alias: ["setgrouptitle", "gantititle", "gctitle", "setgtitle"],
  category: "group",
  description: "Ganti title grup",
  usage: ".setgrouptitle <title>",
  example: ".setgrouptitle RPG Master",
  isOwner: false,
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
    const title = m.text?.trim();

    if (!title) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}setgrouptitle <title>*`,
          `  ┊  ➶ Contoh: *${prefix}setgrouptitle RPG Master*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "setgrouptitle");
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { subject: title });

    const text =
      claraWrap("Set Group Title", [`  ┊  ➶ Title Baru: *${title}*`,
        `  ┊  ➶ Group: *${m.chat}*`,
        "  ┊  ➶ Status: *SUCCESS*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setgrouptitle", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "setgrouptitle");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
