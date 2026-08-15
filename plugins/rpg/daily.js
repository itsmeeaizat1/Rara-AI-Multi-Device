// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  getPlayer,
  ensurePlayer,
  addGold,
  addExp,
  savePlayer,
} from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "daily",
  alias: ["dailyreward", "hadiahharian", "claimharian"],
  category: "economy",
  description: "Klaim hadiah gold & exp harian dengan streak bonus",
  usage: ".daily",
  example: ".daily",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Base reward
const BASE_GOLD = 200;
const BASE_EXP = 50;

// Streak bonus per consecutive day
const STREAK_BONUS_GOLD = 50;
const STREAK_BONUS_EXP = 10;

// Max streak for bonus (resets after this)
const MAX_STREAK = 7;

// Premium bonus multiplier
const PREMIUM_MULT = 2;

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getYesterdayKey() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getStreak(player) {
  const lastDaily = player?.lastDaily;
  if (!lastDaily) return 0;
  // Convert "YYYY-M-D" to "YYYY-MM-DD" for comparison
  const [y, m, d] = lastDaily.split("-").map(Number);
  const lastDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (lastDate === yesterday) {
    // Consecutive day
    const streak = player?.dailyStreak || 0;
    return Math.min(streak + 1, MAX_STREAK);
  }
  // Streak broken
  return 1;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const db = getDatabase();
    const userName = m.pushName || "Player";
    const isPremium = m.isPremium || false;

    // Ensure player exists
    const player = ensurePlayer(m, userName);
    if (!player) {
      return m.reply(claraWrap("Daily", "Belum terdaftar di RPG. Ketik .daftarrpg dulu.", "warn"));
    }

    const today = getTodayKey();
    const lastDaily = player.lastDaily || "";

    // Already claimed today
    if (lastDaily === today) {
      // Calculate time until midnight
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursLeft = Math.floor((tomorrow - now) / 3600000);
      const minsLeft = Math.floor(((tomorrow - now) % 3600000) / 60000);

      const streak = player.dailyStreak || 0;

      return sendReplyWithNav(sock, m, claraWrap("Daily", [
        "Sudah claim hari ini!",
        `Streak: ${streak} hari`,
        `Reset dalam: ${hoursLeft}j ${minsLeft}m`,
        "",
        "Kembali besok untuk lanjut streak!",
      ]), { commandName: "daily" });
    }

    // Calculate streak
    const streak = getStreak(player);

    // Calculate reward
    const streakBonus = streak > 1 ? (streak - 1) * STREAK_BONUS_GOLD : 0;
    const streakExpBonus = streak > 1 ? (streak - 1) * STREAK_BONUS_EXP : 0;
    const mult = isPremium ? PREMIUM_MULT : 1;

    const totalGold = (BASE_GOLD + streakBonus) * mult;
    const totalExp = (BASE_EXP + streakExpBonus) * mult;

    // Give rewards
    addGold(m, totalGold);
    addExp(m, totalExp);

    // Save streak + lastDaily
    savePlayer(m, {
      lastDaily: today,
      dailyStreak: streak,
    });

    // Build reward display
    const lines = [
      `Hadiah: ${totalGold} Gold`,
      `Exp: +${totalExp}`,
      `Streak: ${streak} hari`,
    ];

    if (streak > 1) {
      lines.push(`Streak bonus: +${streakBonus} Gold`);
    }

    if (isPremium) {
      lines.push(`Premium bonus: x${PREMIUM_MULT}`);
    }

    // Current balance
    const updatedPlayer = getPlayer(m);
    lines.push("");
    lines.push(`Saldo: ${updatedPlayer?.gold || 0} Gold`);
    lines.push(`Level: ${updatedPlayer?.level || 1}`);

    // Streak milestone message
    if (streak === MAX_STREAK) {
      lines.push("");
      lines.push(`Streak max ${MAX_STREAK} hari! Mantap!`);
    }

    await m.react("✅");
    return m.reply(claraWrap("Daily Claim", lines, "success"));
  } catch (error) {
    return m.reply(claraWrap("Daily", `Gagal: ${error.message}`, "error"));
  }
}

export { pluginConfig as config, handler };
