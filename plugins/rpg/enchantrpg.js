// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Enchant — Enchant equipment to increase stats

import {
  ensureRpg, enchantItem, getItemCount, ITEM_DB
} from "../../src/lib/nova-rpg-service.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "enchant",
  alias: ["enchant", "enchantrpg", "upgradeitem"],
  category: "rpg",
  description: "Enchant equipment untuk tambah stats (butuh mithril ore)",
  usage: ".enchant <slot> [material]",
  example: ".enchant weapon",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const VALID_SLOTS = ["equipWeapon", "equipArmor", "equipHelmet", "equipBoots", "equipAccessory", "equipRing", "equipShield"];

const SLOT_LABEL = {
  equipWeapon: "Weapon",
  equipArmor: "Armor",
  equipHelmet: "Helmet",
  equipBoots: "Boots",
  equipAccessory: "Accessory",
  equipRing: "Ring",
  equipShield: "Shield",
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("enchantrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    let slotInput = args[0]?.toLowerCase();
    const materialId = args[1] || "mithrilOre";

    // Map singkat input ke slot key
    const slotMap = {
      weapon: "equipWeapon",
      armor: "equipArmor",
      helmet: "equipHelmet",
      helm: "equipHelmet",
      boots: "equipBoots",
      boot: "equipBoots",
      accessory: "equipAccessory",
      ring: "equipRing",
      shield: "equipShield",
    };

    const slot = slotMap[slotInput] || (VALID_SLOTS.includes(slotInput) ? slotInput : null);

    if (!slot) {
      // Show current equipment + enchant levels
      let msg = "";
      msg += `📋 Equipment & Enchant Level\n`;
      msg += `
`;

      for (const [key, label] of Object.entries(SLOT_LABEL)) {
        const item = rpg[key];
        if (item) {
          const enchantLv = item.enchant || 0;
          const itemName = ITEM_DB[item.id]?.name || item.id || "Unknown";
          msg += `${label}: *${itemName}* +${enchantLv}\n`;
        } else {
          msg += `${label}: *kosong*\n`;
        }
      }

      msg += `
`;
      msg += `📌 .enchantrpg <slot> [material]\n`;
      msg += `Material default: *Mithril Ore*\n`;
      msg += `⚠️ Semakin tinggi enchant, semakin rendah success rate\n`;
      
      return m.reply(novaRpgBox("enchantrpg", msg));
    }

    if (!rpg[slot]) {
  await animGeneric(m, sock, "", "Enchanting");
      return m.reply(novaRpgBox("enchantrpg", `Slot *${SLOT_LABEL[slot]}* kosong. Equip item dulu dengan .equiprpg.`, "warn"));
    }

    // Cek material
    const matCount = getItemCount(m, materialId);
    if (matCount < 1) {
      const matName = ITEM_DB[materialId]?.name || materialId;
      return m.reply(novaRpgBox("enchantrpg", `Material *${matName}* tidak cukup! Kamu butuh minimal 1. Mining di .mining untuk dapat mithril.`, "warn"));
    }

    await m.react("🕒");

    const result = enchantItem(m, slot, materialId, 1, sock);

    if (result.success) {
      await m.react("🐣");
      return m.reply(novaGameBox({
        title: "enchantrpg", icon: "✨",
        flavor: "✨ *ENCHANT BERHASIL!*",
        body: [
          `│ • 📂 Slot : ${SLOT_LABEL[slot]}`,
          `│ • ⬆️ Enchant level : +${result.enchant}`,
          `│ • 🧱 Material : 1x ${ITEM_DB[materialId]?.name || materialId}`,
          "",
          "💡 Stats equipment naik 10% per level",
        ].join("\n"),
        cta: gameCTA("enchantrpg"),
      }));
    } else {
      await m.react("❌");
      return m.reply(novaGameBox({
        title: "enchantrpg", icon: "💥",
        flavor: "💥 *ENCHANT GAGAL!*",
        body: [
          `│ • 📂 Slot : ${SLOT_LABEL[slot]}`,
          `│ • 🧱 Material : 1x ${ITEM_DB[materialId]?.name || materialId} (habis)`,
          "",
          "💡 Success rate makin rendah tiap level",
        ].join("\n"),
        cta: gameCTA("enchantrpg"),
      }));
    }
  } catch (err) {
    console.error("enchantrpg error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("enchantrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
