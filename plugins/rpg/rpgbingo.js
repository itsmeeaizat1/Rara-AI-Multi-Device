// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Bingo — Game bingo, match nomor untuk menang hadiah
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgbingo",
  alias: ["bingorpg", "gamebingo", "nomorbingo"],
  category: "rpg",
  description: "RPG Bingo — Match nomor di kartu bingo untuk hadiah",
  usage: ".rpgbingo <biaya> — Beli kartu & mulai\n.rpgbingo <biaya> draw — Draw nomor berikutnya\n.rpgbingo info — Info",
  example: ".rpgbingo 500\n.rpgbingo 500 draw",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const MIN_COST = 200;
const MAX_COST = 3000;
const CARD_SIZE = 5; // 5x5 = 25 numbers
const MAX_DRAWS = 15;

function generateCard() {
  const card = [];
  const used = new Set();
  while (card.length < CARD_SIZE) {
    const num = Math.floor(Math.random() * 50) + 1; // 1-50
    if (!used.has(num)) {
      used.add(num);
      card.push(num);
    }
  }
  return card;
}

function checkBingo(card, drawn) {
  // Check if all card numbers are in drawn
  return card.every(num => drawn.includes(num));
}

function countMatches(card, drawn) {
  return card.filter(num => drawn.includes(num)).length;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    const cost = parseInt(args[0]) || 0;

    if (cost < MIN_COST) {
      return m.reply(claraWrap("RPG Bingo", [
        "GAME BINGO RPG",
        "Beli kartu, draw nomor, match semua = menang!",
        "",
        "Cara main:",
        "1. Beli kartu: " + usedPrefix + "rpgbingo <biaya>",
        "2. Draw nomor: " + usedPrefix + "rpgbingo <biaya> draw",
        "3. Match semua 5 nomor = JACKPOT",
        "",
        "Kartu 5 nomor | Max 15 draw | 1-50",
        "Min: " + MIN_COST + " | Max: " + MAX_COST + " gold",
        "",
        "Jackpot: 10x biaya",
        "4 match: 3x | 3 match: 1.5x | <3: zonk",
      ], "info"));
    }

    if (cost > MAX_COST) {
      return m.reply(claraWrap("RPG Bingo", "Max biaya: " + MAX_COST, "warn"));
    }

    const isDraw = args[1]?.toLowerCase() === "draw";
    const session = player.bingoGame;

    if (!isDraw) {
      // Buy new card
      if ((player.gold || 0) < cost) {
        return m.reply(claraWrap("RPG Bingo", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
      }

      addGold(m, -cost);
      const card = generateCard();
      player.bingoGame = {
        card,
        drawn: [],
        cost,
        drawsLeft: MAX_DRAWS,
        startTime: Date.now(),
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Bingo", [
        "KARTU BINGO DIBELI!",
        "Biaya: " + cost + " gold",
        "",
        "KARTU KAMU (5 nomor):",
        card.join(" | "),
        "",
        "Draw: " + usedPrefix + "rpgbingo " + cost + " draw",
        "Draw tersisa: " + MAX_DRAWS,
        "Match semua 5 = JACKPOT " + (cost * 10) + " gold!",
      ], "info"));
    }

    // Draw number
    if (!session) {
      return m.reply(claraWrap("RPG Bingo", "Tidak ada kartu aktif. Beli: " + usedPrefix + "rpgbingo " + cost, "warn"));
    }

    if (Date.now() - session.startTime > 180000) {
      delete player.bingoGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Bingo", "Waktu habis! Kartu expired.", "warn"));
    }

    if (session.drawsLeft <= 0) {
      // Game over, calculate result
      const matches = countMatches(session.card, session.drawn);
      const result = calculateBingo(matches, session.cost);

      if (result.gold > 0) addGold(m, result.gold);
      if (result.exp > 0) addExp(m, result.exp);

      const lines = [
        "BINGO SELESAI!",
        "Kartu: " + session.card.join(" | "),
        "Drawn: " + session.drawn.join(", "),
        "Match: " + matches + "/5",
      ];
      if (result.gold > 0) {
        lines.push("Hadiah: +" + result.gold + " gold");
        lines.push("Exp: +" + result.exp);
      } else {
        lines.push("Tidak menang. Coba lagi!");
      }
      delete player.bingoGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Bingo", lines, result.gold > 0 ? "info" : "warn"));
    }

    // Draw a new number
    let num;
    do {
      num = Math.floor(Math.random() * 50) + 1;
    } while (session.drawn.includes(num));

    session.drawn.push(num);
    session.drawsLeft--;

    const matches = countMatches(session.card, session.drawn);
    const isBingo = checkBingo(session.card, session.drawn);

    const lines = [
      "DRAW #" + session.drawn.length + " (sisa: " + session.drawsLeft + ")",
      "Nomor keluar: " + num,
      session.card.includes(num) ? "MATCH! " + num + " ada di kartu!" : "Tidak match.",
      "",
      "Kartu: " + session.card.join(" | "),
      "Match: " + matches + "/5",
    ];

    if (isBingo) {
      const winnings = session.cost * 10;
      addGold(m, winnings);
      addExp(m, winnings);
      delete player.bingoGame;
      savePlayer(m, player);
      lines.push("");
      lines.push("BINGO! JACKPOT +" + winnings + " gold!");
      lines.push("Exp: +" + winnings);
      return m.reply(claraWrap("RPG Bingo", lines, "info"));
    }

    if (session.drawsLeft <= 0) {
      // Final result
      const result = calculateBingo(matches, session.cost);
      if (result.gold > 0) addGold(m, result.gold);
      if (result.exp > 0) addExp(m, result.exp);
      lines.push("");
      lines.push("Draw habis! Match: " + matches + "/5");
      if (result.gold > 0) {
        lines.push("Hadiah: +" + result.gold + " gold | Exp: +" + result.exp);
      } else {
        lines.push("Tidak menang. Coba lagi!");
      }
      delete player.bingoGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Bingo", lines, result.gold > 0 ? "info" : "warn"));
    }

    savePlayer(m, player);
    lines.push("");
    lines.push("Draw lagi: " + usedPrefix + "rpgbingo " + session.cost + " draw");
    return m.reply(claraWrap("RPG Bingo", lines, session.card.includes(num) ? "info" : "warn"));
  } catch (e) {
    console.error("[RpgBingo]", e);
    return m.reply(claraWrap("RPG Bingo", "Error: " + e.message, "error"));
  }
}

function calculateBingo(matches, cost) {
  if (matches >= 5) return { gold: cost * 10, exp: cost };
  if (matches === 4) return { gold: cost * 3, exp: Math.round(cost * 0.5) };
  if (matches === 3) return { gold: Math.round(cost * 1.5), exp: Math.round(cost * 0.2) };
  return { gold: 0, exp: 0 };
}

export { pluginConfig as config, handler };
