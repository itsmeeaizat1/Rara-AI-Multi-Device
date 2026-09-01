// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Craft — Craft consumables from raw materials

import {
  ensureRpg, addItem, removeItem, ITEM_DB, getItemCount
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "craftrpg",
  alias: ["craftrpg", "craft", "crafting"],
  category: "rpg",
  description: "Craft item dari material mentah (masak, ramuan, dll)",
  usage: ".craftrpg <list|item>",
  example: ".craftrpg hpPotion",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const RECIPES = [
  {
    id: "cookedMeat",
    name: "Steak (Cooked Meat)",
    result: "cookedMeat",
    qty: 1,
    materials: [{ id: "rawMeat", qty: 2 }],
  },
  {
    id: "fishSoup",
    name: "Sup Ikan",
    result: "fishSoup",
    qty: 1,
    materials: [{ id: "rawFish", qty: 3 }],
  },
  {
    id: "hpPotion",
    name: "Ramuan HP",
    result: "hpPotion",
    qty: 1,
    materials: [
      { id: "rawMeat", qty: 1 },
      { id: "copperOre", qty: 2 },
    ],
  },
  {
    id: "mpPotion",
    name: "Ramuan MP",
    result: "mpPotion",
    qty: 1,
    materials: [
      { id: "rawFish", qty: 1 },
      { id: "copperOre", qty: 2 },
    ],
  },
  {
    id: "energyDrink",
    name: "Minuman Energi",
    result: "energyDrink",
    qty: 1,
    materials: [
      { id: "rawFish", qty: 2 },
      { id: "pearl", qty: 1 },
    ],
  },
  {
    id: "elixir",
    name: "Eliksir (Rare!)",
    result: "elixir",
    qty: 1,
    materials: [
      { id: "goldOre", qty: 3 },
      { id: "pearl", qty: 2 },
      { id: "ironOre", qty: 5 },
    ],
  },
  {
    id: "luckyCharm",
    name: "Jimat Keberuntungan",
    result: "luckyCharm",
    qty: 1,
    materials: [
      { id: "goldOre", qty: 2 },
      { id: "wolfPelt", qty: 3 },
    ],
  },
  {
    id: "dungeonKey",
    name: "Kunci Dungeon",
    result: "dungeonKey",
    qty: 1,
    materials: [
      { id: "ironOre", qty: 10 },
      { id: "goldOre", qty: 1 },
    ],
  },
  {
    id: "bossKey",
    name: "Kunci Boss (Epic!)",
    result: "bossKey",
    qty: 1,
    materials: [
      { id: "mithrilOre", qty: 3 },
      { id: "goldOre", qty: 5 },
      { id: "dragonScale", qty: 1 },
    ],
  },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("craftrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Show recipe list
    if (!action || action === "list") {
      let msg = `╭─「 ✦ ᴄʀᴀғᴛ ʀᴘɢ ✦ 」\n`;
      msg += `│ 📋 Daftar resep crafting\n`;
      msg += `│\n`;

      for (const recipe of RECIPES) {
        const resultItem = ITEM_DB[recipe.result];
        const rarity = resultItem?.rarity || "common";
        const rarityEmoji = { common: "⬜", uncommon: "🟩", rare: "🟦", epic: "🟪", legendary: "🟨" }[rarity] || "⬜";

        msg += `│ ${rarityEmoji} *${recipe.name}* (${recipe.id})\n`;
        msg += `│   Bahan: `;
        const mats = recipe.materials.map(mat => `${mat.qty}x ${ITEM_DB[mat.id]?.name || mat.id}`);
        msg += mats.join(", ") + "\n";
      }

      msg += `│\n`;
      msg += `│ 📌 Ketik .craftrpg <id> untuk craft\n`;
      msg += `╰────  •  ────`;

      return m.reply(msg);
    }

    // Find recipe
    const recipe = RECIPES.find(r => r.id === action);
    if (!recipe) {
      return m.reply(claraWrap("craftrpg", `Resep *${action}* tidak ditemukan. Ketik .craftrpg list untuk lihat semua.`, "warn"));
    }

    // Check materials
    const missing = [];
    for (const mat of recipe.materials) {
      const owned = getItemCount(m, mat.id);
      if (owned < mat.qty) {
        missing.push(`${mat.qty - owned}x ${ITEM_DB[mat.id]?.name || mat.id}`);
      }
    }

    if (missing.length > 0) {
      await m.react("🚫");
      return m.reply(claraWrap("craftrpg", `Material tidak cukup!\nKurang: *${missing.join(", ")}*\nKumpulkan dengan .berburu, .mining, atau .mancing.`, "warn"));
    }

    // Consume materials
    for (const mat of recipe.materials) {
      removeItem(m, mat.id, mat.qty, sock);
    }

    // Add result
    addItem(m, recipe.result, recipe.qty);

    await m.react("🐣");
    let msg = `╭─「 ✦ ᴄʀᴀғᴛ ʀᴘɢ ✦ 」\n`;
    msg += `│ ✅ Craft berhasil!\n`;
    msg += `│\n`;
    msg += `│ 📦 Hasil: *${recipe.name}* x${recipe.qty}\n`;
    msg += `│ 📂 Material digunakan:\n`;
    for (const mat of recipe.materials) {
      msg += `│   - ${mat.qty}x ${ITEM_DB[mat.id]?.name || mat.id}\n`;
    }
    msg += `╰────  •  ────`;

    return m.reply(msg);
  } catch (err) {
    console.error("craftrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("craftrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
