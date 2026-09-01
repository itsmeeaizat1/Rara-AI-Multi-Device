// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// weeklyboss.js — Weekly Boss Raid (global boss, everyone contributes)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "weeklyboss",
  alias: ["weeklyboss", "bossraidweekly", "wboss", "raidboss2"],
  category: "rpg",
  description: "Weekly Boss Raid — boss global, semua player kontribusi",
  usage: ".weeklyboss (info boss)\n.weeklyboss attack (serang boss)",
  example: ".weeklyboss attack",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 5, isEnabled: true,
};

const BOSS_POOL = [
  { name: "Ancient Dragon", emoji: "🐉", hp: 100000, atk: 500 },
  { name: "Demon Lord", emoji: "😈", hp: 150000, atk: 700 },
  { name: "Kraken King", emoji: "🐙", hp: 120000, atk: 600 },
  { name: "Death Emperor", emoji: "💀", hp: 200000, atk: 1000 },
  { name: "Phoenix Overlord", emoji: "🔥", hp: 130000, atk: 800 },
];

function getWeekKey() {
  const d = new Date();
  return `${d.getFullYear()}-${Math.ceil(d.getMonth()/3+1)}-W${Math.ceil(d.getDate()/7)}`;
}

// Global boss state
let bossState = { week: null, boss: null, hp: 0, maxHp: 0, contributors: new Map(), defeated: false };

function initBoss() {
  const week = getWeekKey();
  if (bossState.week !== week || !bossState.boss) {
    const boss = BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)];
    bossState = {
      week, boss, hp: boss.hp, maxHp: boss.hp,
      contributors: new Map(), defeated: false,
    };
  }
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    initBoss();

    if (bossState.defeated) {
      return m.reply(claraWrap("weeklyboss", `🏆 Boss minggu ini sudah dikalahkan!\nBoss: ${bossState.boss.emoji} *${bossState.boss.name}*\n\nTunggu minggu depan untuk boss baru!`, "guide"));
    }

    if (subCmd === "attack" || subCmd === "serang" || subCmd === "fight") {
      // Cek energi
      try {
        const energi = await db.getEnergi?.(m.sender) || 100;
        if (energi < 20) {
          await m.react("❌");
          return m.reply(claraWrap("weeklyboss", "Energi kurang! Butuh 20 energi untuk serang.", "error"));
        }
        await db.minEnergi?.(m.sender, 20);
      } catch {}

      await m.react("🕒");

      // Calculate damage
      const baseDmg = 100 + Math.floor(Math.random() * 900);
      const crit = Math.random() < 0.15;
      const damage = crit ? baseDmg * 2 : baseDmg;

      // Boss counter-attack
      const bossDmg = Math.floor(Math.random() * bossState.boss.atk * 0.3);
      try { await db.minGold?.(m.sender, bossDmg); } catch {}

      bossState.hp = Math.max(0, bossState.hp - damage);

      // Track contribution
      const current = bossState.contributors.get(m.sender) || { name: m.pushName, damage: 0, hits: 0 };
      current.damage += damage;
      current.hits++;
      bossState.contributors.set(m.sender, current);

      await m.react("🐣");

      const hpPct = Math.floor((bossState.hp / bossState.maxHp) * 100);
      const hpBar = "█".repeat(Math.floor(hpPct/10)) + "░".repeat(10 - Math.floor(hpPct/10));

      let msg = `╭─「 ʙᴏss ʀᴀɪᴅ 」\n`;
      msg += `│ Boss: ${bossState.boss.emoji} *${bossState.boss.name}*\n`;
      msg += `│ HP: [${hpBar}] ${bossState.hp.toLocaleString()}/${bossState.maxHp.toLocaleString()}\n`;
      msg += `│\n`;
      msg += `│ ⚔️ Damage: *${damage}*${crit ? " 💥 CRITICAL!" : ""}\n`;
      msg += `│ 🛡️ Boss counter: *-${bossDmg} gold*\n`;
      msg += `│ Total kontribusi: *${current.damage.toLocaleString()}* (${current.hits} hits)\n`;
      msg += `╰──────────`;

      // Check if defeated
      if (bossState.hp === 0) {
        bossState.defeated = true;
        // Reward top 3
        const sorted = [...bossState.contributors.entries()].sort((a, b) => b[1].damage - a[1].damage);
        const prizePool = 50000;
        let bonusMsg = `\n\n╭─「 ʙᴏss ᴅᴇғᴇᴀᴛᴇᴅ! 」\n`;
        bonusMsg += `│ 🏆 Top Contributors:\n`;
        sorted.slice(0, 3).forEach(([id, c], i) => {
          const reward = [20000, 10000, 5000][i];
          bonusMsg += `│ ${i+1}. ${c.name} - ${c.damage.toLocaleString()} dmg (+${reward}g)\n`;
          if (id === m.sender) { try { db.addGold?.(id, reward); } catch {} }
        });
        bonusMsg += `╰──────────`;
        return m.reply(msg + bonusMsg);
      }
      return m.reply(msg);
    }

    // INFO (default)
    const hpPct = Math.floor((bossState.hp / bossState.maxHp) * 100);
    const hpBar = "█".repeat(Math.floor(hpPct/10)) + "░".repeat(10 - Math.floor(hpPct/10));

    let msg = `╭─「 ᴡᴇᴇᴋʟʏ ʙᴏss 」\n`;
    msg += `│ Boss: ${bossState.boss.emoji} *${bossState.boss.name}*\n`;
    msg += `│ ATK: *${bossState.boss.atk}*\n`;
    msg += `│ HP: [${hpBar}] ${bossState.hp.toLocaleString()}/${bossState.maxHp.toLocaleString()}\n`;
    msg += `│\n`;
    msg += `│ Contributors: *${bossState.contributors.size}*\n`;
    if (bossState.contributors.size > 0) {
      const sorted = [...bossState.contributors.entries()].sort((a, b) => b[1].damage - a[1].damage);
      sorted.slice(0, 5).forEach(([id, c], i) => {
        msg += `│ ${i+1}. ${c.name} - ${c.damage.toLocaleString()} dmg\n`;
      });
    }
    msg += `│\n`;
    msg += `│ ${m.prefix}weeklyboss attack - serang! (20 energi)\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("weeklyboss error:", err);
    await m.react("❌");
    return m.reply(claraWrap("weeklyboss", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
