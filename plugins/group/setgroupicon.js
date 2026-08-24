// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setgroupicon",
  alias: ["setgroupicon", "gantiicon", "gcicon", "setgicon"],
  category: "group",
  description: "Ganti icon/emoji grup",
  usage: ".setgroupicon <emoji>",
  example: ".setgroupicon 🎮",
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
    const icon = m.text?.trim();

    if (!icon) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}setgroupicon <emoji>*`,
          `  ┊  ➶ Contoh: *${prefix}setgroupicon 🎮*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "setgroupicon");
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { subject: icon });

    const text =
      claraWrap("Set Group Icon", [`  ┊  ➶ Icon Baru: *${icon}*`,
        `  ┊  ➶ Group: *${m.chat}*`,
        "  ┊  ➶ Status: *SUCCESS*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setgroupicon", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "setgroupicon");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
