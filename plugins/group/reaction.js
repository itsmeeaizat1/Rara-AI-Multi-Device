// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const pluginConfig = {
  name: "reaction",
  alias: ["reaction"],
  category: "group",
  description: "Beri reaksi ke pesan",
  usage: ".reaction <emoji>",
  example: ".reaction 🔥",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const emoji = m.text?.trim();

    if (!emoji) {
      await m.reply(novaNoInput("Reaction", "Masukkan emoji untuk memberi reaksi ke pesan", `${prefix}reaction 🔥`));
      return { handled: true };
    }

    const text =
      claraWrap("Reaction", [`Emoji: *${emoji}*`,
        "Status: *ᴛᴇʀᴋɪʀɪᴍ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}reaction <emoji> untuk reaksi lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("reaction", text));
  } catch (error) {
    await m.reply(novaError("Reaction", `Gagal beri reaksi: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
