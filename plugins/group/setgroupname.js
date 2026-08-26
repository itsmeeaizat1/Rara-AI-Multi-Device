// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setgroupname",
  alias: ["setgroupname"],
  category: "group",
  description: "Ganti nama grup",
  usage: ".setgroupname <nama baru>",
  example: ".setgroupname Grup RPG Nova",
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
    const name = m.text?.trim();

    if (!name) {
      const text =
        claraWrap("Cara Pakai", [`│ ❏ Penggunaan: *${prefix}setgroupname <nama>*`,
          `│ ❏ Contoh: *${prefix}setgroupname Grup RPG Nova*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "setgroupname");
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { subject: name });

    const text =
      claraWrap("Set Group Name", [`│ ❏ Nama Baru: *${name}*`,
        `│ ❏ Group: *${m.chat}*`,
        "│ ❏ Status: *ꜱᴜᴄᴄᴇꜱꜱ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setgroupname", text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "setgroupname");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
