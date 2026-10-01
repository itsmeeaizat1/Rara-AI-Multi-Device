// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Craft — Craft consumables from raw materials

import {
  ensureRpg, addItem, removeItem, ITEM_DB, getItemCount
} from "../../src/lib/rara-rpg-service.js";
import { raraGameBox, gameCTA, raraRpgBox } from "../../src/lib/rara-games.js";
import { animCraft } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "craft",
  alias: ["craft", "craftrpg", "crafting"],
  category: "rpg",
  description: "Craft item dari material mentah (masak, ramuan, dll)",
  usage: ".craft <list|item>",
  example: ".craft hpPotion",
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
    if (!rpg) return m.reply(raraRpgBox("craftrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Show recipe list
    if (!action || action === "list") {
      let msg = "";
      msg += `📋 Daftar resep crafting\n`;
      msg += `
`;

      for (const recipe of RECIPES) {
        const resultItem = ITEM_DB[recipe.result];
        const rarity = resultItem?.rarity || "common";
        const rarityEmoji = { common: "⬜", uncommon: "🟩", rare: "🟦", epic: "🟪", legendary: "🟨" }[rarity] || "⬜";

        msg += `${rarityEmoji} *${recipe.name}* (${recipe.id})\n`;
        msg += `Bahan: `;
        const mats = recipe.materials.map(mat => `${mat.qty}x ${ITEM_DB[mat.id]?.name || mat.id}`);
        msg += mats.join(", ") + "\n";
      }

      msg += `
`;
      msg += `📌 Ketik .craftrpg <id> untuk craft\n`;
      
      return m.reply(raraRpgBox("craftrpg", msg));
    }

    // Find recipe
    const recipe = RECIPES.find(r => r.id === action);
    if (!recipe) {
      return m.reply(raraRpgBox("craftrpg", `Resep *${action}* tidak ditemukan. Ketik .craftrpg list untuk lihat semua.`, "warn"));
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
      return m.reply(raraRpgBox("craftrpg", `Material tidak cukup!\nKurang: *${missing.join(", ")}*\nKumpulkan dengan .petualangberburu, .mining, atau .mancing.`, "warn"));
    }

    // Consume materials
    for (const mat of recipe.materials) {
      removeItem(m, mat.id, mat.qty, sock);
    }

    // Add result
    // Animation
    await animCraft(m, sock, "item");

    addItem(m, recipe.result, recipe.qty);

    await m.react("🐣");
    return m.reply(raraGameBox({
      title: "craftrpg", icon: "⚒️",
      flavor: "✅ *CRAFT BERHASIL!*",
      body: [
        `│ • 📦 Hasil : ${recipe.name} x${recipe.qty}`,
        `│ • 🧱 Material dipakai : ${recipe.materials.map(mat => `${mat.qty}x ${ITEM_DB[mat.id]?.name || mat.id}`).join(", ")}`,
        "",
        "Item masuk inventory. Cek dengan .inventoryrpg!",
      ].join("\n"),
      cta: gameCTA("craftrpg"),
    }));
  } catch (err) {
    console.error("craftrpg error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("craftrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
