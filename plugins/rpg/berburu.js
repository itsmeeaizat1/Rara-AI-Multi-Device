// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Berburu — Hunt monsters for EXP, Gold, and item drops

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, regenHP,
  addItem, getEquipStats, getRandomMonster, rollDrop, ITEM_DB,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
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
const HUNT_COOLDOWN = 60 * 1000; // 1 menit

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("berburu", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // Cek cooldown
    const cd = checkCooldown(m, "lastHunt");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("berburu", `Sabar, cooldown berburu tersisa *${formatTime(cd)}*`, "warn"));
    }

    // Cek energy
    if (rpg.energy < HUNT_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("berburu", `Energi kurang! Butuh *${HUNT_ENERGY} energy* untuk berburu. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    // Pilih monster sesuai level
    const monster = getRandomMonster(rpg.level);
    if (!monster) {
      await m.react("❌");
      return m.reply(claraWrap("berburu", "Tidak ada monster yang cocok untuk level kamu saat ini.", "error"));
    }

    // Hitung combat
    useEnergy(m, HUNT_ENERGY, sock);
    const equip = getEquipStats(m);
    const playerAtk = rpg.atk + equip.atk + (rpg.lifesteal || 0);
    const playerDef = rpg.def + equip.def;
    const playerHp = rpg.hp;

    // Simulasi pertarungan
    let monsterHp = monster.hp;
    let playerDmgTaken = 0;
    let rounds = 0;
    const maxRounds = 10;

    while (monsterHp > 0 && playerDmgTaken < playerHp && rounds < maxRounds) {
      // Player attack
      const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
      const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - monster.def / (monster.def + 100))));
      monsterHp -= playerDmg;
      rounds++;

      if (monsterHp <= 0) break;

      // Monster attack
      const monsterDmg = Math.max(1, Math.floor(monster.atk * (1 - playerDef / (playerDef + 100))));
      // Evasion check
      if (Math.random() * 100 < (rpg.evasion + equip.evasion)) {
        // Dodged!
      } else {
        playerDmgTaken += monsterDmg;
      }
    }

    const won = monsterHp <= 0;

    if (won) {
      // Reward
      const expGain = Math.floor(monster.exp * (1 + (rpg.expBonus || 0) / 100));
      const goldGain = Math.floor(monster.gold * (1 + (rpg.goldFind || 0) / 100));
      const drops = rollDrop(monster.drops || [], rpg.luck || 0, rpg.dropBonus || 0);

      addExp(m, expGain);
      addGold(m, goldGain);
      for (const drop of drops) {
        addItem(m, drop.item, drop.qty);
      }

      // HP berkurang
      const newHp = Math.max(1, rpg.hp - playerDmgTaken);
      saveRpg(m, { hp: newHp });
      setCooldown(m, "lastHunt", HUNT_COOLDOWN);

      let dropText = "";
      if (drops.length > 0) {
        dropText = drops.map(d => `+${d.qty}x ${ITEM_DB[d.item]?.name || d.item}`).join("\n│ ");
        dropText = "\n│ " + dropText;
      }

      await m.react("🐣");
      let msg = `╭─「 ʙᴇʀʙᴜʀᴜ 」\n`;
      msg += `│ 🎯 Monster: *${monster.name}* (Lv.${monster.minLv}-${monster.maxLv})\n`;
      msg += `│ ⚔️ Pertarungan: *${rounds} ronde*\n`;
      msg += `│ 💥 DMG diterima: *${playerDmgTaken}*\n`;
      msg += `│ ❤️ HP tersisa: *${newHp}/${rpg.maxHp}*\n`;
      msg += `│\n`;
      msg += `│ 📦 *ʀᴇᴡᴀʀᴅ*\n`;
      msg += `│ ✦ EXP: *+${expGain}*\n`;
      msg += `│ 💰 Gold: *+${goldGain}*\n`;
      if (dropText) msg += dropText + "\n";
      msg += `╰──────────`;

      return m.reply(msg);
    } else {
      // Kalah
      const newHp = Math.max(1, rpg.hp - playerDmgTaken);
      saveRpg(m, { hp: newHp });
      setCooldown(m, "lastHunt", HUNT_COOLDOWN);

      await m.react("❌");
      let msg = `╭─「 ʙᴇʀʙᴜʀᴜ 」\n`;
      msg += `│ 😵 Kamu kalah melawan *${monster.name}*!\n`;
      msg += `│ 💥 DMG diterima: *${playerDmgTaken}*\n`;
      msg += `│ ❤️ HP tersisa: *${newHp}/${rpg.maxHp}*\n`;
      msg += `│\n`;
      msg += `│ 💡 Tingkatkan equipment atau level dulu\n`;
      msg += `│ sebelum berburu monster yang lebih kuat\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }
  } catch (err) {
    console.error("berburu error:", err);
    await m.react("❌");
    return m.reply(claraWrap("berburu", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
