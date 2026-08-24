// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setgroupdesc",
  alias: ["setgroupdesc", "gantidesc", "gcdesc", "setgdesc"],
  category: "group",
  description: "Ganti deskripsi grup",
  usage: ".setgroupdesc <deskripsi>",
  example: ".setgroupdesc Grup RPG Nova Official",
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
    const desc = m.text?.trim();

    if (!desc) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}setgroupdesc <deskripsi>*`,
          `  ┊  ➶ Contoh: *${prefix}setgroupdesc Grup RPG Nova*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "setgroupdesc");
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { description: desc });

    const text =
      claraWrap("Set Group Desc", [`  ┊  ➶ Deskripsi Baru: *${desc}*`,
        `  ┊  ➶ Group: *${m.chat}*`,
        "  ┊  ➶ Status: *ꜱᴜᴄᴄᴇꜱꜱ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setgroupdesc", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *ɢᴀɢᴀʟ*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "setgroupdesc");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
