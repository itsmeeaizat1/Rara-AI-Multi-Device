// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// witchcauldron.js — Witch's Cauldron (combine materials for special items)
import { getDatabase } from "../../src/lib/rara-database.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "witchcauldron",
  alias: ["witchcauldron", "cauldron", "cauldronrpg", "witch"],
  category: "rpg",
  description: "Witch's Cauldron — kombinasi material untuk item spesial",
  usage: ".witchcauldron (list recipe)\n.witchcauldron brew <recipe>",
  example: ".witchcauldron brew Potion of Strength",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 3, isEnabled: true,
};

const RECIPES = [
  {
    name: "Potion of Strength", emoji: "💪",
    materials: { herb: 3, crystal: 2, dragon_scale: 1 },
    goldCost: 1000,
    effect: "+20 ATK permanent",
    apply: async (db, sender) => { try { await db.addAtk?.(sender, 20); } catch {} },
  },
  {
    name: "Elixir of Life", emoji: "🧪",
    materials: { herb: 5, phoenix_feather: 3 },
    goldCost: 2000,
    effect: "Full heal +500 max HP",
    apply: async (db, sender) => { try { await db.addHP?.(sender, 500); await db.setHP?.(sender, 999); } catch {} },
  },
  {
    name: "Scroll of Fortune", emoji: "📜",
    materials: { paper: 10, crystal: 5 },
    goldCost: 1500,
    effect: "+50% gold for 1 hour",
    apply: async (db, sender) => { try { await db.setPlayerData?.(sender, "buffs", { goldBoost: Date.now() + 3600000 }); } catch {} },
  },
  {
    name: "Ring of Power", emoji: "💍",
    materials: { gold_ore: 3, crystal: 2, diamond: 1 },
    goldCost: 5000,
    effect: "+30 ATK permanent",
    apply: async (db, sender) => { try { await db.addAtk?.(sender, 30); } catch {} },
  },
  {
    name: "Dark Vial", emoji: "🖤",
    materials: { snake_venom: 5, crystal: 3 },
    goldCost: 3000,
    effect: "-50% enemy DEF (debuff)",
    apply: async (db, sender) => { try { await db.setPlayerData?.(sender, "buffs", { enemyDefReduce: Date.now() + 3600000 }); } catch {} },
  },
];

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    if (subCmd === "brew" || subCmd === "buat" || subCmd === "masak") {
      const recipeName = m.args.slice(1).join(" ").trim();
      if (!recipeName) {
        return m.reply(raraRpgBox("witchcauldron", `Mau brew apa?\n\nList: ${m.prefix}witchcauldron`, "guide"));
      }

      const recipe = RECIPES.find(r => r.name.toLowerCase() === recipeName.toLowerCase());
      if (!recipe) {
        await m.react("❌");
        return m.reply(raraRpgBox("witchcauldron", `Recipe "${recipeName}" tidak ditemukan.`, "error"));
      }

      // Get materials from crafting data
      const craftData = await db.getPlayerData?.(m.sender, "crafting") || { materials: {} };
      if (!craftData.materials) craftData.materials = {};

      const missing = [];
      for (const [mat, need] of Object.entries(recipe.materials)) {
        if ((craftData.materials[mat] || 0) < need) {
          missing.push(`${mat} (${craftData.materials[mat] || 0}/${need})`);
        }
      }

      if (missing.length > 0) {
        await m.react("❌");
        return m.reply(raraRpgBox("witchcauldron", `Bahan kurang!\n\n${missing.join("\n")}`, "error"));
      }

      // Cek gold
      try {
        const gold = await db.getGold?.(m.sender) || 0;
        if (gold < recipe.goldCost) {
          await m.react("❌");
          return m.reply(raraRpgBox("witchcauldron", `Gold kurang! Butuh ${recipe.goldCost}g.`, "error"));
        }
        await db.minGold?.(m.sender, recipe.goldCost);
      } catch {}

      // Deduct materials
      for (const [mat, need] of Object.entries(recipe.materials)) {
        craftData.materials[mat] -= need;
        if (craftData.materials[mat] <= 0) delete craftData.materials[mat];
      }
      await db.setPlayerData?.(m.sender, "crafting", craftData);

      await m.react("🕒");
      await m.reply("🫕 Cauldron mendidih... mengaduk ramuan...");
      await new Promise(r => setTimeout(r, 2000));

      // Apply effect
      await recipe.apply(db, m.sender);

      await m.react("🐣");
      let msg = "";
      msg += `${recipe.emoji} *${recipe.name}*\n`;
      msg += `Effect: *${recipe.effect}*\n`;
      msg += `Cost: ${recipe.goldCost}g\n`;
            return m.reply(msg);
    }

    // LIST (default)
    let msg = "";
    RECIPES.forEach(r => {
      const mats = Object.entries(r.materials).map(([k, v]) => `${v} ${k}`).join(", ");
      msg += `${r.emoji} *${r.name}*\n`;
      msg += `Bahan: ${mats} | ${r.goldCost}g\n`;
      msg += `Effect: ${r.effect}\n`;
    });
    msg += `
`;
    msg += `${m.prefix}witchcauldron brew <recipe>\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("witchcauldron error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("witchcauldron", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
