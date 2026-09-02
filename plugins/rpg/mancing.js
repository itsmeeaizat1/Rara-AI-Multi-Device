// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mancing — Fish for materials and gold

import {
  ensureRpg, addExp, addGold, useEnergy,
  addItem, ITEM_DB,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGather } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "mancing",
  alias: ["mancing", "fish"],
  category: "rpg",
  description: "Memancing ikan untuk material dan gold",
  usage: ".mancing",
  example: ".mancing",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const FISH_ENERGY = 5;
const FISH_COOLDOWN = 45 * 1000;

const FISH_TABLE = [
  { item: "rawFish", chance: 70, minQty: 1, maxQty: 3 },
  { item: "pearl", chance: 8, minQty: 1, maxQty: 1 },
  { item: "rawMeat", chance: 5, minQty: 1, maxQty: 1 }, // ikan besar
];

const GOLD_RANGE = [5, 30];
const EXP_RANGE = [10, 40];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("mancing", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastFish");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("mancing", `Cooldown mancing tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < FISH_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("mancing", `Energi kurang! Butuh *${FISH_ENERGY} energy*. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    useEnergy(m, FISH_ENERGY, sock);

    // Animation
    await animGather(m, sock, "🎣", "Memancing di danau...");

    const luckBonus = rpg.luck || 0;
    const dropBonus = rpg.dropBonus || 0;
    const drops = [];

    for (const fish of FISH_TABLE) {
      const chance = Math.min(100, fish.chance + luckBonus + dropBonus);
      if (Math.random() * 100 <= chance) {
        const qty = Math.floor(Math.random() * (fish.maxQty - fish.minQty + 1)) + fish.minQty;
        drops.push({ item: fish.item, qty });
        addItem(m, fish.item, qty);
      }
    }

    const expGain = Math.floor(Math.random() * (EXP_RANGE[1] - EXP_RANGE[0] + 1)) + EXP_RANGE[0];
    const goldGain = Math.floor(Math.random() * (GOLD_RANGE[1] - GOLD_RANGE[0] + 1)) + GOLD_RANGE[0];
    addExp(m, expGain);
    addGold(m, goldGain);

    setCooldown(m, "lastFish", FISH_COOLDOWN);

    let dropText;
    if (drops.length > 0) {
      dropText = drops.map(d => `+${d.qty}x ${ITEM_DB[d.item]?.name || d.item}`).join("\n");
      dropText = "\n" + dropText;
    } else {
      dropText = "\nHanya dapat rumput laut 😅";
    }

    await m.react("🐣");
    let msg = `Kamu memancing di tepi danau...\n\n`;
    msg += `Hasil Memancing:\n`;
    msg += `EXP: +${expGain}\n`;
    msg += `Gold: +${goldGain}`;
    msg += dropText + "\n\n";
    msg += `Energy: ${rpg.energy}/${rpg.maxEnergy}`;

    return m.reply(msg);
  } catch (err) {
    console.error("mancing error:", err);
    await m.react("❌");
    return m.reply(claraWrap("mancing", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
