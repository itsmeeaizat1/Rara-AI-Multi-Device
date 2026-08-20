// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Carnival — Karnaval mini-games, 3 game dalam 1 plugin
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgcarnival",
  alias: ["carnivalrpg", "karnaval", "funfair", "karnavalrpg", "carnivalgame"],
  category: "rpg",
  description: "RPG Carnival — Karnaval mini-games, 3 game: dart, ring toss, dice",
  usage: ".rpgcarnival — Menu karnaval\n.rpgcarnival dart <biaya> — Lempar dart\n.rpgcarnival ring <biaya> — Lempar cincin\n.rpgcarnival dice <biaya> <angka 1-6> — Tebak dadu\n.rpgcarnival info — Statistik",
  example: ".rpgcarnival dart 500\n.rpgcarnival dice 1000 3",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const MIN_COST = 100;
const MAX_COST = 2000;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const game = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!game || game === "help") {
      return m.reply(claraWrap("RPG Carnival", [
        "KARNAVAL RPG",
        "3 mini-game dalam satu tempat!",
        "",
        "GAME:",
        "1. Dart - Lempar dart, tebak zona papan (0-10)",
        "   0 = bullseye 10x | 1-3 = 5x | 4-7 = 2x | 8-10 = zonk",
        "2. Ring - Lempar cincin ke tiang (1-5 tiang)",
        "   Tebak tiang yang kena, 3x jika benar",
        "3. Dice - Tebak angka dadu (1-6)",
        "   Benar = 6x | Ganjil/genap = 2x",
        "",
        "Min: " + MIN_COST + " | Max: " + MAX_COST,
        "",
        "PERINTAH:",
        usedPrefix + "rpgcarnival dart <biaya>",
        usedPrefix + "rpgcarnival ring <biaya>",
        usedPrefix + "rpgcarnival dice <biaya> <angka>",
        usedPrefix + "rpgcarnival info",
      ], "info"));
    }

    if (game === "info") {
      const stats = player.carnivalStats || {};
      const lines = [
        "STATISTIK KARNAVAL",
        "Dart: " + (stats.dart || 0) + " main, " + (stats.dartWin || 0) + " menang",
        "Ring: " + (stats.ring || 0) + " main, " + (stats.ringWin || 0) + " menang",
        "Dice: " + (stats.dice || 0) + " main, " + (stats.diceWin || 0) + " menang",
        "Total gold: " + (stats.totalGold || 0),
        "Total exp: " + (stats.totalExp || 0),
      ];
      return m.reply(claraWrap("RPG Carnival", lines, "info"));
    }

    const cost = parseInt(args[1]) || 0;

    if (cost < MIN_COST || cost > MAX_COST) {
      return m.reply(claraWrap("RPG Carnival", "Biaya: " + MIN_COST + " - " + MAX_COST, "warn"));
    }

    if ((player.gold || 0) < cost) {
      return m.reply(claraWrap("RPG Carnival", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
    }

    if (!player.carnivalStats) player.carnivalStats = {};

    if (game === "dart") {
      // Dart game: random 0-10, 0 = bullseye
      addGold(m, -cost);
      player.carnivalStats.dart = (player.carnivalStats.dart || 0) + 1;

      const zone = Math.floor(Math.random() * 11);
      let multiplier = 0;
      let result = "Miss!";

      if (zone === 0) { multiplier = 10; result = "BULLSEYE! PERFECT!"; }
      else if (zone <= 3) { multiplier = 5; result = "Zona dalam! Hebat!"; }
      else if (zone <= 7) { multiplier = 2; result = "Zona tengah, lumayan"; }
      else { multiplier = 0; result = "Zona luar, meleset!"; }

      const lines = ["DART GAME", "Biaya: " + cost + " gold", "", "Zona: " + zone + " — " + result];

      if (multiplier > 0) {
        const winnings = cost * multiplier;
        addGold(m, winnings);
        addExp(m, Math.round(winnings * 0.1));
        player.carnivalStats.dartWin = (player.carnivalStats.dartWin || 0) + 1;
        player.carnivalStats.totalGold = (player.carnivalStats.totalGold || 0) + winnings;
        lines.push("Gold: +" + winnings + " (" + multiplier + "x)");
        lines.push("Exp: +" + Math.round(winnings * 0.1));
      } else {
        lines.push("Tidak menang! -" + cost + " gold");
      }

      savePlayer(m, player);
      return m.reply(claraWrap("RPG Carnival", lines, multiplier > 0 ? "info" : "warn"));
    }

    if (game === "ring") {
      // Ring toss: 5 poles, 1 random pole gets ringed
      addGold(m, -cost);
      player.carnivalStats.ring = (player.carnivalStats.ring || 0) + 1;

      const winningPole = Math.floor(Math.random() * 5) + 1;
      const lines = ["RING TOSS", "Biaya: " + cost + " gold", "", "Tiang 1  2  3  4  5", "Cincin mendarat di tiang " + winningPole + "!"];

      // 40% chance to land on a winning pole
      const isWin = Math.random() < 0.4;

      if (isWin) {
        const winnings = cost * 3;
        addGold(m, winnings);
        addExp(m, Math.round(winnings * 0.1));
        player.carnivalStats.ringWin = (player.carnivalStats.ringWin || 0) + 1;
        player.carnivalStats.totalGold = (player.carnivalStats.totalGold || 0) + winnings;
        lines.push("KENA! Gold: +" + winnings + " (3x)");
        lines.push("Exp: +" + Math.round(winnings * 0.1));
      } else {
        lines.push("Meleset! -" + cost + " gold");
      }

      savePlayer(m, player);
      return m.reply(claraWrap("RPG Carnival", lines, isWin ? "info" : "warn"));
    }

    if (game === "dice") {
      const guess = parseInt(args[2]);
      if (!guess || guess < 1 || guess > 6) {
        return m.reply(claraWrap("RPG Carnival", "Tebak angka 1-6", "warn"));
      }

      addGold(m, -cost);
      player.carnivalStats.dice = (player.carnivalStats.dice || 0) + 1;

      const roll = Math.floor(Math.random() * 6) + 1;
      const lines = ["DICE GAME", "Biaya: " + cost + " gold", "Tebakan: " + guess, "Dadu: " + roll, ""];

      if (roll === guess) {
        // Exact match
        const winnings = cost * 6;
        addGold(m, winnings);
        addExp(m, Math.round(winnings * 0.1));
        player.carnivalStats.diceWin = (player.carnivalStats.diceWin || 0) + 1;
        player.carnivalStats.totalGold = (player.carnivalStats.totalGold || 0) + winnings;
        lines.push("TEBAKAN BENAR! Gold: +" + winnings + " (6x)");
        lines.push("Exp: +" + Math.round(winnings * 0.1));
      } else if ((roll % 2) === (guess % 2)) {
        // Same parity (odd/even)
        const winnings = cost * 2;
        addGold(m, winnings);
        addExp(m, Math.round(winnings * 0.05));
        player.carnivalStats.diceWin = (player.carnivalStats.diceWin || 0) + 1;
        player.carnivalStats.totalGold = (player.carnivalStats.totalGold || 0) + winnings;
        lines.push("Ganjil/genap sama! Gold: +" + winnings + " (2x)");
      } else {
        lines.push("Salah! -" + cost + " gold");
      }

      savePlayer(m, player);
      return m.reply(claraWrap("RPG Carnival", lines, roll === guess ? "info" : roll % 2 === guess % 2 ? "info" : "warn"));
    }

    if (game === "prophecy") {
      // Hidden prophecy game
      return m.reply(claraWrap("RPG Prophecy", "Fitur ini belum tersedia. Cek " + usedPrefix + "rpgprophecy!", "warn"));
    }

    return m.reply(claraWrap("RPG Carnival", "Game: dart, ring, dice. Ketik " + usedPrefix + "rpgcarnival help", "warn"));
  } catch (e) {
    console.error("[RpgCarnival]", e);
    return m.reply(claraWrap("RPG Carnival", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
