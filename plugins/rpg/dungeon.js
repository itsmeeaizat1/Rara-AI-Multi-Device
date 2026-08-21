// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "dungeon",
  alias: ["dungeon", "instance", "raidv2", "dungeonraid"],
  category: "game",
  description: "Masuk dungeon untuk dapat loot langka",
  usage: ".dungeon",
  example: ".dungeon",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 600,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Placeholder: ganti dengan logic dungeon RPG kamu
    const dungeons = [
      { name: "Forest Dungeon", difficulty: "Easy", loot: "Wooden Sword" },
      { name: "Fire Cave", difficulty: "Medium", loot: "Fire Ring" },
      { name: "Ice Castle", difficulty: "Hard", loot: "Ice Armor" },
      { name: "Dark Abyss", difficulty: "Hell", loot: "Dark Blade" },
    ];

    const dungeon = dungeons[Math.floor(Math.random() * dungeons.length)];
    const cleared = Math.random() < 0.6;

    const text =
      claraWrap("Dungeon", [`╎❏ Dungeon: *${dungeon.name}*`,
        `╎❏ Difficulty: *${dungeon.difficulty}*`,
        `╎❏ Loot: *${cleared ? dungeon.loot : "Tidak ada"}*`,
        `╎❏ Status: *${cleared ? "CLEARED" : "FAILED"}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}dungeon untuk masuk lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "dungeon");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`╎❏ Status: *Gagal*`,
        `╎❏ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("dungeon", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
