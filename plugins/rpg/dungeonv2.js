// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Dungeon v2 — Multi-floor dungeon with boss, keys, and party system

import {
  ensureRpg, saveRpg, addExp, addGold, addGems, useEnergy,
  addItem, getEquipStats, rollDrop, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  getMonstersByLevel, getRandomMonster
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "dungeonv2",
  alias: ["dungeonv2", "dg2", "raiddungeon"],
  category: "rpg",
  description: "Dungeon v2 — multi-floor dengan boss, bonus stage, dan loot tier",
  usage: ".dungeonv2 <enter|status|leave>",
  example: ".dungeonv2 enter",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const DG2_ENERGY = 25;
const DG2_COOLDOWN = 10 * 60 * 1000; // 10 menit
const MIN_LEVEL = 10;
const MAX_FLOORS = 7;

// Floor configs — makin dalam makin kuat
const FLOOR_CONFIG = [
  { floor: 1, monsterMult: 0.8, goldMult: 0.5, expMult: 0.5, name: "Lobby" },
  { floor: 2, monsterMult: 1.0, goldMult: 0.8, expMult: 0.8, name: "Koridor" },
  { floor: 3, monsterMult: 1.2, goldMult: 1.0, expMult: 1.0, name: "Ruang Sakral" },
  { floor: 4, monsterMult: 1.5, goldMult: 1.3, expMult: 1.3, name: "Kamar Terkutuk" },
  { floor: 5, monsterMult: 1.8, goldMult: 1.6, expMult: 1.6, name: "Deep Abyss" },
  { floor: 6, monsterMult: 2.2, goldMult: 2.0, expMult: 2.0, name: "Gerbang Boss" },
  { floor: 7, monsterMult: 3.0, goldMult: 3.0, expMult: 3.0, name: "Boss Room", isBoss: true },
];

// Boss drops (floor 7)
const BOSS_DROPS = [
  { item: "mithrilOre", chance: 80, minQty: 2, maxQty: 5 },
  { item: "goldOre", chance: 90, minQty: 3, maxQty: 8 },
  { item: "dragonScale", chance: 30, minQty: 1, maxQty: 2 },
  { item: "rebirthStone", chance: 5, minQty: 1, maxQty: 1 },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("dungeonv2", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Init dungeon state
    if (!rpg.dungeonV2) rpg.dungeonV2 = { active: false, floor: 0, clearLog: [] };

    // ── STATUS ──
    if (!action || action === "status") {
      if (!rpg.dungeonV2.active) {
        let msg = `╭─「 *ᴅᴜɴɢᴇᴏɴ ᴠ2* 」\n`;
        msg += `│ 📋 Status: *Idle*\n`;
        msg += `│ 👤 Level: *${rpg.level}* (min: ${MIN_LEVEL})\n`;
        msg += `│ ⚡ Energy: *${rpg.energy}/${rpg.maxEnergy}* (need: ${DG2_ENERGY})\n`;
        msg += `│\n`;
        msg += `│ 📊 *ᴅᴜɴɢᴇᴏɴ ɪɴғᴏ*\n`;
        msg += `│ Total floors: *${MAX_FLOORS}*\n`;
        msg += `│ Makin dalam = makin kuat & makin banyak reward\n`;
        msg += `│ Floor 7 = Boss Room (gems + rare drops)\n`;
        msg += `│\n`;
        msg += `│ 📌 .dungeonv2 enter — mulai dungeon\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      }

      let msg = `╭─「 *ᴅᴜɴɢᴇᴏɴ ᴠ2* 」\n`;
      msg += `│ 📊 Status: *Active*\n`;
      msg += `│ Floor: *${rpg.dungeonV2.floor}/${MAX_FLOORS}*\n`;
      msg += `│ Nama: *${FLOOR_CONFIG[rpg.dungeonV2.floor - 1]?.name || "?"}*\n`;
      msg += `│\n`;
      msg += `│ 📋 *ᴄʟᴇᴀʀ ʟᴏɢ*\n`;
      for (const log of rpg.dungeonV2.clearLog.slice(-5)) {
        msg += `│ ${log}\n`;
      }
      msg += `│\n`;
      msg += `│ 📌 .dungeonv2 enter — lanjut floor\n`;
      msg += `│ 📌 .dungeonv2 leave — keluar (kalah)\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    // ── LEAVE ──
    if (action === "leave" || action === "keluar") {
      if (!rpg.dungeonV2.active) {
        return m.reply(claraWrap("dungeonv2", "Kamu tidak sedang di dungeon.", "warn"));
      }
      rpg.dungeonV2 = { active: false, floor: 0, clearLog: [] };
      saveRpg(m, { dungeonV2: rpg.dungeonV2 });
      return m.reply(claraWrap("dungeonv2", "Kamu kabur dari dungeon. Semua progress hilang.", "warn"));
    }

    // ── ENTER / NEXT FLOOR ──
    if (action === "enter" || action === "mulai" || action === "next") {
      if (rpg.level < MIN_LEVEL) {
        await m.react("🚫");
        return m.reply(claraWrap("dungeonv2", `Butuh minimal *Level ${MIN_LEVEL}*. Level kamu: *${rpg.level}*.`, "warn"));
      }

      // Check if dungeon complete (all floors cleared)
      if (rpg.dungeonV2.active && rpg.dungeonV2.floor >= MAX_FLOORS) {
        // Dungeon clear — reset
        rpg.dungeonV2 = { active: false, floor: 0, clearLog: [] };
        saveRpg(m, { dungeonV2: rpg.dungeonV2 });
        setCooldown(m, "lastDungeonV2", DG2_COOLDOWN);
        return m.reply(claraWrap("dungeonv2", "Dungeon sudah selesai! Tunggu cooldown untuk masuk lagi.", "info"));
      }

      // Start new dungeon
      if (!rpg.dungeonV2.active) {
        const cd = checkCooldown(m, "lastDungeonV2");
        if (cd) {
          await m.react("🚫");
          return m.reply(claraWrap("dungeonv2", `Cooldown tersisa *${formatTime(cd)}*`, "warn"));
        }

        if (rpg.energy < DG2_ENERGY) {
          await m.react("🚫");
          return m.reply(claraWrap("dungeonv2", `Energi kurang! Butuh *${DG2_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
        }

        useEnergy(m, DG2_ENERGY, sock);
        rpg.dungeonV2 = { active: true, floor: 0, clearLog: [] };
      }

      // Advance to next floor
      rpg.dungeonV2.floor += 1;
      const floorConfig = FLOOR_CONFIG[rpg.dungeonV2.floor - 1];

      await m.react("🕒");

      // Combat
      const equip = getEquipStats(m);
      const playerAtk = rpg.atk + equip.atk;
      const playerDef = rpg.def + equip.def;
      let playerHp = rpg.hp;

      // Generate monster
      let monster = getRandomMonster(rpg.level);
      if (!monster) {
        monster = { name: "Dungeon Guard", hp: 200 + rpg.level * 15, atk: 20 + rpg.level * 2, def: 10 + rpg.level, exp: 100, gold: 50 };
      }

      let mHp = Math.floor(monster.hp * floorConfig.monsterMult);
      const mAtk = Math.floor((monster.atk || 20) * floorConfig.monsterMult);
      const mDef = Math.floor((monster.def || 5) * floorConfig.monsterMult);

      let rounds = 0;
      let dmgTaken = 0;
      const combatLog = [];

      while (mHp > 0 && playerHp - dmgTaken > 0 && rounds < 15) {
        rounds++;
        const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
        const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - mDef / (mDef + 100))));
        mHp -= playerDmg;
        combatLog.push(`R${rounds}: Hit ${playerDmg}${crit ? " CRIT" : ""}`);

        if (mHp <= 0) break;

        const mDmg = Math.max(1, Math.floor(mAtk * (1 - playerDef / (playerDef + 100))));
        if (Math.random() * 100 < (rpg.evasion + equip.evasion)) {
          combatLog.push(`R${rounds}: Dodge!`);
        } else {
          dmgTaken += mDmg;
          combatLog.push(`R${rounds}: M-Hit ${mDmg}`);
        }
      }

      const won = mHp <= 0;

      if (won) {
        const expGain = Math.floor((monster.exp || 100) * floorConfig.expMult);
        const goldGain = Math.floor((monster.gold || 50) * floorConfig.goldMult);
        addExp(m, expGain);
        addGold(m, goldGain);

        let drops = [];
        if (floorConfig.isBoss) {
          // Boss floor — special drops
          drops = rollDrop(BOSS_DROPS, rpg.luck || 0, rpg.dropBonus || 0);
          const gemGain = 3 + Math.floor(rpg.level / 10);
          addGems(m, gemGain);
        } else {
          // Normal drops
          if (Math.random() < 0.3) {
            const normalDrops = ["hpPotion", "mpPotion", "energyDrink", "goldOre", "ironOre"];
            const dropItem = normalDrops[Math.floor(Math.random() * normalDrops.length)];
            drops.push({ item: dropItem, qty: 1 });
            addItem(m, dropItem, 1);
          }
        }

        for (const d of drops) addItem(m, d.item, d.qty);

        const newHp = Math.max(1, rpg.hp - dmgTaken);
        rpg.dungeonV2.clearLog.push(`F${rpg.dungeonV2.floor}: ${floorConfig.name} — WIN (${rounds}r)`);

        saveRpg(m, {
          hp: newHp,
          dungeonV2: rpg.dungeonV2,
          dungeonKills: (rpg.dungeonKills || 0) + 1,
        });

        if (rpg.dungeonV2.floor >= MAX_FLOORS) {
          setCooldown(m, "lastDungeonV2", DG2_COOLDOWN);
        }

        let dropText = "";
        if (drops.length > 0) {
          dropText = drops.map(d => `+${d.qty}x ${ITEM_DB[d.item]?.name || d.item}`).join(", ");
        }

        await m.react("🐣");
        let msg = `╭─「 *ᴅᴜɴɢᴇᴏɴ ᴠ2* 」\n`;
        msg += `│ 🏰 Floor: *${rpg.dungeonV2.floor}/${MAX_FLOORS}* — ${floorConfig.name}\n`;
        msg += `│ 👹 Monster: *${monster.name}*\n`;
        msg += `│\n`;
        msg += `│ ⚔️ ${rounds} ronde bertarung\n`;
        for (const l of combatLog.slice(-4)) {
          msg += `│ ${l}\n`;
        }
        msg += `│\n`;
        msg += `│ 🏆 *ᴠɪᴄᴛᴏʀʏ!*\n`;
        msg += `│ ✦ EXP: *+${expGain}*\n`;
        msg += `│ 💰 Gold: *+${goldGain}*\n`;
        if (floorConfig.isBoss) {
          msg += `│ 💎 Gems: *+${3 + Math.floor(rpg.level / 10)}*\n`;
          msg += `│ 🎉 *BOSS DEFEATED!*\n`;
        }
        if (dropText) msg += `│ 📦 Drops: *${dropText}*\n`;
        msg += `│ ❤️ HP: *${newHp}/${rpg.maxHp}*\n`;
        msg += `│\n`;

        if (rpg.dungeonV2.floor < MAX_FLOORS) {
          msg += `│ 📌 .dungeonv2 enter — lanjut floor ${rpg.dungeonV2.floor + 1}\n`;
        } else {
          msg += `│ 🎉 *DUNGEON CLEARED!* Semua floor selesai!\n`;
          rpg.dungeonV2 = { active: false, floor: 0, clearLog: [] };
          saveRpg(m, { dungeonV2: rpg.dungeonV2 });
        }
        msg += `╰──────────`;
        return m.reply(msg);
      } else {
        // Defeat — dungeon ends
        const newHp = Math.max(1, rpg.hp - dmgTaken);
        rpg.dungeonV2 = { active: false, floor: 0, clearLog: [] };
        saveRpg(m, { hp: newHp, dungeonV2: rpg.dungeonV2 });
        setCooldown(m, "lastDungeonV2", DG2_COOLDOWN);

        await m.react("❌");
        let msg = `╭─「 *ᴅᴜɴɢᴇᴏɴ ᴠ2* 」\n`;
        msg += `│ 🏰 Floor: *${rpg.dungeonV2.floor}/${MAX_FLOORS}* — ${floorConfig.name}\n`;
        msg += `│ 👹 Monster: *${monster.name}*\n`;
        msg += `│\n`;
        msg += `│ 💀 *ᴅᴇғᴇᴀᴛᴇᴅ!*\n`;
        msg += `│ 💥 DMG diterima: *${dmgTaken}*\n`;
        msg += `│ ❤️ HP: *${newHp}/${rpg.maxHp}*\n`;
        msg += `│\n`;
        msg += `│ 💡 Equip item & level up untuk dungeon lebih dalam\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      }
    }

    return m.reply(claraWrap("dungeonv2", "Aksi tidak dikenal. Gunakan: enter, status, leave", "warn"));
  } catch (err) {
    console.error("dungeonv2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("dungeonv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
