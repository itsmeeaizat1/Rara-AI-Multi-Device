// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Battleship — Game kapal perang, tebak posisi untuk tenggelamkan
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgbattleship",
  alias: ["battleshiprpg", "kapalperang", "battleship", "tempurkapal", "kapaltempur"],
  category: "rpg",
  description: "RPG Battleship — Tebak posisi kapal musuh untuk tenggelamkan",
  usage: ".rpgbattleship <biaya> — Mulai game\n.rpgbattleship <biaya> <baris> <kolom> — Tembak (A-E, 1-5)\n.rpgbattleship info — Info",
  example: ".rpgbattleship 500\n.rpgbattleship 500 B 3",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 8,
  isEnabled: true,
};

const GRID_SIZE = 5; // 5x5 grid
const MAX_SHOTS = 12;
const MIN_COST = 300;
const MAX_COST = 3000;
const SHIP_SIZES = [3, 2, 1]; // 3 ships: 1x3, 1x2, 1x1 = 6 cells

function placeShips() {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  SHIP_SIZES.forEach((size, shipIdx) => {
    let placed = false;
    while (!placed) {
      const horizontal = Math.random() < 0.5;
      if (horizontal) {
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * (GRID_SIZE - size + 1));
        let ok = true;
        for (let i = 0; i < size; i++) {
          if (grid[row][col + i] !== 0) { ok = false; break; }
        }
        if (ok) {
          for (let i = 0; i < size; i++) grid[row][col + i] = shipIdx + 1;
          placed = true;
        }
      } else {
        const row = Math.floor(Math.random() * (GRID_SIZE - size + 1));
        const col = Math.floor(Math.random() * GRID_SIZE);
        let ok = true;
        for (let i = 0; i < size; i++) {
          if (grid[row + i][col] !== 0) { ok = false; break; }
        }
        if (ok) {
          for (let i = 0; i < size; i++) grid[row + i][col] = shipIdx + 1;
          placed = true;
        }
      }
    }
  });
  return grid;
}

