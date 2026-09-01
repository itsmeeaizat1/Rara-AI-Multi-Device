// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hidetag",
  alias: ["hidetag"],
  category: "group",
  description: "Tag semua member grup",
  usage: ".hidetag <teks>",
  example: ".hidetag Hai semua!",
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
    const text = m.text?.trim();

    if (!text) {
      const reply =
        novaCaption({
  emoji: "👥",
  name: "hidetag",
  description: "Tag semua member grup",
  usage: `${prefix}hidetag <teks>`,
  example: `${prefix}hidetag Hai semua!`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( reply, "hidetag");
      return { handled: true };
    }

    const info =
      claraWrap("Hidetag", [`Pesan: *${text}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(info);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const reply =
    await m.reply(novaError("Hidetag", "Gagal nih, coba lagi ya"));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
