// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA

import { tipText, raraWrap, raraCaption, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "setgroupicon",
  alias: ["setgroupicon"],
  category: "group",
  description: "Ganti icon/emoji grup",
  usage: ".setgroupicon <emoji>",
  example: ".setgroupicon 🎮",
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
    const icon = m.text?.trim();

    if (!icon) {
      await m.reply(raraNoInput("SetGroupIcon", "Masukkan emoji/icon baru untuk grup ini", `${prefix}setgroupicon 🎮`));
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { subject: icon });

    const text =
      raraWrap("Set Group Icon", [`Icon Baru: *${icon}*`,
        `Group: *${m.chat}*`,
        "Status: *success*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "setgroupicon");
  } catch (error) {
    await m.reply(raraError("SetGroupIcon", `Gagal ganti icon grup: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
