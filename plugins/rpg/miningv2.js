// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mining v2 — Deeper mines, gem finds, cave-in events

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, addGems, addItem,
  ITEM_DB, checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGather } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "miningv2",
  alias: ["miningv2", "minev2", "tambangv2"],
  category: "rpg",
  description: "Mining v2 — deeper mines, gem chance, cave-in risk, streak bonus",
  usage: ".miningv2",
  example: ".miningv2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const MINE_ENERGY = 8;
const MINE_COOLDOWN = 30 * 1000;

const ORES = [
  { name: "Copper", id: "copperOre", minLv: 1, exp: 15, gold: 5, chance: 50 },
  { name: "Iron", id: "ironOre", minLv: 5, exp: 25, gold: 12, chance: 35 },
  { name: "Gold", id: "goldOre", minLv: 15, exp: 40, gold: 25, chance: 20 },
  { name: "Mithril", id: "mithrilOre", minLv: 30, exp: 70, gold: 50, chance: 8 },
  { name: "Adamant", id: "adamantOre", minLv: 50, exp: 100, gold: 80, chance: 3 },
];

// Bonus finds
const BONUS_FINDS = [
  { type: "gem", chance: 5, amount: [1, 3], msg: "💎 Menemukan gems!" },
  { type: "fossil", chance: 8, item: "fossil", msg: "🦴 Menemukan fosil langka!" },
  { type: "chest", chance: 3, gold: [50, 200], msg: "🎁 Peti harta di tambang!" },
  { type: "cavein", chance: 4, msg: "🪨 Cave-in! Kamu terluka!", dmg: [10, 30] },
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("miningv2", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastMiningV2");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("miningv2", `Cooldown mining tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < MINE_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("miningv2", `Energi kurang! Butuh *${MINE_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, MINE_ENERGY, sock);

    // Animation
    await animGather(m, sock, "⛏️", "Menambang di deep cave...");

    // Mining streak
    const streak = (rpg.miningStreak || 0) + 1;
    const streakBonus = Math.min(streak * 0.03, 0.3);

    // Pick ore based on level
    const available = ORES.filter(o => rpg.level >= o.minLv);
    const ore = available[Math.floor(Math.random() * available.length)];

    const qty = Math.floor(Math.random() * 3) + 1;
    const expGain = Math.floor(ore.exp * (1 + streakBonus));
    const goldGain = Math.floor(ore.gold * (1 + streakBonus) * qty);

    addExp(m, expGain);
    addGold(m, goldGain);
    addItem(m, ore.id, qty);

    // Check for bonus events
    let bonusText = "";
    let hpDmg = 0;

    for (const bonus of BONUS_FINDS) {
      if (Math.random() * 100 < bonus.chance) {
        switch (bonus.type) {
          case "gem": {
            const gemQty = Math.floor(Math.random() * (bonus.amount[1] - bonus.amount[0] + 1)) + bonus.amount[0];
            addGems(m, gemQty);
            bonusText += `
${bonus.msg} *+${gemQty} gems*`;
            break;
          }
          case "fossil": {
            addItem(m, bonus.item, 1);
            bonusText += `
${bonus.msg} *+1x Fosil*`;
            break;
          }
          case "chest": {
            const chestGold = Math.floor(Math.random() * (bonus.gold[1] - bonus.gold[0] + 1)) + bonus.gold[0];
            addGold(m, chestGold);
            bonusText += `
${bonus.msg} *+${chestGold} gold*`;
            break;
          }
          case "cavein": {
            hpDmg = Math.floor(Math.random() * (bonus.dmg[1] - bonus.dmg[0] + 1)) + bonus.dmg[0];
            bonusText += `
${bonus.msg} *-${hpDmg} HP*`;
            break;
          }
        }
        break; // Only one bonus per trip
      }
    }

    saveRpg(m, {
      miningStreak: streak,
      miningTrips: (rpg.miningTrips || 0) + 1,
      hp: hpDmg > 0 ? Math.max(1, rpg.hp - hpDmg) : rpg.hp,
    });

    setCooldown(m, "lastMiningV2", MINE_COOLDOWN);

    const freshRpg = ensureRpg(m, m.pushName);

    await m.react("🐣");
    let out = "";
    out += `⛏️ Menambang di Level ${rpg.level}...\n`;
    out += `
`;
    out += `📦 *ʜᴀsɪʟ*\n`;
    out += `🪨 ${ore.name} Ore: *+${qty}x*\n`;
    out += `💰 Gold: *+${goldGain}*\n`;
    out += `✦ EXP: *+${expGain}*\n`;
    if (bonusText) out += bonusText + "\n";
    out += `
`;
    if (streak > 1) {
      out += `🔥 Mining streak: *${streak}x* (+${Math.floor(streakBonus * 100)}%)\n`;
    }
    out += `❤️ HP: *${freshRpg.hp}/${rpg.maxHp}*\n`;
    out += `⚡ Energy: *${freshRpg.energy}/${rpg.maxEnergy}*\n`;
    
    return m.reply(out);
  } catch (err) {
    console.error("miningv2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("miningv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
