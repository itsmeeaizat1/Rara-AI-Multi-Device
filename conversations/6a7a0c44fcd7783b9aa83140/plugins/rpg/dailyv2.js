import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  getPlayer,
  ensurePlayer,
  addGold,
  addExp,
  savePlayer,
} from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "dailyv2",
  alias: ["dailyv2", "claimv2", "dailyrewardv2"],
  category: "economy",
  description: "Daily claim v2 - streak, lucky roll, weekly bonus, milestone reward",
  usage: ".dailyv2",
  example: ".dailyv2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// === Config ===
const BASE_GOLD = 200;
const BASE_EXP = 50;
const PREMIUM_MULT = 2;

// Streak bonus per day
const STREAK_GOLD = 50;
const STREAK_EXP = 10;
const MAX_STREAK = 7;

// Milestone rewards at specific streaks
const MILESTONES = {
  3: { gold: 500, exp: 100, label: "3 Hari Streak!" },
  7: { gold: 1500, exp: 300, label: "7 Hari Streak! Bonus Maksimal!" },
  14: { gold: 3000, exp: 500, label: "14 Hari! Legendaris!" },
  30: { gold: 10000, exp: 2000, label: "30 Hari! Sebulan Penuh!" },
};

// Lucky roll chance (1 in X)
const LUCKY_CHANCE = 7;
const LUCKY_REWARDS = [
  { gold: 1000, exp: 200, label: "Lucky! Jackpot Gold" },
  { gold: 500, exp: 500, label: "Lucky! Exp Boost" },
  { gold: 800, exp: 300, label: "Lucky! Double Reward" },
  { gold: 2000, exp: 0, label: "Lucky! Mega Gold" },
  { gold: 0, exp: 1000, label: "Lucky! Mega Exp" },
];

