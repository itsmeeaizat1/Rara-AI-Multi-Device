// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import {
  getPlayer,
  ensurePlayer,
  addGold,
  addExp,
  savePlayer,
} from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "dailystreak",
  alias: ["streak", "loginstreak", "streakrpg"],
  category: "economy",
  description: "Klaim bonus login streak harian - makin sering makin besar!",
  usage: ".dailystreak",
  example: ".dailystreak",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const BASE_GOLD = 100;
const BASE_EXP = 30;
const STREAK_MULT = 0.15;
const MAX_STREAK = 30;
const MILESTONE_BONUS = { 7: 500, 14: 1500, 21: 3000, 30: 10000 };

function getDaysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const player = ensurePlayer(m, m.pushName || "Player");
    if (!player) {
      return m.reply(claraWrap("Daily Streak", "Belum terdaftar di RPG. Ketik .daftarrpg dulu."));
    }

    const today = new Date().toISOString().slice(0, 10);
    const streakData = player.streak || { count: 0, lastClaim: null, bestStreak: 0 };

    if (streakData.lastClaim === today) {
      let lines = "  ┊  ➶ Kamu sudah klaim streak hari ini!\n";
      lines += `  ┊  ➶ Streak sekarang: ${streakData.count} hari\n`;
      lines += `  ┊  ➶ Best streak: ${streakData.bestStreak} hari\n`;
      lines += tipText("Kembali besok untuk lanjut streak");
      return m.reply(claraWrap("Daily Streak", lines));
    }

    if (streakData.lastClaim) {
      const gap = getDaysBetween(streakData.lastClaim, today);
      if (gap === 1) {
        streakData.count += 1;
      } else if (gap > 1) {
        streakData.count = 1;
      }
    } else {
      streakData.count = 1;
    }

    if (streakData.count > streakData.bestStreak) {
      streakData.bestStreak = streakData.count;
    }

    let multipler = 1 + (streakData.count - 1) * STREAK_MULT;
    let goldReward = Math.floor(BASE_GOLD * multipler);
    let expReward = Math.floor(BASE_EXP * multipler);

    let milestone = MILESTONE_BONUS[streakData.count];
    let bonusText = "";
    if (milestone) {
      goldReward += milestone;
      bonusText = `\n  ┊  ➶ *MILESTONE ${streakData.count} HARI!* Bonus +${milestone.toLocaleString()} gold`;
    }

    addGold(m, goldReward);
    addExp(m, expReward);

    streakData.lastClaim = today;
    savePlayer(m, { streak: streakData });

    let lines = `  ┊  ➶ *Daily Streak Claimed!*\n`;
    lines += `  ┊  ➶ Streak: ${streakData.count} hari\n`;
    lines += `  ┊  ➶ Best streak: ${streakData.bestStreak} hari\n`;
    lines += `  ┊  ➶ Multiplier: ${multipler.toFixed(2)}x\n\n`;
    lines += `  ┊  ➶ Gold: +${goldReward.toLocaleString()}\n`;
    lines += `  ┊  ➶ EXP: +${expReward.toLocaleString()}`;
    if (bonusText) lines += bonusText;

    lines += "\n\n";
    if (streakData.count < MAX_STREAK) {
      const nextMult = 1 + streakData.count * STREAK_MULT;
      lines += `  ┊  ➶ Besok: ${(BASE_GOLD * nextMult).toFixed(0)} gold + ${(BASE_EXP * nextMult).toFixed(0)} exp\n`;
      lines += tipText("Jangan skip hari ya, streak bisa reset!");
    } else {
      lines += tipText("Streak maksimal! Pertahankan terus!");
    }

    return m.reply(claraWrap("Daily Streak", lines));
  } catch (error) {
    return m.reply(claraWrap("Daily Streak", `Error: ${error.message}`));
  }
}

export { pluginConfig as config, handler };
