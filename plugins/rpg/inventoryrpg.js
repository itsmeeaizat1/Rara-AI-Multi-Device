// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Inventory — Check your items

import {
  ensureRpg, getInventory, ITEM_DB
} from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "inventory",
  alias: ["inventory", "inventoryrpg", "invrpg", "tasrpg", "backpackrpg"],
  category: "rpg",
  description: "Cek inventory RPG kamu (item, material, consumable)",
  usage: ".invrpg",
  example: ".invrpg",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const RARITY_EMOJI = {
  common: "⬜",
  uncommon: "🟩",
  rare: "🟦",
  epic: "🟪",
  legendary: "🟨",
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("inventory", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const inv = getInventory(m);
    const items = Object.entries(inv).filter(([id, data]) => data.qty > 0);

    if (items.length === 0) {
      return m.reply(raraRpgBox("inventory", `Tas RPG kamu kosong!\nMulai berburu (.petualangberburu), menambang (.mining), atau memancing (.mancing) untuk mendapatkan item.`, "info"));
    }

    // Sort by rarity
    items.sort((a, b) => {
      const ra = ITEM_DB[a[0]]?.rarity || "common";
      const rb = ITEM_DB[b[0]]?.rarity || "common";
      const order = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
      return (order[ra] || 5) - (order[rb] || 5);
    });

    let msg = "";
    msg += `👤 ${m.pushName || "Player"}\n`;
    msg += `📦 Total: *${items.length}* jenis item\n`;
    msg += `\n`;

    let materials = [];
    let consumables = [];
    let equipment = [];
    let others = [];

    for (const [id, data] of items) {
      const item = ITEM_DB[id];
      if (!item) {
        others.push(`${RARITY_EMOJI.common} ${id} x${data.qty}`);
        continue;
      }
      const line = `${RARITY_EMOJI[item.rarity] || "⬜"} ${item.name} x${data.qty}`;
      if (item.type === "material") materials.push(line);
      else if (item.type === "consumable") consumables.push(line);
      else if (["weapon", "armor", "helmet", "boots", "accessory", "ring", "shield"].includes(item.type)) equipment.push(line);
      else others.push(line);
    }

    if (materials.length > 0) {
      msg += `📦 *material*\n`;
      for (const l of materials) msg += `${l}\n`;
      msg += `\n`;
    }

    if (consumables.length > 0) {
      msg += `🧪 *consumable*\n`;
      for (const l of consumables) msg += `${l}\n`;
      msg += `\n`;
    }

    if (equipment.length > 0) {
      msg += `⚔️ *eϙuipment*\n`;
      for (const l of equipment) msg += `${l}\n`;
      msg += `\n`;
    }

    if (others.length > 0) {
      msg += `📌 *lainnya*\n`;
      for (const l of others) msg += `${l}\n`;
      msg += `\n`;
    }

    await animGeneric(m, sock, '🎒', 'Opening inventory');
    return m.reply(msg);
  } catch (err) {
    console.error("inventory rpg error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("inventory", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };