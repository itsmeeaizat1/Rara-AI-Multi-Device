// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rpg-arena.js — Arena PvP (auto-matchmaking, rank system)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "arena",
  alias: ["arena", "arenapvp", "pvparena"],
  category: "rpg",
  description: "Arena PvP — fight player lain dengan auto matchmaking",
  usage: ".arena (cari lawan)\n.arena rank (cek rank arena)",
  example: ".arena",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: false,
  cooldown: 30, energi: 5, isEnabled: true,
};

const RANK_TIERS = [
  { name: "Bronze", min: 0, emoji: "🥉" },
  { name: "Silver", min: 1000, emoji: "🥈" },
  { name: "Gold", min: 2500, emoji: "🥇" },
  { name: "Platinum", min: 5000, emoji: "💠" },
  { name: "Diamond", min: 10000, emoji: "💎" },
  { name: "Master", min: 20000, emoji: "👑" },
];

function getRank(points) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (points >= RANK_TIERS[i].min) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    if (subCmd === "rank") {
      const data = await db.getPlayerData?.(m.sender, "arena") || { points: 0, wins: 0, losses: 0 };
      const rank = getRank(data.points || 0);
      let msg = `╭─「 ᴀʀᴇɴᴀ ʀᴀɴᴋ 」\n`;
      msg += `│ Rank: ${rank.emoji} *${rank.name}*\n`;
      msg += `│ Points: *${data.points || 0}*\n`;
      msg += `│ Wins: *${data.wins || 0}* | Losses: *${data.losses || 0}*\n`;
      msg += `│ Win Rate: *${data.wins + data.losses > 0 ? Math.round(data.wins / (data.wins + data.losses) * 100) : 0}%*\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    await m.react("🕒");

    // Generate lawan AI
    const playerData = await db.getPlayerData?.(m.sender, "arena") || { points: 0, wins: 0, losses: 0 };
    const playerRank = getRank(playerData.points || 0);

    // Buat lawan berdasarkan rank
    const enemyNames = ["Shadow Hunter", "Blade Master", "Dark Knight", "Frost Mage", "Storm Warrior", "Flame Berserker", "Void Assassin", "Holy Paladin"];
    const enemyName = enemyNames[Math.floor(Math.random() * enemyNames.length)];
    const enemyPower = Math.floor((playerRank.min + Math.random() * 1000) * (0.8 + Math.random() * 0.4));

    // Get player power
    const playerPower = (playerData.points || 100) + Math.floor(Math.random() * 500);

    // Simulasi battle
    await new Promise(r => setTimeout(r, 2000));

    const playerRoll = Math.random() * (playerPower + 200);
    const enemyRoll = Math.random() * (enemyPower + 100);
    const won = playerRoll > enemyRoll;

    const reward = won ? Math.floor(100 + Math.random() * 200) : Math.floor(20 + Math.random() * 50);
    const pointChange = won ? 50 + Math.floor(Math.random() * 50) : -(20 + Math.floor(Math.random() * 30));

    // Update data
    if (!playerData.points) playerData.points = 0;
    if (!playerData.wins) playerData.wins = 0;
    if (!playerData.losses) playerData.losses = 0;
    playerData.points = Math.max(0, playerData.points + pointChange);
    if (won) playerData.wins++; else playerData.losses++;
    await db.setPlayerData?.(m.sender, "arena", playerData);

    // Reward gold
    try {
      if (won) await db.addGold?.(m.sender, reward); else await db.addGold?.(m.sender, reward);
    } catch {}

    await m.react("🐣");
    let msg = `╭─「 ᴀʀᴇɴᴀ ᴘᴠᴘ 」\n`;
    msg += `│ Lawan: *${enemyName}*\n`;
    msg += `│ Enemy Power: *${enemyPower}*\n`;
    msg += `│ Your Power: *${playerPower}*\n`;
    msg += `│\n`;
    msg += `│ ${won ? "🏆 VICTORY!" : "💀 DEFEAT"}\n`;
    msg += `│ Points: ${pointChange > 0 ? "+" : ""}${pointChange}\n`;
    msg += `│ Reward: +${reward} gold\n`;
    msg += `│ Total Points: *${playerData.points}*\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("arena error:", err);
    await m.react("❌");
    return m.reply(claraWrap("arena", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
