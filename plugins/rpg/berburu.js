// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Berburu — Hunt monsters for EXP, Gold, and item drops (animated combat)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, regenHP,
  addItem, getEquipStats, getRandomMonster, rollDrop, ITEM_DB,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { animBattle, rpgSleep } from "../../src/lib/nova-rpg-anim.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "berburu",
  alias: ["berburu", "hunt"],
  category: "rpg",
  description: "Berburu monster untuk EXP, Gold, dan item drop",
  usage: ".berburu",
  example: ".berburu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const HUNT_ENERGY = 10;
const HUNT_COOLDOWN = 60 * 1000;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("berburu", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastHunt");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("berburu", `Sabar, cooldown berburu tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < HUNT_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("berburu", `Energi kurang! Butuh *${HUNT_ENERGY} energy* untuk berburu. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    const monster = getRandomMonster(rpg.level);
    if (!monster) {
      await m.react("❌");
      return m.reply(claraWrap("berburu", "Tidak ada monster yang cocok untuk level kamu saat ini.", "error"));
    }

    useEnergy(m, HUNT_ENERGY, sock);
    const equip = getEquipStats(m);
    const playerAtk = rpg.atk + equip.atk + (rpg.lifesteal || 0);
    const playerDef = rpg.def + equip.def;
    const playerHp = rpg.hp;

    // Battle intro
    await m.reply(`🎯 Ditemukan *${monster.name}* (Lv.${monster.minLv}-${monster.maxLv})!\n⚔️ Bersiap bertarung...`);
    await rpgSleep(800);

    // Simulasi pertarungan dengan animasi
    let monsterHp = monster.hp;
    let playerDmgTaken = 0;
    let rounds = 0;
    const maxRounds = 10;
    const combatLog = [];

    while (monsterHp > 0 && playerDmgTaken < playerHp && rounds < maxRounds) {
      const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
      const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - monster.def / (monster.def + 100))));
      monsterHp -= playerDmg;
      rounds++;

      let monsterDmg = 0;
      let dodged = false;

      if (monsterHp <= 0) {
        combatLog.push({ dmg: playerDmg, crit, monsterDmg: 0, monsterHp, dodged: false });
        break;
      }

      monsterDmg = Math.max(1, Math.floor(monster.atk * (1 - playerDef / (playerDef + 100))));
      if (Math.random() * 100 < (rpg.evasion + equip.evasion)) {
        dodged = true;
      } else {
        playerDmgTaken += monsterDmg;
      }

      combatLog.push({ dmg: playerDmg, crit, monsterDmg: dodged ? 0 : monsterDmg, monsterHp, dodged });
    }

    // Send battle animation (max 4 messages to avoid spam)
    const logSlice = combatLog.slice(0, 4);
    await animBattle(m, sock, m.pushName || "Player", monster.name, logSlice);
    if (combatLog.length > 4) {
      await m.reply(`┊ ...dan ${combatLog.length - 4} ronde lagi!`);
      await rpgSleep(500);
    }

    const won = monsterHp <= 0;

    if (won) {
      const expGain = Math.floor(monster.exp * (1 + (rpg.expBonus || 0) / 100));
      const goldGain = Math.floor(monster.gold * (1 + (rpg.goldFind || 0) / 100));
      const drops = rollDrop(monster.drops || [], rpg.luck || 0, rpg.dropBonus || 0);

      addExp(m, expGain);
      addGold(m, goldGain);
      for (const drop of drops) addItem(m, drop.item, drop.qty);

      const newHp = Math.max(1, rpg.hp - playerDmgTaken);
      saveRpg(m, { hp: newHp });
      setCooldown(m, "lastHunt", HUNT_COOLDOWN);

      let dropText = "";
      if (drops.length > 0) {
        dropText = drops.map(d => `│ +${d.qty}x ${ITEM_DB[d.item]?.name || d.item}`).join("\n");
      }

      await m.react("🐣");
      let msg = `╭─「 ✦ ʜᴜɴᴛ ʙᴇʀʜᴀsɪʟ ✦ 」\n`;
      msg += `│ 🐉 Monster: *${monster.name}*\n`;
      msg += `│ ⚔️ Ronde: *${rounds}*\n`;
      msg += `│ 💔 DMG Diterima: *${playerDmgTaken}*\n`;
      msg += `│\n`;
      msg += `│ ✦ EXP  : *+${expGain}*\n`;
      msg += `│ 💰 Gold : *+${goldGain}*\n`;
      if (dropText) msg += dropText + "\n";
      msg += `│\n`;
      msg += `│ ❤️ HP: *${newHp}/${rpg.maxHp}*\n`;
      msg += `│ ⚡ Energy: *${rpg.energy - HUNT_ENERGY}/${rpg.maxEnergy}*\n`;
      msg += `╰──── • ────`;
      return m.reply(msg);
    } else {
      const newHp = Math.max(1, rpg.hp - playerDmgTaken);
      saveRpg(m, { hp: newHp });
      setCooldown(m, "lastHunt", HUNT_COOLDOWN);

      await m.react("❌");
      let msg = `╭─「 ❌ ʜᴜɴᴛ ɢᴀɢᴀʟ ✦ 」\n`;
      msg += `│ 🐉 Monster: *${monster.name}*\n`;
      msg += `│ 💔 DMG Diterima: *${playerDmgTaken}*\n`;
      msg += `│ ❤️ HP: *${newHp}/${rpg.maxHp}*\n`;
      msg += `│\n`;
      msg += `│ 💡 Tingkatkan equipment atau level dulu!\n`;
      msg += `╰──── • ────`;
      return m.reply(msg);
    }
  } catch (err) {
    console.error("berburu error:", err);
    await m.react("❌");
    return m.reply(claraWrap("berburu", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
