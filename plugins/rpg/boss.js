// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "boss",
  alias: ["bossbattle", "raid", "attackboss", "bossfight"],
  category: "game",
  description: "Serang boss bersama-sama di grup",
  usage: ".boss",
  example: ".boss",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 300,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Placeholder: ganti dengan logic boss RPG kamu
    const bossHp = 5000;
    const damage = Math.floor(Math.random() * 300) + 50;
    const remaining = Math.max(0, bossHp - damage);
    const killed = remaining <= 0;

    const text =
      claraWrap("Boss Battle", ["◦ Boss: *Raksasa Kegelapan*",
        `◦ Damage: *-${damage}*`,
        `◦ Sisa HP: *${killed ? "0" : remaining}*`,
        `◦ Status: *${killed ? "Dikalahkan" : "Masih bertahan"}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}boss untuk serang lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "boss");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("boss", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
