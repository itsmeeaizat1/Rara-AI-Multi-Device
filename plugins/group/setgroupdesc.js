// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setgroupdesc",
  alias: ["setgroupdesc"],
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    const desc = m.text?.trim();

    if (!desc) {
      await m.reply(novaNoInput("SetGroupDesc", "Masukkan deskripsi baru untuk grup ini", `${prefix}setgroupdesc Grup RPG Nova Official`));
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { description: desc });

    const text =
      claraWrap("Set Group Desc", [`│ Deskripsi Baru: *${desc}*`,
        `│ Group: *${m.chat}*`,
        "│ Status: *ꜱᴜᴄᴄᴇꜱꜱ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setgroupdesc", text));
  } catch (error) {
    await m.reply(novaError("SetGroupDesc", `Gagal ganti deskripsi grup: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
