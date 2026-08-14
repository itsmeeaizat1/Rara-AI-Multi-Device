import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { alyaHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hunt",
  alias: ["hunting", "mburu", "monster", "hunt"],
  category: "game",
  description: "Berburu monster untuk dapat gold dan exp",
  usage: ".hunt",
  example: ".hunt",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Placeholder: ganti dengan logic hunt RPG kamu
    const monsters = [
      { name: "Slime", hp: 50, gold: 30, exp: 20 },
      { name: "Goblin", hp: 80, gold: 50, exp: 35 },
      { name: "Wolf", hp: 120, gold: 80, exp: 50 },
      { name: "Orc", hp: 200, gold: 150, exp: 80 },
      { name: "Dragon", hp: 500, gold: 500, exp: 200 },
    ];

    const monster = monsters[Math.floor(Math.random() * monsters.length)];
    const killed = Math.random() < 0.7;

    const title = killed ? `Kamu berhasil membunuh ${monster.name}!` : `Kamu melarikan diri dari ${monster.name}...`;
    const emoji = killed ? "⚔️" : "🏃";

    const text =
      claraWrap("Hunt", "⚔️") +
      "\n\n" +
      claraWrap("ʜᴀꜱɪʟ", [
        `◦ Monster: *${monster.name}*`,
        `◦ HP: *${monster.hp}*`,
        `◦ Gold: *${killed ? "+" + monster.gold : "0"}*`,
        `◦ Exp: *${killed ? "+" + monster.exp : "0"}*`,
        `◦ Status: *${killed ? "DIBUNUH" : "LARIIIII"}*`,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}hunt untuk berburu lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "hunt");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("hunt", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
