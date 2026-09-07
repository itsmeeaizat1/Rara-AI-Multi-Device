import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { rpgSleep } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "alchemist",
  alias: ["alchemist", "ramuan", "racik"],
  category: "rpg",
  description: "Sistem Alchemist untuk meracik potion dari bahan-bahan herbal",
  usage: ".alchemist <list|brew|inventory>",
  example: ".alchemist brew health_potion",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const RECIPES = {
  health_potion: {
    id: "health_potion",
    name: "Health Potion",
    materials: { herb: 5, water: 2 },
    gold: 50,
    effect: "Heal 100 HP",
    desc: "5 Herb + 2 Water (Biaya: 50 Gold)",
  },
  mana_potion: {
    id: "mana_potion",
    name: "Mana Potion",
    materials: { herb: 3, crystal: 1 },
    gold: 75,
    effect: "Mana +50",
    desc: "3 Herb + 1 Crystal (Biaya: 75 Gold)",
  },
  stamina_potion: {
    id: "stamina_potion",
    name: "Stamina Potion",
    materials: { herb: 4, mushroom: 1 },
    gold: 60,
    effect: "Energi +30",
    desc: "4 Herb + 1 Mushroom (Biaya: 60 Gold)",
  },
  antidote: {
    id: "antidote",
    name: "Antidote",
    materials: { herb: 2, snake_venom: 1 },
    gold: 40,
    effect: "Penawar Racun / Cure Poison",
    desc: "2 Herb + 1 Snake Venom (Biaya: 40 Gold)",
  },
};

async function handler(m, { sock }) {
  try {
    await m.react('🕒');
    const db = await getDatabase();
    const sender = m.sender;
    const subCmd = (m.args[0] || "").toLowerCase();

    // Load or initialize alchemist data
    let data = (await db.getPlayerData?.(sender, "alchemist")) || {
      gold: 1000,
      materials: { herb: 10, water: 5, crystal: 3, mushroom: 3, snake_venom: 2 },
      potions: { health_potion: 0, mana_potion: 0, stamina_potion: 0, antidote: 0 },
    };

    if (!data.materials) {
      data.materials = { herb: 10, water: 5, crystal: 3, mushroom: 3, snake_venom: 2 };
    }
    if (!data.potions) {
      data.potions = { health_potion: 0, mana_potion: 0, stamina_potion: 0, antidote: 0 };
    }

    if (subCmd === "list") {
      await m.react('🐣');
      return m.reply(novaRpgBox("alchemist", [
        "Daftar resep potion :",
        ...Object.entries(RECIPES).flatMap(([key, item]) => [
          `${item.name} (${key})`,
          `Bahan : ${item.desc}`,
          `Efek : ${item.effect}`,
        ]),
        "---",
        `📌 ${m.prefix}alchemist brew <nama_potion>`,
      ], "info"));
    }

    if (subCmd === "inventory" || subCmd === "inv") {
      await m.react('🐣');
      return m.reply(novaRpgBox("alchemist", [
        `Gold : ${data.gold || 0}`,
        "---",
        "Bahan herbal & material :",
        `Herb : ${data.materials.herb || 0}`,
        `Water : ${data.materials.water || 0}`,
        `Crystal : ${data.materials.crystal || 0}`,
        `Mushroom : ${data.materials.mushroom || 0}`,
        `Snake venom : ${data.materials.snake_venom || 0}`,
        "---",
        "Ramuan (potions) :",
        `Health potion : ${data.potions.health_potion || 0}`,
        `Mana potion : ${data.potions.mana_potion || 0}`,
        `Stamina potion : ${data.potions.stamina_potion || 0}`,
        `Antidote : ${data.potions.antidote || 0}`,
      ], "info"));
    }

    if (subCmd === "brew" || subCmd === "racik") {
      const potionKey = (m.args[1] || "").toLowerCase();
      const recipe = RECIPES[potionKey];

      if (!recipe) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "alchemist",
            `Potion tidak ditemukan!\n\nResep tersedia: health_potion, mana_potion, stamina_potion, antidote.\n\nGunakan: ${m.prefix}alchemist list`,
            "error"
          )
        );
      }

      // Check gold
      if ((data.gold || 0) < recipe.gold) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "alchemist",
            `Gold kamu tidak cukup untuk meracik ${recipe.name}!\n\nBiaya: ${recipe.gold} Gold | Punya: ${data.gold || 0} Gold`,
            "error"
          )
        );
      }

      // Check materials
      for (const [mat, required] of Object.entries(recipe.materials)) {
        if ((data.materials[mat] || 0) < required) {
          await m.react('❌');
          return m.reply(
            novaRpgBox(
              "alchemist",
              `Bahan tidak cukup untuk meracik ${recipe.name}!\n\nMembutuhkan ${required} ${mat}, tapi kamu hanya punya ${data.materials[mat] || 0}.`,
              "error"
            )
          );
        }
      }

      // Deduct materials & gold
      data.gold -= recipe.gold;
      for (const [mat, required] of Object.entries(recipe.materials)) {
        data.materials[mat] -= required;
      }

      // Simulate 3 seconds brewing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      data.potions[potionKey] = (data.potions[potionKey] || 0) + 1;
      await db.setPlayerData?.(sender, "alchemist", data);

      await m.react('🐣');
      return m.reply(novaGameBox({
        title: "alchemist", icon: "⚗️",
        flavor: "⚗️ *RAMUAN JADI!*",
        body: [
          `│ • Ramuan : ${recipe.name}`,
          `│ • 💰 Biaya : -${recipe.gold} Gold`,
          `│ • ✨ Efek : ${recipe.effect}`,
          `│ • 🧪 Total potion : ${data.potions[potionKey]}`,
        ].join("\n"),
        cta: gameCTA("alchemist"),
      }));
    }

    // Default help guide
    await m.react('❌');
    return m.reply(
      novaRpgBox(
        "alchemist",
        `Gunakan perintah berikut:\n\n• ${m.prefix}alchemist list — Lihat resep ramuan\n• ${m.prefix}alchemist brew <potion> — Racik ramuan\n• ${m.prefix}alchemist inventory — Cek bahan & potion`,
        "guide"
      )
    );
  } catch (err) {
    console.error("alchemist error:", err);
    await m.react('❌');
    return m.reply(novaRpgBox("alchemist", err.message || "Terjadi kesalahan pada sistem Alchemist.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
