// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

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
    const prefix = botConfig.command?.prefix || ".";
  try {
    const name = m.text?.trim();

    if (!name) {
      await m.reply(novaNoInput("SetGroupName", "Masukkan nama baru untuk grup ini", `${prefix}setgroupname Grup RPG Nova`));
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { subject: name });

    const text =
      claraWrap("Set Group Name", [`Nama Baru: *${name}*`,
        `Group: *${m.chat}*`,
        "Status: *ꜱᴜᴄᴄᴇꜱꜱ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "setgroupname");
  } catch (error) {
    await m.reply(novaError("SetGroupName", `Gagal ganti nama grup: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
