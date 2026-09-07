// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Berburu v2 — Party hunt, rare monsters, tracking system

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, addItem,
  getEquipStats, rollDrop, ITEM_DB, getRandomMonster,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { rpgSleep } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "berburuv2",
  alias: ["berburuv2", "huntv2", "buruv2"],
  category: "rpg",
  description: "Berburu v2 — rare monster chance, combo kills, bonus drops",
  usage: ".berburuv2",
  example: ".berburuv2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const HUNT_ENERGY = 12;
const HUNT_COOLDOWN = 30 * 1000;

// Rare monster chances
const RARE_MONSTERS = [
  { name: "Golden Slime", chance: 5, hp: 50, atk: 10, def: 0, exp: 300, gold: 500, drops: [{ item: "goldOre", chance: 100, min: 3, max: 5 }] },
  { name: "Crystal Golem", chance: 3, hp: 300, atk: 30, def: 50, exp: 500, gold: 300, drops: [{ item: "mithrilOre", chance: 100, min: 2, max: 4 }] },
  { name: "Shadow Wolf", chance: 4, hp: 200, atk: 40, def: 20, exp: 400, gold: 250, drops: [{ item: "wolfPelt", chance: 100, min: 2, max: 4 }] },
  { name: "Ancient Dragon", chance: 1, hp: 1000, atk: 80, def: 60, exp: 1000, gold: 1000, drops: [{ item: "dragonScale", chance: 100, min: 1, max: 3 }, { item: "rebirthStone", chance: 20, min: 1, max: 1 }] },
];

function rollRareMonster() {
  for (const rare of RARE_MONSTERS) {
    if (Math.random() * 100 < rare.chance) return { ...rare, isRare: true };
  }
  return null;
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("berburuv2", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastHuntV2");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("berburuv2", `Cooldown berburu tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < HUNT_ENERGY) {
      await m.react("🚫");
      return m.reply(novaRpgBox("berburuv2", `Energi kurang! Butuh *${HUNT_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, HUNT_ENERGY, sock);

    // Check for rare monster (5% total chance)
    let monster = rollRareMonster();
    if (!monster) {
      monster = getRandomMonster(rpg.level) || { name: "Wild Boar", hp: 100, atk: 15, def: 5, exp: 80, gold: 40 };
      monster.isRare = false;
    }

    // Combat
    const equip = getEquipStats(m);
    const playerAtk = rpg.atk + equip.atk;
    const playerDef = rpg.def + equip.def;
    let playerHp = rpg.hp;

    let mHp = monster.hp;
    const mAtk = monster.atk || 10;
    const mDef = monster.def || 0;

    let rounds = 0;
    let dmgTaken = 0;
    const log = [];

    await m.reply("🎯 Target ditemukan! Bersiap bertarung...");
    await rpgSleep(800);

    while (mHp > 0 && playerHp - dmgTaken > 0 && rounds < 15) {
      rounds++;
      const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
      const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - mDef / (mDef + 100))));
      mHp -= playerDmg;
      log.push(`R${rounds}: Hit ${playerDmg}${crit ? " CRIT" : ""}`);
      if (mHp <= 0) break;

      if (Math.random() * 100 < (rpg.evasion + equip.evasion)) {
        log.push(`R${rounds}: Dodge!`);
      } else {
        const mDmg = Math.max(1, Math.floor(mAtk * (1 - playerDef / (playerDef + 100))));
        dmgTaken += mDmg;
        log.push(`R${rounds}: M-Hit ${mDmg}`);
      }
    }

    const won = mHp <= 0;

    if (won) {
      // Combo system
      const combo = (rpg.huntCombo || 0) + 1;
      const comboBonus = Math.min(combo * 0.05, 0.5); // Max +50%

      const expGain = Math.floor((monster.exp || 80) * (1 + comboBonus));
      const goldGain = Math.floor((monster.gold || 40) * (1 + comboBonus));
      addExp(m, expGain);
      addGold(m, goldGain);

      // Drops
      let drops = [];
      if (monster.drops) {
        drops = rollDrop(monster.drops.map(d => ({ item: d.item, chance: d.chance, minQty: d.min, maxQty: d.max })), rpg.luck || 0, rpg.dropBonus || 0);
      } else {
        // Normal monster — small chance for common drops
        if (Math.random() < 0.4) {
          const commonDrops = ["rawMeat", "rawFish", "copperOre", "hpPotion"];
          const dropItem = commonDrops[Math.floor(Math.random() * commonDrops.length)];
          drops.push({ item: dropItem, qty: Math.floor(Math.random() * 2) + 1 });
        }
      }
      for (const d of drops) addItem(m, d.item, d.qty);

      const newHp = Math.max(1, rpg.hp - dmgTaken);
      saveRpg(m, {
        hp: newHp,
        huntCombo: combo,
        huntKills: (rpg.huntKills || 0) + 1,
        totalKills: (rpg.totalKills || 0) + 1,
        rareKills: monster.isRare ? (rpg.rareKills || 0) + 1 : (rpg.rareKills || 0),
      });

      setCooldown(m, "lastHuntV2", HUNT_COOLDOWN);

      const dropText = drops.map(d => `+${d.qty}x ${ITEM_DB[d.item]?.name || d.item}`).join(", ");

      await m.react("🐣");
      return m.reply(novaGameBox({
        title: "berburuv2", icon: "🏹",
        flavor: "🏆 *VICTORY!*",
        body: [
          `│ • 👹 Monster : ${monster.name}${monster.isRare ? " [RARE!]" : ""}`,
          `│ • ⚔️ Ronde : ${rounds}`,
          "",
          ...log.slice(-4),
          "",
          `│ • ✨ EXP : +${expGain}`,
          `│ • 💰 Gold : +${goldGain}`,
          ...(dropText ? [`│ • 📦 Drops : ${dropText}`] : []),
          ...(combo > 1 ? [`│ • 🔥 Combo : ${combo}x (bonus +${Math.floor(comboBonus * 100)}%)`] : []),
          ...(combo >= 5 ? ["🎯 Combo tinggi! Tetap berburu untuk bonus lebih besar!"] : []),
          `│ • ❤️ HP : ${newHp}/${rpg.maxHp}`,
          `│ • ⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}`,
        ].join("\n"),
        cta: gameCTA("berburuv2"),
      }));
    } else {
      // Defeat — combo resets
      saveRpg(m, {
        hp: Math.max(1, rpg.hp - dmgTaken),
        huntCombo: 0,
      });
      setCooldown(m, "lastHuntV2", HUNT_COOLDOWN);

      await m.react("❌");
      return m.reply(novaGameBox({
        title: "berburuv2", icon: "🏹",
        flavor: "💀 *DEFEATED!*",
        body: [
          `│ • 👹 Monster : ${monster.name}${monster.isRare ? " [RARE!]" : ""}`,
          `│ • ⚔️ Ronde : ${rounds}`,
          `│ • 💥 DMG diterima : ${dmgTaken}`,
          `│ • ❤️ HP : ${Math.max(1, rpg.hp - dmgTaken)}/${rpg.maxHp}`,
          "",
          "💡 Combo direset. Equip lebih kuat & coba lagi!",
        ].join("\n"),
        cta: gameCTA("berburuv2"),
      }));
    }
  } catch (err) {
    console.error("berburuv2 error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("berburuv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
