// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import {   separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "achievement",
  alias: ["achieve", "prestasi", "achievement", "medal"],
  category: "game",
  description: "Lihat Achievement RPG kamu",
  usage: ".achievement",
  example: ".achievement",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const unlocked = [
      "First Blood - Kalahkan monster pertama",
      "Rich - Kumpulkan 10.000 Gold",
      "Veteran - Main 30 hari",
    ];

    const locked = [
      "Dragon Slayer - Kalahkan boss naga",
      "Collector - Kumpulkan 50 item",
      "Marathon - Main 100 hari",
    ];

    const text =
      claraWrap("Achievement", [`◦ Unlocked: *${unlocked.length}*`,
        `◦ Locked: *${locked.length}*`,
        `◦ Total: *${unlocked.length + locked.length}*`].join("\n")) +
      "\n\n" +
      claraWrap("Unlocked", unlocked.map((a) => `◦ ${a}`)) +
      "\n\n" +
      claraWrap("Locked", locked.map((a) => `◦ ${a}`)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "achievement");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("achievement", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
