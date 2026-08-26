// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "kickall",
  alias: ["kickall", "kickall", "bersihkan", "clear"],
  category: "group",
  description: "Kick semua member grup kecuali admin",
  usage: ".kickall",
  example: ".kickall",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const text =
      claraWrap("Kick All", ["│ ❏ Status: *ʙᴇʀʜᴀꜱɪʟ*",
        "│ ❏ Semua member non-admin telah dikick."].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("kickall", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ ❏ Status: *ɢᴀɢᴀʟ*`,
        `│ ❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "kickall");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
