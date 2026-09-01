// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setgrouptitle",
  alias: ["setgrouptitle"],
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
    const prefix = botConfig.command?.prefix || ".";
  try {
    const title = m.text?.trim();

    if (!title) {
      await m.reply(novaNoInput("SetGroupTitle", "Masukkan title baru untuk grup ini", `${prefix}setgrouptitle RPG Master`));
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { subject: title });

    const text =
      claraWrap("Set Group Title", [`Title Baru: *${title}*`,
        `Group: *${m.chat}*`,
        "Status: *ꜱᴜᴄᴄᴇꜱꜱ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setgrouptitle", text));
  } catch (error) {
    await m.reply(novaError("SetGroupTitle", `Gagal ganti title grup: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