const ROW_LETTERS = ["A", "B", "C", "D", "E"];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    const cost = parseInt(args[0]) || 0;

    if (cost < MIN_COST) {
      return m.reply(claraWrap("RPG Battleship", [
        "KAPAL PERANG",
        "Tembak kapal musuh di grid 5x5!",
        "",
        "Grid: A-E (baris) x 1-5 (kolom)",
        "3 kapal: ukuran 3, 2, 1 (total 6 sel)",
        "Max tembakan: " + MAX_SHOTS,
        "Tenggelamkan semua = menang " + (MAX_COST) + "g!",
        "",
        "Min: " + MIN_COST + " | Max: " + MAX_COST + " gold",
        "",
        "Cara: " + usedPrefix + "rpgbattleship <biaya> <baris> <kolom>",
        "Contoh: " + usedPrefix + "rpgbattleship 500 B 3",
      ], "info"));
    }

    if (cost > MAX_COST) {
      return m.reply(claraWrap("RPG Battleship", "Max: " + MAX_COST, "warn"));
    }

    const session = player.battleshipGame;
    const rowArg = args[1]?.toUpperCase();
    const colArg = parseInt(args[2]);

    // Start new game
    if (!rowArg || !colArg) {
      if ((player.gold || 0) < cost) {
        return m.reply(claraWrap("RPG Battleship", "Gold kurang! Punya: " + (player.gold || 0), "warn"));
      }

      addGold(m, -cost);
      const grid = placeShips();
      player.battleshipGame = {
        grid,
        shots: [],
        shotsLeft: MAX_SHOTS,
        hits: 0,
        totalCells: 6,
        cost,
        startTime: Date.now(),
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Battleship", [
        "GAME DIMULAI!",
        "Biaya: " + cost + " gold",
        "",
        "Grid 5x5: A-E baris, 1-5 kolom",
        "3 kapal (6 sel total) tersembunyi",
        "Tembakan: " + MAX_SHOTS,
        "",
        "Tembak: " + usedPrefix + "rpgbattleship " + cost + " <baris> <kolom>",
        "Contoh: " + usedPrefix + "rpgbattleship " + cost + " B 3",
      ], "info"));
    }

    // Shoot
    if (!session) {
      return m.reply(claraWrap("RPG Battleship", "Tidak ada game aktif. Mulai: " + usedPrefix + "rpgbattleship " + cost, "warn"));
    }

    if (Date.now() - session.startTime > 300000) {
      delete player.battleshipGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Battleship", "Game expired (5 min). Mulai ulang.", "warn"));
    }

    const rowIndex = ROW_LETTERS.indexOf(rowArg);
    if (rowIndex < 0 || rowIndex >= GRID_SIZE) {
      return m.reply(claraWrap("RPG Battleship", "Baris tidak valid (A-E)", "warn"));
    }
    if (isNaN(colArg) || colArg < 1 || colArg > GRID_SIZE) {
      return m.reply(claraWrap("RPG Battleship", "Kolom tidak valid (1-5)", "warn"));
    }

    const colIndex = colArg - 1;
    const shotKey = rowArg + colArg;

    // Check if already shot
    if (session.shots.includes(shotKey)) {
      return m.reply(claraWrap("RPG Battleship", "Sudah ditembak! Pilih sel lain.", "warn"));
    }

    session.shots.push(shotKey);
    session.shotsLeft--;

    const isHit = session.grid[rowIndex][colIndex] !== 0;
    if (isHit) {
      session.hits++;
      const shipId = session.grid[rowIndex][colIndex];
      session.grid[rowIndex][colIndex] = 0; // mark as hit

      // Check if ship fully sunk
      let shipRemaining = false;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (session.grid[r][c] === shipId) { shipRemaining = true; break; }
        }
        if (shipRemaining) break;
      }

      const lines = [
        "Tembak " + shotKey + ": HIT!",
        shipRemaining ? "Kapal terluka tapi belum tenggelam" : "KAPAL TENGGELAM!",
        "",
        "Hits: " + session.hits + "/" + session.totalCells,
        "Tembakan tersisa: " + session.shotsLeft,
      ];

      if (session.hits >= session.totalCells) {
        // Win!
        const winnings = cost * 4;
        addGold(m, winnings);
        addExp(m, cost);
        delete player.battleshipGame;
        savePlayer(m, player);
        lines.push("");
        lines.push("SEMUA KAPAL TENGGELAM! MENANG!");
        lines.push("+" + winnings + " gold | +" + cost + " exp");
        return m.reply(claraWrap("RPG Battleship", lines, "info"));
      }
    } else {
      const lines = [
        "Tembak " + shotKey + ": MISS!",
        "Hits: " + session.hits + "/" + session.totalCells,
        "Tembakan tersisa: " + session.shotsLeft,
      ];

      if (session.shotsLeft <= 0) {
        // Game over
        addExp(m, session.hits * 30);
        delete player.battleshipGame;
        savePlayer(m, player);
        lines.push("");
        lines.push("Tembakan habis! Game over.");
        lines.push("Hits: " + session.hits + "/" + session.totalCells);
        lines.push("Exp: +" + (session.hits * 30));
        return m.reply(claraWrap("RPG Battleship", lines, "warn"));
      }
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Battleship", lines, "warn"));
    }

    if (session.shotsLeft <= 0) {
      addExp(m, session.hits * 30);
      delete player.battleshipGame;
      savePlayer(m, player);
      const lines2 = ["Tembakan habis!", "Hits: " + session.hits + "/" + session.totalCells, "Exp: +" + (session.hits * 30)];
      return m.reply(claraWrap("RPG Battleship", lines2, "warn"));
    }

    savePlayer(m, player);
    lines.push("");
    lines.push("Tembak lagi: " + usedPrefix + "rpgbattleship " + cost + " <baris> <kolom>");
    return m.reply(claraWrap("RPG Battleship", lines, "info"));
  } catch (e) {
    console.error("[RpgBattleship]", e);
    return m.reply(claraWrap("RPG Battleship", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
