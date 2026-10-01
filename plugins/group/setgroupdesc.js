// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText, raraWrap, raraCaption, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "setgroupdesc",
  alias: ["setgroupdesc"],
  category: "group",
  description: "Ganti deskripsi grup",
  usage: ".setgroupdesc <deskripsi>",
  example: ".setgroupdesc Grup RPG Rara Official",
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
      await m.reply(raraNoInput("SetGroupDesc", "Masukkan deskripsi baru untuk grup ini", `${prefix}setgroupdesc Grup RPG Rara Official`));
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { description: desc });

    const text =
      raraWrap("Set Group Desc", [`Deskripsi Baru: *${desc}*`,
        `Group: *${m.chat}*`,
        "Status: *success*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "setgroupdesc");
  } catch (error) {
    await m.reply(raraError("SetGroupDesc", `Gagal ganti deskripsi grup: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
