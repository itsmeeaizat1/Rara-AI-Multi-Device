// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tournament.js — Weekly Tournament (leaderboard, prize pool)
import { getDatabase } from "../../src/lib/rara-database.js";
import { rpgSleep } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "tournament",
  alias: ["tournament", "turnamen", "rpgtournament", "weeklytourn"],
  category: "rpg",
  description: "Weekly tournament — leaderboard & prize pool",
  usage: ".tournament (cek leaderboard)\n.tournament join (ikut turnamen)\n.tournament info (info prize pool)",
  example: ".tournament",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const PRIZE_POOL = [
  { rank: 1, gold: 10000, energi: 100, badge: "🏆 Champion" },
  { rank: 2, gold: 5000, energi: 50, badge: "🥈 Runner-up" },
  { rank: 3, gold: 3000, energi: 30, badge: "🥉 Third Place" },
  { rank: 4, gold: 1500, energi: 15, badge: "🏅" },
  { rank: 5, gold: 1000, energi: 10, badge: "🎖️" },
  { rank: 6, gold: 500, badge: "🎗️" },
  { rank: 7, gold: 300, badge: "🎗️" },
  { rank: 8, gold: 200, badge: "🎗️" },
  { rank: 9, gold: 100, badge: "🎗️" },
  { rank: 10, gold: 50, badge: "🎟️" },
];

const tournamentData = { participants: new Map(), week: 0 };

function getWeekKey() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    const currentWeek = getWeekKey();
    if (tournamentData.week !== currentWeek) {
      tournamentData.week = currentWeek;
      tournamentData.participants = new Map();
    }

    if (subCmd === "join" || subCmd === "ikut") {
      if (tournamentData.participants.has(m.sender)) {
        return m.reply(raraRpgBox("tournament", "Kamu sudah ikut turnamen minggu ini!", "error"));
      }

      // Entry fee
      try {
        const gold = await db.getGold?.(m.sender) || 0;
        if (gold < 500) {
          await m.react("❌");
          return m.reply(raraRpgBox("tournament", "Entry fee 500 gold. Gold tidak cukup!", "error"));
        }
        await db.minGold?.(m.sender, 500);
      } catch {}

      const arenaData = await db.getPlayerData?.(m.sender, "arena") || { points: 0, wins: 0, losses: 0 };
      tournamentData.participants.set(m.sender, {
        name: m.pushName,
        points: arenaData.points || 0,
        wins: arenaData.wins || 0,
        joined: Date.now(),
      });

      await m.react("🐣");
      return m.reply(raraRpgBox("tournament", `✅ Berhasil ikut turnamen minggu ini!\nEntry fee: 500 gold\n\nMain arena (${m.prefix}arena) untuk naikin poin!`));
    }

    if (subCmd === "info" || subCmd === "prize") {
      let msg = "";
      msg += `Week: *${currentWeek}*\n`;
      msg += `Entry fee: 500 gold\n`;
      msg += `
`;
      PRIZE_POOL.forEach(p => {
        let line = `#${p.rank} `;
        if (p.gold) line += `💰${p.gold}`;
        if (p.energi) line += ` ⚡${p.energi}`;
        line += ` ${p.badge}`;
        msg += line + "\n";
      });
      msg += `
`;
      msg += `${m.prefix}tournament join - ikut sekarang\n`;
            return m.reply(msg);
    }

    // LEADERBOARD (default)
    if (tournamentData.participants.size === 0) {
      return m.reply(raraRpgBox("tournament", `Belum ada peserta. Ikut sekarang: ${m.prefix}tournament join`, "guide"));
    }

    // Update scores from arena data
    for (const [sender, data] of tournamentData.participants) {
      const arenaData = await db.getPlayerData?.(sender, "arena") || {};
      data.points = arenaData.points || data.points;
      data.wins = arenaData.wins || data.wins;
    }

    // Sort by points
    const sorted = [...tournamentData.participants.entries()].sort((a, b) => b[1].points - a[1].points);

    let msg = "";
    msg += `Week: *${currentWeek}* | Peserta: *${tournamentData.participants.size}*\n`;
    msg += `
`;

    sorted.slice(0, 10).forEach(([sender, data], i) => {
      const prize = PRIZE_POOL[i];
      msg += `${i + 1}. ${data.name} - ${data.points} pts ${prize ? prize.badge : ""}\n`;
    });

    msg += `
`;
    msg += `${m.prefix}tournament info - prize pool\n`;
    msg += `${m.prefix}tournament join - ikut turnamen\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("tournament error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("tournament", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
