// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mining — Mine ore for materials and gold (animated)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy,
  addItem, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  bumpPlayerStat,
} from "../../src/lib/nova-rpg-service.js";
import { animGather, rpgSleep } from "../../src/lib/nova-rpg-anim.js";
import { claraWrap, reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "mining",
  alias: ["mining", "mine", "tambang"],
  category: "rpg",
  description: "Menambang ore untuk material dan gold",
  usage: ".mining",
  example: ".mining",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const MINE_ENERGY = 8;
const MINE_COOLDOWN = 60 * 1000;

const ORE_TABLE = [
  { item: "copperOre", chance: 60, minQty: 1, maxQty: 3 },
  { item: "ironOre", chance: 35, minQty: 1, maxQty: 2 },
  { item: "goldOre", chance: 12, minQty: 1, maxQty: 1 },
  { item: "mithrilOre", chance: 4, minQty: 1, maxQty: 1 },
];

const GOLD_RANGE = [10, 50];
const EXP_RANGE = [20, 60];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("mining", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastMine");
    if (cd) {
      await reactCooldown(m);
      return m.reply(claraWrap("mining", `Cooldown mining tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < MINE_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("mining", `Energi kurang! Butuh *${MINE_ENERGY} energy*. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    useEnergy(m, MINE_ENERGY, sock);

    // Animation: mining progress
    await animGather(m, sock, "⛏️", "Menambang di gua...");

    const luckBonus = rpg.luck || 0;
    const dropBonus = rpg.dropBonus || 0;
    const drops = [];

    for (const ore of ORE_TABLE) {
      const chance = Math.min(100, ore.chance + luckBonus + dropBonus);
      if (Math.random() * 100 <= chance) {
        const qty = Math.floor(Math.random() * (ore.maxQty - ore.minQty + 1)) + ore.minQty;
        drops.push({ item: ore.item, qty });
        addItem(m, ore.item, qty);
      }
    }

    const totalMined = drops.reduce((a, d) => a + d.qty, 0);
    if (totalMined > 0) await bumpPlayerStat(m, "mining", "totalMine", totalMined);

    const expGain = Math.floor(Math.random() * (EXP_RANGE[1] - EXP_RANGE[0] + 1)) + EXP_RANGE[0];
    const goldGain = Math.floor(Math.random() * (GOLD_RANGE[1] - GOLD_RANGE[0] + 1)) + GOLD_RANGE[0];
    addExp(m, expGain);
    addGold(m, goldGain);
    setCooldown(m, "lastMine", MINE_COOLDOWN);

    let dropText = "";
    if (drops.length > 0) {
      dropText = drops.map(d => `│ • 🪨 ${ITEM_DB[d.item]?.name || d.item} : +${d.qty}x`).join("\n");
    } else {
      dropText = `Tidak dapet ore kali ini 😅`;
    }

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "mining", icon: "⛏️",
      flavor: "⛏️ *TAMBANG BERHASIL!*",
      body: [
        `│ • ⛏️ Lokasi : Gua`,
        "",
        `│ • ✨ EXP : +${expGain}`,
        `│ • 💰 Gold : +${goldGain}`,
        dropText,
        "",
        `│ • ⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}`,
      ].join("\n"),
      cta: gameCTA("mining"),
    }));
  } catch (err) {
    console.error("mining error:", err);
    await m.react("❌");
    return m.reply(claraWrap("mining", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
