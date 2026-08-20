// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Snail Race — Balap keong lucu, taruhan dengan odds random
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgsnailrace",
  alias: ["balapkeong", "keongrace", "snailrace", "balapsiput", "keongbalap"],
  category: "rpg",
  description: "RPG Snail Race — Balap keong lucu, taruhan dengan odds random",
  usage: ".rpgsnailrace <nomor> <gold>\n.rpgsnailrace list — Daftar keong",
  example: ".rpgsnailrace 2 500 (taruh 500 gold di keong 2)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

const SNAILS = [
  { name: "Gary", emoji: "🐌", speed: 10, desc: "Keong rumahan, stabil" },
  { name: "Turbo", emoji: "🐌", speed: 15, desc: "Pernah main film" },
  { name: "Sluggy", emoji: "🐌", speed: 8, desc: "Pelan tapi kuat" },
  { name: "Flash", emoji: "🐌", speed: 20, desc: "Keong tercepat (katanya)" },
  { name: "Slimy", emoji: "🐌", speed: 12, desc: "Licin banget" },
];

const MIN_BET = 100;
const MAX_BET = 3000;

function raceSimulation() {
  // Each snail gets a random progress per "tick"
  // First to reach 100 wins
  const progress = SNAILS.map((snail, idx) => ({
    idx,
    name: snail.name,
    emoji: snail.emoji,
    speed: snail.speed,
    distance: 0,
  }));

  let winner = null;
  let ticks = 0;
  const maxTicks = 100;

  while (!winner && ticks < maxTicks) {
    for (const s of progress) {
      // Random speed factor 0.5x to 2x
      const factor = 0.5 + Math.random() * 1.5;
      s.distance += s.speed * factor;
      if (s.distance >= 100 && !winner) {
        winner = s;
        s.distance = 100;
      }
    }
    ticks++;
  }

  // Sort by distance
  progress.sort((a, b) => b.distance - a.distance);

  // Odds based on speed
  const oddsMap = {
    20: 1.5, 15: 2.0, 12: 2.5, 10: 3.0, 8: 4.0,
  };
  const odds = oddsMap[SNAILS[winner.idx].speed] || 2.0;

  return { winner, progress, odds, ticks };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const arg1 = args[0]?.toLowerCase();

    if (!arg1 || arg1 === "list" || arg1 === "help") {
      const lines = [
        "BALAP KEONG RPG",
        "Balap keong paling lucu sedunia",
        "",
        "DAFTAR KEONG:",
      ];
      SNAILS.forEach((snail, i) => {
        lines.push((i + 1) + ". " + snail.emoji + " " + snail.name + " (Speed: " + snail.speed + ")");
        lines.push("   " + snail.desc);
      });
      lines.push("");
      lines.push("CARA PAKAI:");
      lines.push(usedPrefix + "rpgsnailrace <nomor> <gold>");
      lines.push("Min: " + MIN_BET + " | Max: " + MAX_BET);
      lines.push("Contoh: " + usedPrefix + "rpgsnailrace 4 1000");
      return m.reply(claraWrap("RPG Snail Race", lines, "info"));
    }

    const snailNum = parseInt(arg1);
    const betAmount = parseInt(args[1]) || 0;

    if (isNaN(snailNum) || snailNum < 1 || snailNum > SNAILS.length) {
      return m.reply(claraWrap("RPG Snail Race", "Nomor keong tidak valid (1-" + SNAILS.length + ")", "warn"));
    }

    if (betAmount < MIN_BET) {
      return m.reply(claraWrap("RPG Snail Race", "Min bet: " + MIN_BET + " gold", "warn"));
    }
    if (betAmount > MAX_BET) {
      return m.reply(claraWrap("RPG Snail Race", "Max bet: " + MAX_BET + " gold", "warn"));
    }

    const player = ensurePlayer(m);
    if ((player.gold || 0) < betAmount) {
      return m.reply(claraWrap("RPG Snail Race", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
    }

    addGold(m, -betAmount);

    // Race!
    const { winner, progress, odds, ticks } = raceSimulation();
    const chosenSnail = snailNum - 1;

    const raceLines = [
      "BALAP KEONG DIMULAI!",
      "Taruhan: " + betAmount + " gold di " + SNAILS[chosenSnail].emoji + " " + SNAILS[chosenSnail].name,
      "",
      "HASIL BALAP (waktu: " + ticks + " tick):",
    ];

    progress.forEach((s, i) => {
      const bar = "█".repeat(Math.round(s.distance / 10)) + "░".repeat(10 - Math.round(s.distance / 10));
      const marker = s.idx === chosenSnail ? " <== PILIHANMU" : "";
      raceLines.push((i + 1) + ". " + s.emoji + " " + s.name + " [" + bar + "] " + Math.round(s.distance) + "%" + marker);
    });

    if (winner.idx === chosenSnail) {
      const winnings = Math.round(betAmount * odds);
      addGold(m, winnings);
      addExp(m, Math.round(winnings * 0.05));
      savePlayer(m, player);
      raceLines.push("");
      raceLines.push("KEONGMU MENANG! 🎉");
      raceLines.push("Hadiah: " + winnings + " gold (odds: " + odds + "x)");
      raceLines.push("Exp: +" + Math.round(winnings * 0.05));
      raceLines.push("Gold: " + (player.gold || 0));
      return m.reply(claraWrap("RPG Snail Race", raceLines, "info"));
    } else {
      savePlayer(m, player);
      raceLines.push("");
      raceLines.push("Keongmu kalah! -" + betAmount + " gold");
      raceLines.push("Pemenang: " + winner.emoji + " " + winner.name);
      raceLines.push("Gold: " + (player.gold || 0));
      return m.reply(claraWrap("RPG Snail Race", raceLines, "warn"));
    }
  } catch (e) {
    console.error("[RpgSnailRace]", e);
    return m.reply(claraWrap("RPG Snail Race", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
