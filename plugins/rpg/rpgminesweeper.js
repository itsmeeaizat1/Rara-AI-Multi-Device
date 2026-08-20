// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Minesweeper — Tebak sel aman, hindari bom untuk gold
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgminesweeper",
  alias: ["minesweeperrpg", "tambangberbahaya", "hindaribom", "minesweeper", "tambangbom"],
  category: "rpg",
  description: "RPG Minesweeper — Pilih sel aman, hindari bom untuk gold bertambah",
  usage: ".rpgminesweeper <biaya> — Mulai game\n.rpgminesweeper <biaya> cashout — Tarik gold\n.rpgminesweeper <biaya> <nomor 1-25> — Buka sel",
  example: ".rpgminesweeper 500\n.rpgminesweeper 500 7",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const GRID_SIZE = 5; // 5x5 = 25 cells
const MIN_COST = 200;
const MAX_COST = 5000;
const BOMBS = 4; // 4 bombs out of 25

function generateBoard() {
  const cells = Array(GRID_SIZE * GRID_SIZE).fill(false);
  let bombsPlaced = 0;
  while (bombsPlaced < BOMBS) {
    const idx = Math.floor(Math.random() * cells.length);
    if (!cells[idx]) { cells[idx] = true; bombsPlaced++; }
  }
  return cells;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    const cost = parseInt(args[0]) || 0;

    if (cost < MIN_COST) {
      return m.reply(claraWrap("RPG Minesweeper", [
        "TAMBAK BERBAHAYA",
        "Buka sel aman, hindari bom!",
        "",
        "Grid 5x5 (25 sel) | " + BOMBS + " bom",
        "Tiap sel aman dibuka = gold naik",
        "Cash out kapan saja untuk amankan gold",
        "Kena bom = kehilangan semua!",
        "",
        "Min: " + MIN_COST + " | Max: " + MAX_COST,
        "",
        "Cara:",
        usedPrefix + "rpgminesweeper <biaya> — Mulai",
        usedPrefix + "rpgminesweeper <biaya> <1-25> — Buka sel",
        usedPrefix + "rpgminesweeper <biaya> cashout — Tarik gold",
      ], "info"));
    }

    if (cost > MAX_COST) {
      return m.reply(claraWrap("RPG Minesweeper", "Max: " + MAX_COST, "warn"));
    }

    const action2 = args[1]?.toLowerCase();
    const session = player.minesweeperGame;

    // Start new game
    if (!action2) {
      if ((player.gold || 0) < cost) {
        return m.reply(claraWrap("RPG Minesweeper", "Gold kurang!", "warn"));
      }

      addGold(m, -cost);
      const board = generateBoard();
      player.minesweeperGame = {
        board,
        opened: [],
        safeCells: 25 - BOMBS,
        cost,
        currentPot: cost,
        multiplier: 1.0,
        startTime: Date.now(),
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Minesweeper", [
        "GAME DIMULAI!",
        "Biaya: " + cost + " gold | Pot: " + cost + " gold",
        "",
        "Grid 5x5 — pilih nomor 1-25",
        "Sel aman = pot naik 1.3x",
        "Kena bom = kalah semua!",
        "",
        "Buka: " + usedPrefix + "rpgminesweeper " + cost + " <nomor>",
        "Tarik: " + usedPrefix + "rpgminesweeper " + cost + " cashout",
      ], "info"));
    }

    if (!session) {
      return m.reply(claraWrap("RPG Minesweeper", "Tidak ada game aktif. Mulai: " + usedPrefix + "rpgminesweeper " + cost, "warn"));
    }

    if (Date.now() - session.startTime > 180000) {
      delete player.minesweeperGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Minesweeper", "Game expired (3 min).", "warn"));
    }

    if (action2 === "cashout") {
      addGold(m, Math.round(session.currentPot));
      const cashedOut = Math.round(session.currentPot);
      const profit = cashedOut - session.cost;
      delete player.minesweeperGame;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Minesweeper", [
        "CASH OUT!",
        "Pot: +" + cashedOut + " gold",
        "Profit: " + (profit >= 0 ? "+" : "") + profit + " gold",
        "Sel dibuka: " + session.opened.length + "/" + session.safeCells,
      ], "info"));
    }

    const cellNum = parseInt(action2);
    if (isNaN(cellNum) || cellNum < 1 || cellNum > 25) {
      return m.reply(claraWrap("RPG Minesweeper", "Nomor sel 1-25", "warn"));
    }

    const cellIdx = cellNum - 1;

    if (session.opened.includes(cellIdx)) {
      return m.reply(claraWrap("RPG Minesweeper", "Sel " + cellNum + " sudah dibuka!", "warn"));
    }

    // Check if bomb
    if (session.board[cellIdx]) {
      // BOMB!
      delete player.minesweeperGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Minesweeper", [
        "BOOM! 💥",
        "Sel " + cellNum + " adalah BOM!",
        "Kehilangan: " + session.cost + " gold",
        "",
        "Pot yang hilang: " + Math.round(session.currentPot) + " gold",
        "Sel dibuka sebelum boom: " + session.opened.length,
      ], "warn"));
    }

    // Safe!
    session.opened.push(cellIdx);
    session.multiplier = 1.0 + (session.opened.length * 0.3);
    session.currentPot = Math.round(session.cost * session.multiplier);

    // Check if all safe cells opened
    if (session.opened.length >= session.safeCells) {
      // All safe cells opened - perfect clear!
      const winnings = Math.round(session.currentPot * 1.5);
      addGold(m, winnings);
      addExp(m, session.cost * 2);
      delete player.minesweeperGame;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Minesweeper", [
        "PERFECT CLEAR!",
        "Semua " + session.safeCells + " sel aman dibuka!",
        "Bonus: 1.5x pot!",
        "Gold: +" + winnings,
        "Exp: +" + (session.cost * 2),
      ], "info"));
    }

    savePlayer(m, player);

    return m.reply(claraWrap("RPG Minesweeper", [
      "Sel " + cellNum + ": AMAN!",
      "Sel dibuka: " + session.opened.length + "/" + session.safeCells,
      "Pot sekarang: " + session.currentPot + " gold (" + session.multiplier.toFixed(1) + "x)",
      "",
      "Buka: " + usedPrefix + "rpgminesweeper " + cost + " <nomor>",
      "Tarik: " + usedPrefix + "rpgminesweeper " + cost + " cashout",
    ], "info"));
  } catch (e) {
    console.error("[RpgMinesweeper]", e);
    return m.reply(claraWrap("RPG Minesweeper", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
