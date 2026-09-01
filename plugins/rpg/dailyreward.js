// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// dailyreward.js — Daily Login Reward (streak system)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "dailyreward",
  alias: ["dailyreward", "daily", "claimdaily", "loginreward"],
  category: "rpg",
  description: "Daily login reward dengan streak system",
  usage: ".dailyreward",
  example: ".dailyreward",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 0, energi: 0, isEnabled: true,
};

const REWARDS = [
  { day: 1, gold: 500, energi: 10, item: null },
  { day: 2, gold: 800, energi: 15, item: null },
  { day: 3, gold: 1200, energi: 20, item: "Common Chest" },
  { day: 4, gold: 1500, energi: 25, item: null },
  { day: 5, gold: 2000, energi: 30, item: "Rare Chest" },
  { day: 6, gold: 2500, energi: 35, item: null },
  { day: 7, gold: 5000, energi: 50, item: "Legendary Chest" },
];

async function handler(m, { sock }) {
  try {
    const db = await getDatabase();
    const now = Date.now();
    const data = await db.getPlayerData?.(m.sender, "daily") || { lastClaim: 0, streak: 0, totalClaims: 0 };

    const cooldown = 20 * 60 * 60 * 1000; // 20 jam
    const timeSinceClaim = now - (data.lastClaim || 0);

    if (timeSinceClaim < cooldown) {
      const remaining = cooldown - timeSinceClaim;
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return m.reply(claraWrap("dailyreward", `Sudah claim hari ini!\n\nTunggu *${hours}j ${minutes}m* lagi untuk claim besok.`, "error"));
    }

    // Check streak reset (lebih dari 48 jam = reset)
    if (timeSinceClaim > 48 * 60 * 60 * 1000) {
      data.streak = 0;
    }

    // Increment streak
    data.streak = (data.streak || 0) + 1;
    if (data.streak > 7) data.streak = 1; // reset cycle
    data.lastClaim = now;
    data.totalClaims = (data.totalClaims || 0) + 1;

    const reward = REWARDS[data.streak - 1] || REWARDS[0];

    // Apply rewards
    try { await db.addGold?.(m.sender, reward.gold); } catch {}
    try { await db.addEnergi?.(m.sender, reward.energi); } catch {}

    await db.setPlayerData?.(m.sender, "daily", data);
    await m.react("🐣");

    let msg = `╭─「 ✦ ᴅᴀɪʟʏ ʀᴇᴡᴀʀᴅ ✦ 」\n`;
    msg += `│ Day: *${data.streak}/7*\n`;
    msg += `│ Streak: *${data.totalClaims} hari total*\n`;
    msg += `│\n`;
    msg += `│ Reward:\n`;
    msg += `│ 💰 +${reward.gold} Gold\n`;
    msg += `│ ⚡ +${reward.energi} Energi\n`;
    if (reward.item) msg += `│ 🎁 ${reward.item}\n`;
    msg += `│\n`;

    // Preview next reward
    const nextDay = data.streak >= 7 ? 1 : data.streak + 1;
    const nextReward = REWARDS[nextDay - 1];
    msg += `│ Besok (Day ${nextDay}):\n`;
    msg += `│  💰 ${nextReward.gold} Gold | ⚡ ${nextReward.energi} Energi`;
    if (nextReward.item) msg += ` | 🎁 ${nextReward.item}`;
    msg += `\n`;
    msg += `╰────  •  ────`;

    return m.reply(msg);
  } catch (err) {
    console.error("dailyreward error:", err);
    await m.react("❌");
    return m.reply(claraWrap("dailyreward", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
