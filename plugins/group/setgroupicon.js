// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { tipText, claraWrap, novaCaption, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const icon = m.text?.trim();

    if (!icon) {
      await m.reply(novaNoInput("SetGroupIcon", "Masukkan emoji/icon baru untuk grup ini", `${prefix}setgroupicon 🎮`));
      return { handled: true };
    }

    await sock.groupMetadataUpdate(m.chat, { subject: icon });

    const text =
      claraWrap("Set Group Icon", [`│ Icon Baru: *${icon}*`,
        `│ Group: *${m.chat}*`,
        "│ Status: *ꜱᴜᴄᴄᴇꜱꜱ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("setgroupicon", text));
  } catch (error) {
    await m.reply(novaError("SetGroupIcon", `Gagal ganti icon grup: ${error.message}`));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
