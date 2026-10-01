// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// crafting2.js — Crafting System v2 (recipe, material, craft)
import { getDatabase } from "../../src/lib/rara-database.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "crafting2",
  alias: ["crafting2", "craft2", "craftingv2", "buat2"],
  category: "rpg",
  description: "Crafting system v2 — recipe, material gathering, craft items",
  usage: ".crafting2 (list recipe)\n.crafting2 craft <item>\n.crafting2 materials (cek bahan)",
  example: ".crafting2\n.crafting2 craft Iron Sword",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

const RECIPES = [
  {
    name: "Iron Sword", emoji: "⚔️", rarity: "Common",
    materials: { iron: 5, wood: 2 },
    result: { atk: 15, type: "weapon" },
    goldCost: 200,
  },
  {
    name: "Steel Armor", emoji: "🛡️", rarity: "Uncommon",
    materials: { iron: 10, leather: 5 },
    result: { def: 20, hp: 50, type: "armor" },
    goldCost: 500,
  },
  {
    name: "Health Potion", emoji: "🧪", rarity: "Common",
    materials: { herb: 3, water: 1 },
    result: { heal: 50, type: "consumable" },
    goldCost: 100,
  },
  {
    name: "Mana Potion", emoji: "🔵", rarity: "Common",
    materials: { herb: 5, crystal: 1 },
    result: { mana: 30, type: "consumable" },
    goldCost: 150,
  },
  {
    name: "Dragon Sword", emoji: "🐉", rarity: "Legendary",
    materials: { dragon_scale: 3, iron: 20, crystal: 5 },
    result: { atk: 80, type: "weapon" },
    goldCost: 5000,
  },
  {
    name: "Phoenix Cloak", emoji: "🔥", rarity: "Epic",
    materials: { phoenix_feather: 2, leather: 10, crystal: 3 },
    result: { def: 40, hp: 100, type: "armor" },
    goldCost: 3000,
  },
  {
    name: "Lucky Ring", emoji: "💍", rarity: "Rare",
    materials: { gold_ore: 5, crystal: 2 },
    result: { luck: 10, type: "accessory" },
    goldCost: 1000,
  },
  {
    name: "Enchant Scroll", emoji: "📜", rarity: "Rare",
    materials: { paper: 5, crystal: 3, herb: 2 },
    result: { enchant: 1, type: "scroll" },
    goldCost: 800,
  },
];

async function getCraftData(db, sender) {
  return await db.getPlayerData?.(sender, "crafting") || { materials: {}, crafted: [] };
}

async function saveCraftData(db, sender, data) {
  await db.setPlayerData?.(sender, "crafting", data);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    const data = await getCraftData(db, m.sender);

    if (subCmd === "materials" || subCmd === "bahan") {
      if (!data.materials || Object.keys(data.materials).length === 0) {
        return m.reply(raraRpgBox("crafting2", `Belum ada bahan. Dapatkan dari:\n${m.prefix}mining - tambang iron, crystal, gold_ore\n${m.prefix}nebang - tebang wood\n${m.prefix}berburu - dapat leather, herb`, "guide"));
      }
      let msg = "";
      for (const [mat, count] of Object.entries(data.materials)) {
        msg += `${mat}: *${count}*\n`;
      }
            return m.reply(msg);
    }

    if (subCmd === "craft" || subCmd === "buat") {
      const itemName = m.args.slice(1).join(" ").trim();
      if (!itemName) {
        return m.reply(raraRpgBox("crafting2", `Mau craft apa?\n\nList recipe: ${m.prefix}crafting2`, "guide"));
      }

      const recipe = RECIPES.find(r => r.name.toLowerCase() === itemName.toLowerCase());
      if (!recipe) {
        await m.react("❌");
        return m.reply(raraRpgBox("crafting2", `Recipe "${itemName}" tidak ditemukan.`, "error"));
      }

      // Cek materials
      if (!data.materials) data.materials = {};
      const missing = [];
      for (const [mat, need] of Object.entries(recipe.materials)) {
        if ((data.materials[mat] || 0) < need) {
          missing.push(`${mat} (${data.materials[mat] || 0}/${need})`);
        }
      }

      if (missing.length > 0) {
        await m.react("❌");
        return m.reply(raraRpgBox("crafting2", `Bahan tidak cukup!\n\nKurang: ${missing.join(", ")}`, "error"));
      }

      // Cek gold
      try {
        const gold = await db.getGold?.(m.sender) || 0;
        if (gold < recipe.goldCost) {
          await m.react("❌");
          return m.reply(raraRpgBox("crafting2", `Gold tidak cukup! Butuh ${recipe.goldCost} gold.`, "error"));
        }
        await db.minGold?.(m.sender, recipe.goldCost);
      } catch {}

      // Deduct materials
      for (const [mat, need] of Object.entries(recipe.materials)) {
        data.materials[mat] -= need;
        if (data.materials[mat] <= 0) delete data.materials[mat];
      }

      // Add crafted item
      if (!data.crafted) data.crafted = [];
      data.crafted.push({ name: recipe.name, emoji: recipe.emoji, ...recipe.result, time: Date.now() });

      await saveCraftData(db, m.sender, data);
      await m.react("🐣");

      let msg = "";
      msg += `${recipe.emoji} *${recipe.name}*\n`;
      msg += `Rarity: *${recipe.rarity}*\n`;
      if (recipe.result.atk) msg += `ATK: *+${recipe.result.atk}*\n`;
      if (recipe.result.def) msg += `DEF: *+${recipe.result.def}*\n`;
      if (recipe.result.hp) msg += `HP: *+${recipe.result.hp}*\n`;
      msg += `Cost: ${recipe.goldCost} gold\n`;
            return m.reply(msg);
    }

    // LIST RECIPES (default)
    let msg = "";
    RECIPES.forEach(r => {
      const mats = Object.entries(r.materials).map(([k, v]) => `${v} ${k}`).join(", ");
      msg += `${r.emoji} *${r.name}* [${r.rarity}]\n`;
      msg += `Bahan: ${mats} | ${r.goldCost}g\n`;
    });
    msg += `
`;
    msg += `${m.prefix}crafting2 craft <nama>\n`;
    msg += `${m.prefix}crafting2 materials\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("crafting2 error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("crafting2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
