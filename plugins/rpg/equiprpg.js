// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Equip — Equip/unequip items from inventory

import {
  ensureRpg, equipItem, unequipItem, getEquipStats, getInventory,
  ITEM_DB, getItemCount
} from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "equip",
  alias: ["equip", "equiprpg", "pakai", "unequiprpg"],
  category: "rpg",
  description: "Equip/unequip item RPG dari inventory",
  usage: ".equip <item> | .unequip <slot>",
  example: ".equip ironSword",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const SLOT_NAMES = {
  weapon: "Weapon",
  armor: "Armor",
  helmet: "Helmet",
  boots: "Boots",
  accessory: "Accessory",
  ring: "Ring",
  shield: "Shield",
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("equiprpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const command = m.command;
    const args = m.text?.trim().split(/\s+/) || [];
    const itemId = args[0];

    // Show current equipment
    if (!itemId || command === "equiprpg" && itemId === "list") {
      const equip = getEquipStats(m);
      let msg = "";
      msg += `👤 ${m.pushName || "Player"}\n`;
      msg += `\n`;

      for (const [slot, name] of Object.entries(SLOT_NAMES)) {
        const key = `equip${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
        const equipped = rpg[key];
        if (equipped) {
          const item = ITEM_DB[equipped];
          msg += `${name}: *${item?.name || equipped}*\n`;
        } else {
          msg += `${name}: *kosong*\n`;
        }
      }

      msg += `\n`;
      msg += `📊 *ᴛᴏᴛᴀʟ ʙᴏɴᴜs*\n`;
      msg += `ATK: *+${equip.atk}*\n`;
      msg += `DEF: *+${equip.def}*\n`;
      msg += `HP: *+${equip.hp}*\n`;
      msg += `SPD: *+${equip.spd}*\n`;
      msg += `\n`;
      msg += `📌 .equiprpg <item> untuk equip\n`;
      msg += `📌 .unequiprpg <slot> untuk unequip\n`;
      
      await animGeneric(m, sock, '🛡️', 'Equipping item');
      return m.reply(msg);
    }

    // Equip
    if (command === "equiprpg" || command === "pakai") {
      const itemInfo = ITEM_DB[itemId];
      if (!itemInfo) {
        return m.reply(novaRpgBox("equiprpg", `Item *${itemId}* tidak dikenal.`, "warn"));
      }

      if (!["weapon", "armor", "helmet", "boots", "accessory", "ring", "shield"].includes(itemInfo.type)) {
        return m.reply(novaRpgBox("equiprpg", `${itemInfo.name} bukan equipment yang bisa di-equip.`, "warn"));
      }

      const owned = getItemCount(m, itemId);
      if (owned <= 0) {
        return m.reply(novaRpgBox("equiprpg", `Kamu tidak punya *${itemInfo.name}* di inventory.`, "warn"));
      }

      const result = equipItem(m, itemId, sock);

      if (result.success) {
        await m.react("🐣");
        let msg = "";
        msg += `✅ Berhasil equip!\n`;
        msg += `\n`;
        msg += `📦 Item: *${itemInfo.name}*\n`;
        msg += `📂 Slot: *${SLOT_NAMES[itemInfo.type] || itemInfo.type}*\n`;
        msg += `\n`;
        msg += `📊 *sᴛᴀᴛ ʙᴏɴᴜs*\n`;
        if (itemInfo.atk) msg += `⚔️ ATK: *+${itemInfo.atk}*\n`;
        if (itemInfo.def) msg += `🛡️ DEF: *+${itemInfo.def}*\n`;
        if (itemInfo.hp) msg += `❤️ HP: *+${itemInfo.hp}*\n`;
        if (itemInfo.spd) msg += `💨 SPD: *+${itemInfo.spd}*\n`;
        if (itemInfo.critRate) msg += `🎯 Crit: *+${itemInfo.critRate}%*\n`;
        if (itemInfo.critDmg) msg += `💥 Crit DMG: *+${itemInfo.critDmg}%*\n`;
        if (itemInfo.evasion) msg += `💨 Evasion: *+${itemInfo.evasion}%*\n`;
        
        await animGeneric(m, sock, '🛡️', 'Equipping item');
        return m.reply(msg);
      } else {
        return m.reply(novaRpgBox("equiprpg", result.reason || "Gagal equip item.", "warn"));
      }
    }

    // Unequip
    if (command === "unequiprpg") {
      const slot = itemId.toLowerCase();
      if (!SLOT_NAMES[slot]) {
        return m.reply(novaRpgBox("unequiprpg", `Slot tidak valid. Pilih: *${Object.keys(SLOT_NAMES).join(", ")}*`, "warn"));
      }

      const result = unequipItem(m, slot);

      if (result.success) {
        await m.react("🐣");
        let msg = "";
        msg += `✅ Berhasil unequip!\n`;
        msg += `📂 Slot: *${SLOT_NAMES[slot]}*\n`;
        msg += `📦 Item dikembalikan ke inventory\n`;
        
        await animGeneric(m, sock, '🛡️', 'Equipping item');
        return m.reply(msg);
      } else {
        return m.reply(novaRpgBox("unequiprpg", result.reason || "Slot kosong atau gagal unequip.", "warn"));
      }
    }
  } catch (err) {
    console.error("equiprpg error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("equiprpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };