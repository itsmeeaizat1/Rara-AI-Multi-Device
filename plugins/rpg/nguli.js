// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Nguli — Casual labor for steady gold (low risk, low reward)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy,
  checkCooldown, setCooldown, formatTime,
  bumpPlayerStat,
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap, reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { animGather } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "nguli",
  alias: ["nguli", "buruh", "kuli"],
  category: "rpg",
  description: "Jadi buruh/kuli — gold stabil tanpa resiko (low risk low reward)",
  usage: ".nguli",
  example: ".nguli",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const NGULI_ENERGY = 5;
const NGULI_COOLDOWN = 30 * 1000;

const NGULI_JOBS = [
  { name: "angkut semen", gold: [10, 25], exp: [8, 15] },
  { name: "urut batu bata", gold: [12, 28], exp: [10, 18] },
  { name: "campur adukan", gold: [15, 30], exp: [12, 20] },
  { name: "bersihkan proyek", gold: [8, 22], exp: [6, 12] },
  { name: "bantu tukang", gold: [14, 30], exp: [10, 20] },
  { name: "angkut pasir", gold: [10, 26], exp: [8, 16] },
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("nguli", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastNguli");
    if (cd) {
      await reactCooldown(m);
      return m.reply(claraWrap("nguli", `Cooldown nguli tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < NGULI_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("nguli", `Energi kurang! Butuh *${NGULI_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, NGULI_ENERGY, sock);

    // Animation
    await animGather(m, sock, "👷", "Bekerja sebagai kuli...");

    const job = NGULI_JOBS[Math.floor(Math.random() * NGULI_JOBS.length)];
    const goldGain = Math.floor(Math.random() * (job.gold[1] - job.gold[0] + 1)) + job.gold[0];
    const expGain = Math.floor(Math.random() * (job.exp[1] - job.exp[0] + 1)) + job.exp[0];

    // Streak bonus
    const streak = (rpg.nguliStreak || 0) + 1;
    const streakBonus = Math.min(streak * 0.05, 0.5); // Max +50%
    const bonusGold = Math.floor(goldGain * streakBonus);

    addGold(m, goldGain + bonusGold);
    await bumpPlayerStat(m, "nguli", "totalNguli", 1);
    addExp(m, expGain);

    saveRpg(m, { nguliStreak: streak, lastNguliWork: Date.now() });

    setCooldown(m, "lastNguli", NGULI_COOLDOWN);

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "nguli", icon: "👷",
      flavor: "💪 *GAJIAN KULI!*",
      body: [
        `│ • 👷 Pekerjaan : ${job.name}`,
        "",
        `│ • 💰 Gold : +${goldGain}`,
        ...(bonusGold > 0 ? [`│ • 🔥 Streak bonus : +${bonusGold} gold`] : []),
        `│ • ✨ EXP : +${expGain}`,
        ...(streak > 1 ? [`│ • 🔥 Streak : ${streak}x`] : []),
        "",
        `│ • ⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}`,
      ].join("\n"),
      cta: gameCTA("nguli"),
    }));
  } catch (err) {
    console.error("nguli error:", err);
    await m.react("❌");
    return m.reply(claraWrap("nguli", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
