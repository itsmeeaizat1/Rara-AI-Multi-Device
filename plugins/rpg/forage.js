// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Forage — Cari tanaman/herba di alam

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "forage",
  alias: ["forage"],
  aliases: ["forage", "cariherba", "gather"],
  category: "rpg",
  description: "Cari tanaman dan herba di alam",
  usage: ".forage",
  example: ".forage",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 2, isEnabled: true,
};

const FORAGE_ITEMS = [
  { name: "herba", rarity: "common", value: 5 },
  { name: "akar ajaib", rarity: "uncommon", value: 15 },
  { name: "jamur emas", rarity: "rare", value: 50 },
  { name: "bunga langka", rarity: "rare", value: 80 },
  { name: "daun suci", rarity: "epic", value: 200 },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("forage", "RPG belum siap. Ketik .daftar dulu.", "error"));
    if ((rpg.energy || 0) < 5) return m.reply(claraWrap("forage", "Energi tidak cukup. Butuh 5 energi.", "info"));

    await m.react("🕒");
    const item = FORAGE_ITEMS[Math.floor(Math.random() * FORAGE_ITEMS.length)];
    rpg.energy = (rpg.energy || 0) - 5;
    rpg.inventory = rpg.inventory || {};
    rpg.inventory[item.name] = (rpg.inventory[item.name] || 0) + 1;
    rpg.exp = (rpg.exp || 0) + 10;
    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply("╭─「 ✦ ғᴏʀᴀɢᴇ ✦ 」\n│ 🌿 Kamu mencari di alam...\n│ 🎁 Mendapat: *" + item.name + "* (" + item.rarity + ")\n│ ⭐ +10 EXP\n│ ⚡ Sisa energi: " + rpg.energy + "\n╰────  •  ────");
  } catch (e) {
    console.error("forage error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("forage", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
