import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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
      let msg = `╭─「 ✦ ALCHEMIST RECIPES ✦ 」\n`;
      msg += `│ Daftar Resep Potion & Bahan:\n│\n`;
      for (const [key, item] of Object.entries(RECIPES)) {
        msg += `│ 🧪 *${item.name}* (\`${key}\`)\n`;
        msg += `│   • Bahan: ${item.desc}\n`;
        msg += `│   • Efek: ${item.effect}\n│\n`;
      }
      msg += `│ Cara Meracik:\n`;
      msg += `│ ${m.prefix}alchemist brew <nama_potion>\n`;
      msg += `╰────  •  ────`;
      await m.react('🐣');
      return m.reply(msg);
    }

    if (subCmd === "inventory" || subCmd === "inv") {
      let msg = `╭─「 ✦ ALCHEMIST INVENTORY ✦ 」\n`;
      msg += `│ 💰 Gold: ${data.gold || 0}\n│\n`;
      msg += `│ 🌿 *Bahan Herbal & Material:*\n`;
      msg += `│   • Herb: ${data.materials.herb || 0}\n`;
      msg += `│   • Water: ${data.materials.water || 0}\n`;
      msg += `│   • Crystal: ${data.materials.crystal || 0}\n`;
      msg += `│   • Mushroom: ${data.materials.mushroom || 0}\n`;
      msg += `│   • Snake Venom: ${data.materials.snake_venom || 0}\n│\n`;
      msg += `│ 🧪 *Hasil Ramuan (Potions):*\n`;
      msg += `│   • Health Potion: ${data.potions.health_potion || 0}\n`;
      msg += `│   • Mana Potion: ${data.potions.mana_potion || 0}\n`;
      msg += `│   • Stamina Potion: ${data.potions.stamina_potion || 0}\n`;
      msg += `│   • Antidote: ${data.potions.antidote || 0}\n`;
      msg += `╰────  •  ────`;
      await m.react('🐣');
      return m.reply(msg);
    }

    if (subCmd === "brew" || subCmd === "racik") {
      const potionKey = (m.args[1] || "").toLowerCase();
      const recipe = RECIPES[potionKey];

      if (!recipe) {
        await m.react('❌');
        return m.reply(
          claraWrap(
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
          claraWrap(
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
            claraWrap(
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

      let msg = `╭─「 ✦ BREWING SUCCESS ✦ 」\n`;
      msg += `│ ⚗️ Berhasil meracik *${recipe.name}*!\n`;
      msg += `│  \n`;
      msg += `│ 💰 Biaya: -${recipe.gold} Gold\n`;
      msg += `│ ✨ Efek: ${recipe.effect}\n`;
      msg += `│ 🧪 Total Potion: ${data.potions[potionKey]}\n`;
      msg += `╰────  •  ────`;

      await m.react('🐣');
      return m.reply(msg);
    }

    // Default help guide
    await m.react('❌');
    return m.reply(
      claraWrap(
        "alchemist",
        `Gunakan perintah berikut:\n\n• ${m.prefix}alchemist list — Lihat resep ramuan\n• ${m.prefix}alchemist brew <potion> — Racik ramuan\n• ${m.prefix}alchemist inventory — Cek bahan & potion`,
        "guide"
      )
    );
  } catch (err) {
    console.error("alchemist error:", err);
    await m.react('❌');
    return m.reply(claraWrap("alchemist", err.message || "Terjadi kesalahan pada sistem Alchemist.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
