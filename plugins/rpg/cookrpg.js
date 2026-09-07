// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cooking — Cook raw food into consumables with bonus effects

import {
  ensureRpg, addItem, removeItem, regenHP, regenEnergy, regenMana,
  getItemCount, ITEM_DB
} from "../../src/lib/nova-rpg-service.js";
import { animCraft } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "cookrpg",
  alias: ["cookrpg", "cook", "masak"],
  category: "rpg",
  description: "Masak makanan dari bahan mentah — langsung dikonsumsi",
  usage: ".cookrpg <list|item>",
  example: ".cookrpg steak",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const COOK_RECIPES = [
  {
    id: "steak",
    name: "Steak",
    materials: [{ id: "rawMeat", qty: 2 }],
    effect: { hp: 50 },
    desc: "Restore 50 HP",
  },
  {
    id: "soup",
    name: "Sup Ikan",
    materials: [{ id: "rawFish", qty: 3 }],
    effect: { hp: 40, mana: 20 },
    desc: "Restore 40 HP + 20 Mana",
  },
  {
    id: "feast",
    name: "Feast (Large)",
    materials: [
      { id: "rawMeat", qty: 3 },
      { id: "rawFish", qty: 3 },
    ],
    effect: { hp: 100, energy: 30, mana: 50 },
    desc: "Restore 100 HP + 30 Energy + 50 Mana",
  },
  {
    id: "ration",
    name: "Ration (Survival)",
    materials: [{ id: "rawMeat", qty: 1 }, { id: "rawFish", qty: 1 }],
    effect: { hp: 25, energy: 15 },
    desc: "Restore 25 HP + 15 Energy",
  },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("cookrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // List
    if (!action || action === "list") {
      let msg = "";
      msg += `📋 Resep masakan\n`;
      msg += `
`;

      for (const recipe of COOK_RECIPES) {
        const mats = recipe.materials.map(mat => `${mat.qty}x ${ITEM_DB[mat.id]?.name || mat.id}`).join(", ");
        msg += `🍳 *${recipe.name}* (${recipe.id})\n`;
        msg += `Bahan: ${mats}\n`;
        msg += `Efek: ${recipe.desc}\n`;
      }

      msg += `
`;
      msg += `📌 Ketik .cookrpg <id> untuk masak\n`;
      msg += `Makanan langsung dikonsumsi (instant effect)\n`;
      
      return m.reply(msg);
    }

    // Find recipe
    const recipe = COOK_RECIPES.find(r => r.id === action);
    if (!recipe) {
      return m.reply(novaRpgBox("cookrpg", `Resep *${action}* tidak ada. Ketik .cookrpg list.`, "warn"));
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
      return m.reply(novaRpgBox("cookrpg", `Bahan tidak cukup!\nKurang: *${missing.join(", ")}*`, "warn"));
    }

    // Consume materials
    for (const mat of recipe.materials) {
      removeItem(m, mat.id, mat.qty, sock);
    }

    // Apply effects directly
    const effects = [];
    if (recipe.effect.hp) {
      regenHP(m, recipe.effect.hp);
      effects.push(`❤️ HP +${recipe.effect.hp}`);
    }
    if (recipe.effect.energy) {
      regenEnergy(m, recipe.effect.energy);
      effects.push(`⚡ Energy +${recipe.effect.energy}`);
    }
    if (recipe.effect.mana) {
      regenMana(m, recipe.effect.mana);
      effects.push(`💧 Mana +${recipe.effect.mana}`);
    }

    await m.react("🐣");
    const freshRpg = ensureRpg(m, m.pushName);

    let msg = "";
    msg += `✅ Berhasil masak & makan!\n`;
    msg += `
`;
    msg += `🍽️ *${recipe.name}*\n`;
    msg += `${recipe.desc}\n`;
    msg += `
`;
    for (const e of effects) {
      msg += `${e}\n`;
    }
    msg += `
`;
    msg += `❤️ HP: *${freshRpg.hp}/${freshRpg.maxHp}*\n`;
    msg += `⚡ Energy: *${freshRpg.energy}/${freshRpg.maxEnergy}*\n`;
    msg += `💧 Mana: *${freshRpg.mana}/${freshRpg.maxMana}*\n`;
    
    return m.reply(msg);
  } catch (err) {
    console.error("cookrpg error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("cookrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
