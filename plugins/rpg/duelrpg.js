// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Duel — PvP 1v1 against another player

import {
  ensureRpg, saveRpg, getEquipStats, addExp, addGold,
  pvpResult, checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "duelrpg",
  alias: ["duelrpg", "pvp", "duel"],
  category: "rpg",
  description: "Duel PvP melawan player lain untuk EXP dan Gold",
  usage: ".duelrpg @tag",
  example: ".duelrpg @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const PVP_COOLDOWN = 5 * 60 * 1000;
const MIN_LEVEL = 5;

async function handler(m, { sock }) {
  try {
    // Cek target
    let targetJid = m.mentionedJid?.[0];
    if (!targetJid && m.quoted) targetJid = m.quoted.sender;

    if (!targetJid) {
      await m.react("🚫");
      return m.reply(claraWrap("duelrpg", "Tag lawan yang mau kamu duel!\nContoh: .duelrpg @user", "warn"));
    }

    if (targetJid === m.sender) {
      await m.react("🚫");
      return m.reply(claraWrap("duelrpg", "Nggak bisa duel sama diri sendiri 😅", "warn"));
    }

    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("duelrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (rpg.level < MIN_LEVEL) {
      await m.react("🚫");
      return m.reply(claraWrap("duelrpg", `Butuh minimal *Level ${MIN_LEVEL}* untuk duel. Level kamu: *${rpg.level}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastPvP");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("duelrpg", `Cooldown PvP tersisa *${formatTime(cd)}*`, "warn"));
    }

    // Init lawan
    const targetRpg = ensureRpg({ sender: targetJid }, targetJid.split("@")[0]);
    if (!targetRpg) return m.reply(claraWrap("duelrpg", "Lawan belum terdaftar di RPG.", "warn"));

    if (targetRpg.level < MIN_LEVEL) {
      await m.react("🚫");
      return m.reply(claraWrap("duelrpg", `Lawan belum *Level ${MIN_LEVEL}*. Level lawan: *${targetRpg.level}*.`, "warn"));
    }

    // Combat stats
    const myEquip = getEquipStats(m);
    const enemyEquip = getEquipStats({ sender: targetJid });

    const myAtk = rpg.atk + myEquip.atk;
    const myDef = rpg.def + myEquip.def;
    const mySpd = rpg.spd + myEquip.spd;
    let myHp = rpg.hp;

    const enemyAtk = targetRpg.atk + enemyEquip.atk;
    const enemyDef = targetRpg.def + enemyEquip.def;
    const enemySpd = targetRpg.spd + enemyEquip.spd;
    let enemyHp = targetRpg.hp;

    // Simulasi pertarungan
    const log = [];
    let rounds = 0;
    const maxRounds = 15;
    let firstAttacker = mySpd >= enemySpd ? "me" : "enemy";

    while (myHp > 0 && enemyHp > 0 && rounds < maxRounds) {
      rounds++;

      if (firstAttacker === "me") {
        // Aku serang
        const crit = Math.random() * 100 < (rpg.critRate + myEquip.critRate);
        const dmg = Math.max(1, Math.floor(myAtk * (crit ? 1.5 : 1) * (1 - enemyDef / (enemyDef + 100))));
        const dodged = Math.random() * 100 < (targetRpg.evasion + enemyEquip.evasion);
        if (!dodged) {
          enemyHp -= dmg;
          log.push(`R${rounds}: ${m.pushName} hit ${dmg}${crit ? " (CRIT!)" : ""}`);
        } else {
          log.push(`R${rounds}: ${targetJid.split("@")[0]} dodge!`);
        }

        if (enemyHp <= 0) break;

        // Lawan serang
        const eCrit = Math.random() * 100 < (targetRpg.critRate + enemyEquip.critRate);
        const eDmg = Math.max(1, Math.floor(enemyAtk * (eCrit ? 1.5 : 1) * (1 - myDef / (myDef + 100))));
        const myDodge = Math.random() * 100 < (rpg.evasion + myEquip.evasion);
        if (!myDodge) {
          myHp -= eDmg;
          log.push(`R${rounds}: ${targetJid.split("@")[0]} hit ${eDmg}${eCrit ? " (CRIT!)" : ""}`);
        } else {
          log.push(`R${rounds}: ${m.pushName} dodge!`);
        }
      } else {
        // Lawan serang duluan
        const eCrit = Math.random() * 100 < (targetRpg.critRate + enemyEquip.critRate);
        const eDmg = Math.max(1, Math.floor(enemyAtk * (eCrit ? 1.5 : 1) * (1 - myDef / (myDef + 100))));
        const myDodge = Math.random() * 100 < (rpg.evasion + myEquip.evasion);
        if (!myDodge) {
          myHp -= eDmg;
          log.push(`R${rounds}: ${targetJid.split("@")[0]} hit ${eDmg}${eCrit ? " (CRIT!)" : ""}`);
        } else {
          log.push(`R${rounds}: ${m.pushName} dodge!`);
        }

        if (myHp <= 0) break;

        // Aku serang
        const crit = Math.random() * 100 < (rpg.critRate + myEquip.critRate);
        const dmg = Math.max(1, Math.floor(myAtk * (crit ? 1.5 : 1) * (1 - enemyDef / (enemyDef + 100))));
        const dodged = Math.random() * 100 < (targetRpg.evasion + enemyEquip.evasion);
        if (!dodged) {
          enemyHp -= dmg;
          log.push(`R${rounds}: ${m.pushName} hit ${dmg}${crit ? " (CRIT!)" : ""}`);
        } else {
          log.push(`R${rounds}: ${targetJid.split("@")[0]} dodge!`);
        }
      }
    }

    const iWon = myHp > 0 && enemyHp <= 0;
    const draw = myHp > 0 && enemyHp > 0; // timeout

    let expGain = 0;
    let goldGain = 0;

    if (!draw) {
      // PvP result
      const result = pvpResult(m, iWon, targetRpg.pvpRating || 1000);
      expGain = Math.floor(50 + rpg.level * 5);
      goldGain = Math.floor(30 + rpg.level * 3);

      if (iWon) {
        addExp(m, expGain);
        addGold(m, goldGain);
      } else {
        // Kalah: kalah sedikit gold
        const lost = Math.min(rpg.gold, Math.floor(goldGain * 0.5));
        if (lost > 0) {
          rpg.gold -= lost;
          goldGain = -lost;
        }
      }

      // Save HP
      saveRpg(m, { hp: Math.max(1, myHp) });

      // Save enemy HP
      saveRpg({ sender: targetJid }, { hp: Math.max(1, enemyHp) });

      // PvP record untuk lawan
      const enemyResult = pvpResult({ sender: targetJid }, !iWon, rpg.pvpRating || 1000);
    }

    setCooldown(m, "lastPvP", PVP_COOLDOWN);

    await m.react("🐣");
    let msg = `╭─「 ✦ ᴅᴜᴇʟ ʀᴘɢ ✦ 」\n`;
    msg += `│ ⚔️ ${m.pushName} vs ${targetJid.split("@")[0]}\n`;
    msg += `│\n`;

    // Combat log (5 terakhir)
    const recentLog = log.slice(-5);
    for (const l of recentLog) {
      msg += `│ ${l}\n`;
    }
    msg += `│\n`;

    if (draw) {
      msg += `│ 🤝 *Hasil: Seri!* (Timeout ${maxRounds} ronde)\n`;
      msg += `│ Tidak ada reward untuk kedua pihak\n`;
    } else if (iWon) {
      msg += `│ 🏆 *Hasil: ${m.pushName} Menang!*\n`;
      msg += `│ ✦ EXP: *+${expGain}*\n`;
      msg += `│ 💰 Gold: *+${goldGain}*\n`;
      msg += `│ 📊 Rating: *${rpg.pvpRating + (iWon ? 15 : 0)}*\n`;
    } else {
      msg += `│ 💀 *Hasil: ${m.pushName} Kalah!*\n`;
      msg += `│ 💰 Gold: *${goldGain}*\n`;
      msg += `│ 📊 Rating: *${rpg.pvpRating - 15}*\n`;
    }
    msg += `│\n`;
    msg += `│ ❤️ HP kamu: *${Math.max(1, myHp)}/${rpg.maxHp}*\n`;
    msg += `╰────  •  ────`;

    return m.reply(msg);
  } catch (err) {
    console.error("duelrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("duelrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
