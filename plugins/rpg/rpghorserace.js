// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Horse Race — Taruhan balap kuda, pilih kuda & menang 2x-5x
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpghorserace",
  alias: ["balapkuda", "kudarace", "taruhankuda", "horserace", "balap"],
  category: "rpg",
  description: "RPG Horse Race — Taruhan balap kuda, menang 2x-5x lipat",
  usage: ".rpghorserace <nomor kuda> <jumlah gold>\n.rpghorserace list — Daftar kuda",
  example: ".rpghorserace 3 1000 (taruh 1000 gold di kuda 3)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

const HORSES = [
  { name: "Thunder", emoji: "🐴", speed: 75, odds: 2.0, color: "Coklat" },
  { name: "Lightning", emoji: "🐎", speed: 85, odds: 3.0, color: "Hitam" },
  { name: "Storm", emoji: "🦓", speed: 70, odds: 2.5, color: "Belang" },
  { name: "Blaze", emoji: "🐴", speed: 90, odds: 4.0, color: "Merah" },
  { name: "Shadow", emoji: "🐎", speed: 65, odds: 5.0, color: "Abu" },
  { name: "Diamond", emoji: "🦄", speed: 95, odds: 5.0, color: "Putih" },
];

const MIN_BET = 100;
const MAX_BET = 5000;

function simulateRace() {
  // Each horse gets random factor + base speed
  const results = HORSES.map((horse, idx) => {
    const roll = Math.random() * 30; // randomness
    const score = horse.speed + roll;
    return { idx, name: horse.name, emoji: horse.emoji, score, odds: horse.odds };
  });
  results.sort((a, b) => b.score - a.score);
  return results;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const arg1 = args[0]?.toLowerCase();
    const arg2 = parseInt(args[1]) || 0;

    if (!arg1 || arg1 === "list" || arg1 === "help") {
      const lines = [
        "BALAP KUDA RPG",
        "Pilih kuda, taruh gold, menang sesuai odds",
        "",
        "DAFTAR KUDA:",
      ];
      HORSES.forEach((horse, i) => {
        lines.push((i + 1) + ". " + horse.emoji + " " + horse.name + " (" + horse.color + ")");
        lines.push("   Speed: " + horse.speed + " | Odds: " + horse.odds + "x");
      });
      lines.push("");
      lines.push("CARA PAKAI:");
      lines.push(usedPrefix + "rpghorserace <nomor> <gold>");
      lines.push("Min bet: " + MIN_BET + " | Max bet: " + MAX_BET);
      lines.push("");
      lines.push("Contoh:");
      lines.push(usedPrefix + "rpghorserace 3 1000");
      lines.push("(Taruh 1000 gold di kuda nomor 3)");
      return m.reply(claraWrap("RPG Horse Race", lines, "info"));
    }

    const horseNum = parseInt(arg1);
    if (isNaN(horseNum) || horseNum < 1 || horseNum > HORSES.length) {
      return m.reply(claraWrap("RPG Horse Race", [
        "Nomor kuda tidak valid (1-" + HORSES.length + ")",
        "Ketik " + usedPrefix + "rpghorserace list",
      ], "warn"));
    }

    if (arg2 < MIN_BET) {
      return m.reply(claraWrap("RPG Horse Race", "Minimum bet: " + MIN_BET + " gold", "warn"));
    }
    if (arg2 > MAX_BET) {
      return m.reply(claraWrap("RPG Horse Race", "Maximum bet: " + MAX_BET + " gold", "warn"));
    }

    const player = ensurePlayer(m);
    if ((player.gold || 0) < arg2) {
      return m.reply(claraWrap("RPG Horse Race", [
        "Gold tidak cukup!",
        "Butuh: " + arg2 + " | Punya: " + (player.gold || 0),
      ], "warn"));
    }

    // Deduct bet
    addGold(m, -arg2);

    // Race
    const chosenHorse = horseNum - 1;
    const results = simulateRace();
    const winner = results[0];

    // Build race report
    const raceLines = [
      "BALAP KUDA DIMULAI!",
      "Taruhan: " + arg2 + " gold di " + HORSES[chosenHorse].emoji + " " + HORSES[chosenHorse].name,
      "",
      "HASIL BALAP:",
    ];
    results.forEach((r, i) => {
      const marker = r.idx === chosenHorse ? " <-- PILIHANMU" : "";
      raceLines.push((i + 1) + ". " + r.emoji + " " + r.name + " (Score: " + Math.round(r.score) + ")" + marker);
    });

    if (winner.idx === chosenHorse) {
      const winnings = Math.round(arg2 * HORSES[chosenHorse].odds);
      addGold(m, winnings);
      addExp(m, Math.round(winnings * 0.1));
      savePlayer(m, player);
      raceLines.push("");
      raceLines.push("MENANG! +" + winnings + " gold");
      raceLines.push("Odds: " + HORSES[chosenHorse].odds + "x | Exp: +" + Math.round(winnings * 0.1));
      raceLines.push("Gold sekarang: " + (player.gold || 0));
      return m.reply(claraWrap("RPG Horse Race", raceLines, "info"));
    } else {
      savePlayer(m, player);
      raceLines.push("");
      raceLines.push("KALAH! -" + arg2 + " gold");
      raceLines.push("Pemenang: " + winner.emoji + " " + winner.name);
      raceLines.push("Gold sekarang: " + (player.gold || 0));
      return m.reply(claraWrap("RPG Horse Race", raceLines, "warn"));
    }
  } catch (e) {
    console.error("[RpgHorseRace]", e);
    return m.reply(claraWrap("RPG Horse Race", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
