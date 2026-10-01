// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText, raraWrap, raraCaption, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

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
      await m.reply(raraNoInput("Reaction", "Masukkan emoji untuk memberi reaksi ke pesan", `${prefix}reaction 🔥`));
      return { handled: true };
    }

    const text =
      raraWrap("Reaction", [`Emoji: *${emoji}*`,
        "Status: *terkirim*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}reaction <emoji> untuk reaksi lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "reaction");
  } catch (error) {
    await m.reply(raraError("Reaction", `Gagal beri reaksi: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
