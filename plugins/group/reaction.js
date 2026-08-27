// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import {  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const emoji = m.text?.trim();

    if (!emoji) {
      const text =
        novaCaption({
  emoji: "👥",
  name: "reaction",
  description: "Beri reaksi ke pesan",
  usage: `$prefixreaction <emoji>`,
  example: `$prefixreaction 🔥`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "reaction");
      return { handled: true };
    }

    const text =
      claraWrap("Reaction", [`│ Emoji: *${emoji}*`,
        "│ Status: *ᴛᴇʀᴋɪʀɪᴍ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}reaction <emoji> untuk reaksi lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("reaction", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`│ Status: *ɢᴀɢᴀʟ*`,
        `│ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply( text, "reaction");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
