// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { getTimeGreeting } from "../../src/lib/nova-formatter.js";

const pluginConfig = {
  name: "dailyuser",
  alias: ["dailyuser", "daily"],
  category: "user",
  description: "Claim hadiah harian (Exp, Koin, Gold, Gems)",
  usage: ".daily",
  example: ".daily",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

function formatNum(n) {
  return n.toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  const db = getDatabase();
  let user = db.getUser(m.sender);

  if (!user) {
    db.setUser(m.sender);
    user = db.getUser(m.sender);
  }

  if (!user.cooldowns) user.cooldowns = {};
  const lastDaily = user.cooldowns.daily || 0;
  const now = Date.now();

  if (now - lastDaily < DAILY_COOLDOWN) {
    const remaining = lastDaily + DAILY_COOLDOWN - now;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return m.reply(
      "╭─「 ✦ Daily Claim ✦ 」\n" +
      "│\n" +
      "│ 🕖 Sabar ya, cooldown nih!\n" +
      "│ Udah klaim hari ini 👀\n" +
      "│ Tunggu *" + hours + " jam " + minutes + " menit* lagi ya\n" +
      "╰────  •  ────"
    );
  }

  // Calculate streak
  if (!user.rpg) user.rpg = {};
  const streak = (user.rpg.dailyStreak || 0) + 1;

  // Streak bonus — semakin lama consecutive, semakin besar
  const streakMultiplier = 1 + Math.min(streak * 0.1, 2); // Max 3x at streak 20+
  const expReward = Math.floor((Math.random() * 5000 + 1000) * streakMultiplier);
  const koinReward = Math.floor((Math.random() * 10000 + 5000) * streakMultiplier);
  const goldReward = Math.floor((Math.random() * 300 + 100) * streakMultiplier);

  // Small chance for gems (5%)
  let gemsReward = 0;
  let diamondsReward = 0;
  const luckyRoll = Math.random();
  if (luckyRoll < 0.03) {
    diamondsReward = Math.floor(Math.random() * 2) + 1;
    gemsReward = Math.floor(Math.random() * 5) + 3;
  } else if (luckyRoll < 0.15) {
    gemsReward = Math.floor(Math.random() * 3) + 1;
  }

  const potionReward = Math.floor(Math.random() * 3) + 1;

  // Apply rewards
  db.updateExp(m.sender, expReward);
  db.updateKoin(m.sender, koinReward);
  db.updateRpgCurrency(m.sender, "gold", goldReward);
  if (gemsReward > 0) db.updateRpgCurrency(m.sender, "gems", gemsReward);
  if (diamondsReward > 0) db.updateRpgCurrency(m.sender, "diamonds", diamondsReward);

  // Update streak
  user.rpg.dailyStreak = streak;
  db.updateRpgCurrency(m.sender, "dailyStreak", 0); // just trigger save
  user = db.getUser(m.sender);
  user.rpg.dailyStreak = streak;

  // Potion to inventory
  if (!user.inventory) user.inventory = {};
  user.inventory.potion = (user.inventory.potion || 0) + potionReward;

  user.cooldowns.daily = now;
  db.setUser(m.sender, user);
  db.save();

  const greeting = getTimeGreeting();

  let txt = "╭─「 ✦ Daily Claim ✦ 」\n";
  txt += "│\n";
  txt += "* " + greeting + ", @" + m.sender.split("@")[0] + "!* 👋\n";
  txt += "│ 🔥 Streak: *" + streak + " hari*\n";
  if (streakMultiplier > 1) {
    txt += "│ ⚡ Bonus Streak: *" + (Math.round(streakMultiplier * 100) / 100) + "x*\n";
  }
  txt += "│\n";
  txt += "│ 「 Hadiah 」\n";
  txt += "│ 🚄 Exp: *+" + formatNum(expReward) + "*\n";
  txt += "│ 🪙 Koin: *+" + formatNum(koinReward) + "*\n";
  txt += "│ 💰 Gold: *+" + formatNum(goldReward) + "*\n";
  if (gemsReward > 0) txt += "│ 💎 Gems: *+" + gemsReward + "*\n";
  if (diamondsReward > 0) txt += "│ ♦️ Diamonds: *+" + diamondsReward + "*\n";
  txt += "│ 🥤 Potion: *+" + potionReward + "*\n";
  txt += "│\n";
  txt += "│ 💡 Besok klaim lagi ya, jangan sampai putus streak-nya!\n";
  txt += "╰────  •  ────";
  await sock.sendMessage(m.chat, { text: txt, mentions: [m.sender] }, { quoted: m });
}

export { pluginConfig as config, handler };
