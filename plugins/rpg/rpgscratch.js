// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Scratch Card — Kartu gosok, beli & gosok untuk hadiah instan
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgscratch",
  alias: ["scratchcard", "gosaokkuit", "kartugosok", "gosok", "scratchrpg", "lotre Gosok"],
  category: "rpg",
  description: "RPG Scratch Card — Beli kartu gosok untuk hadiah instan",
  usage: ".rpgscratch buy — Beli kartu (1000 gold)\n.rpgscratch open — Gosok kartu\n.rpgscratch stock — Cek stok kartu",
  example: ".rpgscratch buy\n.rpgscratch open",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 5,
  isEnabled: true,
};

const CARD_PRICE = 1000;

// 3x3 grid, match 3 same = win
const SYMBOLS = [
  { id: "cherry", emoji: "🍒", gold: 500, exp: 20 },
  { id: "bell", emoji: "🔔", gold: 1000, exp: 40 },
  { id: "bar", emoji: "🍫", gold: 2000, exp: 80 },
  { id: "diamond", emoji: "💎", gold: 5000, exp: 200 },
  { id: "seven", emoji: "7️⃣", gold: 10000, exp: 500 },
  { id: "skull", emoji: "💀", gold: 0, exp: 0 },
  { id: "coin", emoji: "🪙", gold: 300, exp: 10 },
  { id: "star", emoji: "⭐", gold: 800, exp: 30 },
];

function generateCard() {
  // 3x3 grid
  const grid = [];
  for (let i = 0; i < 9; i++) {
    grid.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  return grid;
}

function checkWin(grid) {
  // Check rows, columns, diagonals for 3 matching
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6], // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (grid[a].id === grid[b].id && grid[b].id === grid[c].id) {
      return { win: true, symbol: grid[a], line: [a, b, c] };
    }
  }
  return { win: false, symbol: null, line: null };
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Scratch", [
        "KARTU GOSOK RPG",
        "Beli kartu, gosok, match 3 simbol = menang!",
        "",
        "SIMBOL & HADIAH:",
        "🍒 Cherry - 500 gold",
        "🔔 Bell - 1000 gold",
        "🍫 Bar - 2000 gold",
        "💎 Diamond - 5000 gold",
        "7️⃣ Seven - 10000 gold (JACKPOT)",
        "💀 Skull - 0 gold (zonk)",
        "🪙 Coin - 300 gold",
        "⭐ Star - 800 gold",
        "",
        "PERINTAH:",
        usedPrefix + "rpgscratch buy - Beli kartu (" + CARD_PRICE + " gold)",
        usedPrefix + "rpgscratch open - Gosok kartu",
        usedPrefix + "rpgscratch stock - Cek stok",
      ], "info"));
    }

    if (action === "buy") {
      if ((player.gold || 0) < CARD_PRICE) {
        return m.reply(claraWrap("RPG Scratch", [
          "Gold tidak cukup!",
          "Butuh: " + CARD_PRICE + " | Punya: " + (player.gold || 0),
        ], "warn"));
      }

      addGold(m, -CARD_PRICE);
      player.scratchCards = (player.scratchCards || 0) + 1;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Scratch", [
        "Kartu gosok dibeli!",
        "Harga: " + CARD_PRICE + " gold",
        "Stok kartu: " + player.scratchCards,
        "",
        "Gosok: " + usedPrefix + "rpgscratch open",
      ], "info"));
    }

    if (action === "stock") {
      return m.reply(claraWrap("RPG Scratch", [
        "Stok kartu gosok: " + (player.scratchCards || 0),
        "Beli: " + usedPrefix + "rpgscratch buy (" + CARD_PRICE + " gold)",
      ], "info"));
    }

    if (action === "open") {
      if ((player.scratchCards || 0) < 1) {
        return m.reply(claraWrap("RPG Scratch", [
          "Tidak ada kartu gosok!",
          "Beli dulu: " + usedPrefix + "rpgscratch buy",
        ], "warn"));
      }

      player.scratchCards = (player.scratchCards || 0) - 1;

      const grid = generateCard();
      const result = checkWin(grid);

      // Build 3x3 display
      const gridDisplay = [
        "KARTU GOSOK:",
        grid[0].emoji + " | " + grid[1].emoji + " | " + grid[2].emoji,
        grid[3].emoji + " | " + grid[4].emoji + " | " + grid[5].emoji,
        grid[6].emoji + " | " + grid[7].emoji + " | " + grid[8].emoji,
        "",
      ];

      if (result.win) {
        addGold(m, result.symbol.gold);
        addExp(m, result.symbol.exp);
        savePlayer(m, player);

        gridDisplay.push("MENANG! 3x " + result.symbol.emoji + " " + result.symbol.id.toUpperCase());
        gridDisplay.push("Hadiah: +" + result.symbol.gold + " gold");
        gridDisplay.push("Exp: +" + result.symbol.exp);
        gridDisplay.push("");
        if (result.symbol.id === "seven") {
          gridDisplay.push("JACKPOT!!! 🎉🎉");
        }
      } else {
        savePlayer(m, player);
        gridDisplay.push("Tidak ada match. Coba lagi!");
      }

      gridDisplay.push("Sisa kartu: " + (player.scratchCards || 0));

      return m.reply(claraWrap("RPG Scratch", gridDisplay, result.win ? "info" : "warn"));
    }

    return m.reply(claraWrap("RPG Scratch", "Perintah: buy, open, stock. Ketik .rpgscratch help", "warn"));
  } catch (e) {
    console.error("[RpgScratch]", e);
    return m.reply(claraWrap("RPG Scratch", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
