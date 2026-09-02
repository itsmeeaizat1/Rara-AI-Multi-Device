// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Heal — Recover HP and Energy using potions or resting

import { animHeal } from "../../src/lib/nova-rpg-anim.js";
import {
  ensureRpg, saveRpg, regenHP, regenEnergy, regenMana,
  removeItem, getItemCount, ITEM_DB
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "heal",
  alias: ["heal", "recover", "istirahat"],
  category: "rpg",
  description: "Recover HP, Energy, dan Mana dengan ramuan atau istirahat",
  usage: ".heal",
  example: ".heal",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const REST_COOLDOWN = 30 * 1000;

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("heal", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const hpFull = rpg.hp >= rpg.maxHp;
    const energyFull = rpg.energy >= rpg.maxEnergy;
    const manaFull = rpg.mana >= rpg.maxMana;

    if (hpFull && energyFull && manaFull) {
      return m.reply(claraWrap("heal", `HP, Energy, dan Mana sudah penuh!\n❤️ HP: *${rpg.hp}/${rpg.maxHp}*\n⚡ Energy: *${rpg.energy}/${rpg.maxEnergy}*\n💧 Mana: *${rpg.mana}/${rpg.maxMana}*`, "info"));
    }

    // Cek apakah punya potion
    const hasHpPotion = getItemCount(m, "hpPotion") > 0;
    const hasEnergyDrink = getItemCount(m, "energyDrink") > 0;
    const hasElixir = getItemCount(m, "elixir") > 0;

    let healed = [];
    let usedItems = [];

    // Auto-use potion kalau punya
    if (!hpFull && hasHpPotion) {
      removeItem(m, "hpPotion", 1, sock);
      regenHP(m, ITEM_DB.hpPotion.heal);
      usedItems.push("Ramuan HP");
      healed.push(`❤️ HP +${ITEM_DB.hpPotion.heal}`);
    }

    if (!energyFull && hasEnergyDrink) {
      removeItem(m, "energyDrink", 1, sock);
      regenEnergy(m, ITEM_DB.energyDrink.energy);
      usedItems.push("Minuman Energi");
      healed.push(`⚡ Energy +${ITEM_DB.energyDrink.energy}`);
    }

    // Elixir: heal all
    if (hasElixir && (!hpFull || !energyFull || !manaFull)) {
      removeItem(m, "elixir", 1, sock);
      regenHP(m, ITEM_DB.elixir.heal);
      regenEnergy(m, 50);
      regenMana(m, ITEM_DB.elixir.mana);
      usedItems.push("Eliksir");
      healed.push(`❤️ HP +${ITEM_DB.elixir.heal}`);
      healed.push(`⚡ Energy +50`);
      healed.push(`💧 Mana +${ITEM_DB.elixir.mana}`);
    }

    // Kalau tidak pakai item, rest (free tapi kecil)
    if (usedItems.length === 0) {
      const hpRegen = Math.floor(rpg.maxHp * 0.3);
      const energyRegen = Math.floor(rpg.maxEnergy * 0.3);
      const manaRegen = Math.floor(rpg.maxMana * 0.3);

      regenHP(m, hpRegen);
      regenEnergy(m, energyRegen);
      regenMana(m, manaRegen);

      healed.push(`❤️ HP +${hpRegen} (istirahat)`);
      healed.push(`⚡ Energy +${energyRegen} (istirahat)`);
      healed.push(`💧 Mana +${manaRegen} (istirahat)`);
    }

    await m.react("🐣");
    const freshRpg = ensureRpg(m, m.pushName);
    let msg = "";
    if (usedItems.length > 0) {
      msg += `🧪 Menggunakan: *${usedItems.join(", ")}*\n`;
    } else {
      msg += `💤 Kamu beristirahat sejenak...\n`;
    }
    msg += `
`;
    msg += `📦 *ʀᴇᴄᴏᴠᴇʀʏ*\n`;
    for (const h of healed) {
      msg += `${h}\n`;
    }
    msg += `
`;
    msg += `❤️ HP: *${freshRpg.hp}/${freshRpg.maxHp}*\n`;
    msg += `⚡ Energy: *${freshRpg.energy}/${freshRpg.maxEnergy}*\n`;
    msg += `💧 Mana: *${freshRpg.mana}/${freshRpg.maxMana}*\n`;
    
    await animHeal(m, sock);
    return m.reply(msg);
  } catch (err) {
    console.error("heal error:", err);
    await m.react("❌");
    return m.reply(claraWrap("heal", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
