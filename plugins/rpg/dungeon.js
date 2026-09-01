// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Dungeon — Explore dungeon for big rewards (high risk)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, useMana,
  addItem, getEquipStats, getRandomMonster, rollDrop, ITEM_DB,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "dungeon",
  alias: ["dungeon", "dg"],
  category: "rpg",
  description: "Jelajahi dungeon untuk hadiah besar (high risk, high reward)",
  usage: ".dungeon",
  example: ".dungeon",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const DG_ENERGY = 20;
const DG_COOLDOWN = 10 * 60 * 1000; // 10 menit
const DG_MIN_LEVEL = 10;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("dungeon", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (rpg.level < DG_MIN_LEVEL) {
      await m.react("🚫");
      return m.reply(claraWrap("dungeon", `Butuh minimal *Level ${DG_MIN_LEVEL}* untuk masuk dungeon. Level kamu: *${rpg.level}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastDungeon");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("dungeon", `Cooldown dungeon tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < DG_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("dungeon", `Energi kurang! Butuh *${DG_ENERGY} energy*. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    // Cek kunci dungeon
    const hasKey = rpg.inventory?.dungeonKey?.qty > 0;
    if (hasKey) {
      // Pakai kunci
      rpg.inventory.dungeonKey.qty -= 1;
      if (rpg.inventory.dungeonKey.qty <= 0) delete rpg.inventory.dungeonKey;
    }

    useEnergy(m, DG_ENERGY, sock);

    // Dungeon: 3 stage dengan monster makin kuat
    const equip = getEquipStats(m);
    const playerAtk = rpg.atk + equip.atk;
    const playerDef = rpg.def + equip.def;
    let playerHp = rpg.hp;
    let totalExp = 0;
    let totalGold = 0;
    let totalDrops = [];
    let stagesCleared = 0;

    const baseLevel = Math.max(rpg.level, 10);
    const stageCount = hasKey ? 5 : 3; // Kunci = 5 stage, tanpa kunci = 3

    for (let stage = 1; stage <= stageCount; stage++) {
      const monster = getRandomMonster(baseLevel + stage * 5);
      if (!monster) break;

      let monsterHp = monster.hp * (1 + stage * 0.3);
      let monsterAtk = monster.atk * (1 + stage * 0.2);
      let monsterDef = monster.def + stage * 2;
      let rounds = 0;
      let dmgTaken = 0;

      while (monsterHp > 0 && playerHp - dmgTaken > 0 && rounds < 15) {
        const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
        const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - monsterDef / (monsterDef + 100))));
        monsterHp -= playerDmg;
        rounds++;

        if (monsterHp <= 0) break;

        const monsterDmg = Math.max(1, Math.floor(monsterAtk * (1 - playerDef / (playerDef + 100))));
        if (Math.random() * 100 < (rpg.evasion + equip.evasion)) continue;
        dmgTaken += monsterDmg;
      }

      if (monsterHp <= 0) {
        stagesCleared++;
        const sExp = Math.floor(monster.exp * (1 + stage * 0.5) * (1 + (rpg.expBonus || 0) / 100));
        const sGold = Math.floor(monster.gold * (1 + stage * 0.5) * (1 + (rpg.goldFind || 0) / 100));
        const sDrops = rollDrop(monster.drops || [], rpg.luck || 0, rpg.dropBonus || 0);

        totalExp += sExp;
        totalGold += sGold;
        for (const d of sDrops) {
          totalDrops.push(d);
          addItem(m, d.item, d.qty);
        }

        playerHp -= dmgTaken;
        if (playerHp <= 0) break;
      } else {
        playerHp -= dmgTaken;
        break;
      }
    }

    // Apply rewards
    if (stagesCleared > 0) {
      addExp(m, totalExp);
      addGold(m, totalGold);
    }

    // Boss bonus: clear semua stage
    let bossBonus = "";
    if (stagesCleared === stageCount) {
      const bonusGold = totalGold * 2;
      const bonusExp = totalExp * 2;
      addGold(m, bonusGold);
      addExp(m, bonusExp);
      bossBonus = `\n│ 👑 *ʙᴏss ʙᴏɴᴜs* — Clear all stages!\n│ 💰 +${bonusGold} gold | ✦ +${bonusExp} EXP\n`;
    }

    // Save HP
    const newHp = Math.max(1, playerHp);
    saveRpg(m, { hp: newHp });
    setCooldown(m, "lastDungeon", DG_COOLDOWN);

    let dropText = "";
    if (totalDrops.length > 0) {
      const grouped = {};
      for (const d of totalDrops) {
        grouped[d.item] = (grouped[d.item] || 0) + d.qty;
      }
      dropText = Object.entries(grouped).map(([item, qty]) => `+${qty}x ${ITEM_DB[item]?.name || item}`).join("\n│ ");
      dropText = "\n│ " + dropText;
    }

    await m.react("🐣");
    let msg = `╭─「 *ᴅᴜɴɢᴇᴏɴ* 」\n`;
    msg += `│ 🏰 Stage cleared: *${stagesCleared}/${stageCount}*\n`;
    msg += `│ ${hasKey ? "🔑 Dungeon Key digunakan (+2 stage)" : "⚠️ Tanpa kunci (max 3 stage)"}\n`;
    msg += `│\n`;
    msg += `│ 📦 *ʀᴇᴡᴀʀᴅ*\n`;
    msg += `│ ✦ EXP: *+${totalExp}*\n`;
    msg += `│ 💰 Gold: *+${totalGold}*\n`;
    if (dropText) msg += dropText + "\n";
    if (bossBonus) msg += bossBonus;
    msg += `│\n`;
    msg += `│ ❤️ HP: *${newHp}/${rpg.maxHp}*\n`;
    msg += `│ ⚡ Energy: *${rpg.energy - DG_ENERGY}/${rpg.maxEnergy}*\n`;
    msg += `╰──────────`;

    return m.reply(msg);
  } catch (err) {
    console.error("dungeon error:", err);
    await m.react("❌");
    return m.reply(claraWrap("dungeon", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