// Weekly bonus (claim 7x in a week = extra)
const WEEKLY_BONUS_GOLD = 1000;
const WEEKLY_BONUS_EXP = 200;

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getYesterdayKey() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getWeekKey() {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(
    ((now - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7
  );
  return `${year}-W${week}`;
}

function calcStreak(player) {
  const lastDaily = player?.lastDaily;
  if (!lastDaily) return 1;

  const [y, m, d] = lastDaily.split("-").map(Number);
  const lastDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (lastDate === yesterday) {
    const streak = player?.dailyStreak || 0;
    return Math.min(streak + 1, 30);
  }
  return 1;
}

function getMilestoneFixed(streak) {
  return MILESTONES[streak] || null;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const userName = m.pushName || "Player";
    const isPremium = m.isPremium || false;

    const player = ensurePlayer(m, userName);
    if (!player) {
      return m.reply(claraWrap("Daily V2", "Belum terdaftar. Ketik .daftarrpg dulu.", "warn"));
    }

    const today = getTodayKey();
    const lastDaily = player.lastDaily || "";

    // Already claimed
    if (lastDaily === today) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hLeft = Math.floor((tomorrow - now) / 3600000);
      const mLeft = Math.floor(((tomorrow - now) % 3600000) / 60000);
      const streak = player.dailyStreak || 0;

      // Show info + next milestone
      const lines = [
        "Sudah claim hari ini!",
        `Streak: ${streak} hari`,
        `Reset: ${hLeft}j ${mLeft}m`,
        "",
      ];

      // Find next milestone
      const nextMs = [3, 7, 14, 30].find((s) => s > streak);
      if (nextMs) {
        lines.push(`Next milestone: ${nextMs} hari`);
        lines.push(`Bonus: ${MILESTONES[nextMs].gold} Gold + ${MILESTONES[nextMs].exp} Exp`);
      }

      lines.push("");
      lines.push("Kembali besok untuk lanjut streak!");

      return sendReplyWithNav(sock, m, claraWrap("Daily V2", lines), {
        commandName: "dailyv2",
      });
    }

    // Calculate streak
    const streak = calcStreak(player);

    // Base reward
    const streakBonus = streak > 1 ? (streak - 1) * STREAK_GOLD : 0;
    const streakExpBonus = streak > 1 ? (streak - 1) * STREAK_EXP : 0;
    const mult = isPremium ? PREMIUM_MULT : 1;

    let totalGold = (BASE_GOLD + streakBonus) * mult;
    let totalExp = (BASE_EXP + streakExpBonus) * mult;

    const rewards = [
      `Base: ${BASE_GOLD} Gold + ${BASE_EXP} Exp`,
    ];

    if (streak > 1) {
      rewards.push(`Streak ${streak}: +${streakBonus} Gold +${streakExpBonus} Exp`);
    }

    // Milestone reward
    const milestone = getMilestoneFixed(streak);
    if (milestone) {
      totalGold += milestone.gold;
      totalExp += milestone.exp;
      rewards.push(`${milestone.label}`);
      rewards.push(`Milestone: +${milestone.gold} Gold +${milestone.exp} Exp`);
    }

    // Lucky roll
    let lucky = null;
    if (Math.floor(Math.random() * LUCKY_CHANCE) === 0) {
      lucky = LUCKY_REWARDS[Math.floor(Math.random() * LUCKY_REWARDS.length)];
      totalGold += lucky.gold;
      totalExp += lucky.exp;
      rewards.push(`${lucky.label}`);
      rewards.push(`Lucky: +${lucky.gold} Gold +${lucky.exp} Exp`);
    }

    // Weekly bonus
    const weekKey = getWeekKey();
    const playerWeekKey = player.lastWeekKey || "";
    let weeklyClaimed = player.weeklyClaimed || 0;
    let weeklyBonus = false;

    if (playerWeekKey === weekKey) {
      weeklyClaimed = (player.weeklyClaimed || 0) + 1;
    } else {
      weeklyClaimed = 1;
    }

    if (weeklyClaimed >= 7 && playerWeekKey === weekKey && !(player.weeklyBonusClaimed || false)) {
      totalGold += WEEKLY_BONUS_GOLD;
      totalExp += WEEKLY_BONUS_EXP;
      weeklyBonus = true;
      rewards.push(`Weekly Bonus: +${WEEKLY_BONUS_GOLD} Gold +${WEEKLY_BONUS_EXP} Exp`);
    }

    // Premium bonus
    if (isPremium) {
      rewards.push(`Premium: x${PREMIUM_MULT} multiplier`);
    }

    // Give rewards
    addGold(m, totalGold);
    addExp(m, totalExp);

    // Save state
    const saveData = {
      lastDaily: today,
      dailyStreak: streak,
      lastWeekKey: weekKey,
      weeklyClaimed: weeklyClaimed,
      weeklyBonusClaimed: weeklyBonus || player.weeklyBonusClaimed || false,
    };
    if (playerWeekKey !== weekKey) {
      saveData.weeklyClaimed = 1;
      saveData.weeklyBonusClaimed = false;
    }
    savePlayer(m, saveData);

    // Get updated player
    const updated = getPlayer(m);
    const weeklyCount = saveData.weeklyClaimed || 1;

    // Build display
    const lines = [...rewards, "", "=== RINGKASAN ==="];

    lines.push(`Total: ${totalGold} Gold + ${totalExp} Exp`);
    lines.push(`Saldo: ${updated?.gold || 0} Gold`);
    lines.push(`Level: ${updated?.level || 1}`);
    lines.push(`Streak: ${streak} hari`);
    lines.push(`Weekly: ${weeklyCount}/7 claims`);

    if (lucky) {
      lines.push("");
      lines.push("Lucky roll aktif hari ini!");
    }

    if (!weeklyBonus && weeklyCount < 7) {
      lines.push("");
      lines.push(`Weekly bonus: claim ${7 - weeklyCount}x lagi!`);
    }

    await m.react("✅");
    return m.reply(claraWrap("Daily V2 - Claimed", lines, "success"));
  } catch (error) {
    return m.reply(claraWrap("Daily V2", `Gagal: ${error.message}`, "error"));
  }
}

export { pluginConfig as config, handler };
