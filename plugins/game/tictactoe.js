// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tictactoe.js — Tic Tac Toe game (2 player via reply, no API needed)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "tictactoe",
  alias: ["tictactoe"],
  category: "rpg",
  description: "Game Tic Tac Toe (X vs O) — 2 player di grup",
  usage: ".tictactoe @tag [X/O]",
  example: ".tictactoe @user\n.tictactoe @user X",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

// Active games: chatId -> game state
const games = new Map();

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function checkWin(board, sym) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] === sym && board[b] === sym && board[c] === sym) return true;
  }
  return false;
}

function isFull(board) {
  return board.every(c => c !== null);
}

function renderBoard(board) {
  const sym = c => c === "X" ? "❌" : c === "O" ? "⭕" : "⬜";
  let text = "";
  for (let i = 0; i < 9; i += 3) {
    text += `${sym(board[i])}${sym(board[i+1])}${sym(board[i+2])}\n`;
  }
  // Add position numbers
  text += "\nPosisi:\n1 2 3\n4 5 6\n7 8 9";
  return text;
}

async function handler(m, { sock, config, db }) {
  try {
    const mentioned = m.mentionedJid?.[0];

    if (!mentioned) {
      return m.reply(claraWrap("Tic Tac Toe", [
        "Game Tic Tac Toe (X vs O)",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}tictactoe @tag — ajak lawan`,
        `${m.prefix}tictactoe @tag X — pilih simbol X`,
        "",
        "💡 *Contoh:*",
        `${m.prefix}tictactoe @628xxx`,
        `${m.prefix}tictactoe @628xxx X`,
        "",
        "Game: balas nomor 1-9 untuk isi kotak",
      ]));
    }

    // Check if there's already a game in this chat
    if (games.has(m.chat)) {
      const existing = games.get(m.chat);
      if (!existing.ended) {
        return m.reply(claraWrap("Tic Tac Toe", [
          "Masih ada game yang sedang berlangsung!",
          `Pemain: ${existing.p1Name} (❌) vs ${existing.p2Name} (⭕)`,
          `Giliran: ${existing.turn === "X" ? existing.p1Name : existing.p2Name}`,
          "",
          `Ketik "${m.prefix}tictactoe end" untuk akhiri game.`,
        ]));
      }
    }

    // End command
    if (m.text?.toLowerCase().includes("end")) {
      if (games.has(m.chat)) {
        games.delete(m.chat);
        return m.reply(claraWrap("Tic Tac Toe", "Game diakhiri."));
      }
    }

    // Determine symbols
    let p1Sym = "X";
    let p2Sym = "O";
    const symArg = m.args?.find(a => a.toUpperCase() === "X" || a.toUpperCase() === "O");
    if (symArg) {
      p1Sym = symArg.toUpperCase();
      p2Sym = p1Sym === "X" ? "O" : "X";
    }

    const p1Name = m.pushName || "Player 1";
    const p2Name = mentioned.split("@")[0] || "Player 2";

    const game = {
      board: Array(9).fill(null),
      turn: "X",
      p1: m.sender,
      p2: mentioned,
      p1Name,
      p2Name,
      p1Sym,
      p2Sym,
      ended: false,
      startTime: Date.now(),
    };

    games.set(m.chat, game);

    // Auto-end after 5 minutes
    setTimeout(() => {
      if (games.has(m.chat) && !games.get(m.chat).ended) {
        games.delete(m.chat);
      }
    }, 300000);
    const turnName = p1Sym === "X" ? p1Name : p2Name;
    return m.reply(claraWrap("Tic Tac Toe", [
      `${p1Name} (${p1Sym === "X" ? "❌" : "⭕"}) vs ${p2Name} (${p2Sym === "X" ? "❌" : "⭕"})`,
      "",
      renderBoard(game.board),
      "",
      `Giliran: ${turnName} (${p1Sym === "X" ? "❌" : "⭕"})`,
      `Balas nomor 1-9 untuk isi kotak`,
    ]));
  } catch (e) {
    console.error("[tictactoe] error:", e.message);
    return m.reply(te(m.prefix, m.command, m.pushName), "tictactoe");
  }
}

// Export move handler for integration
export function handleTicTacToeMove(chatId, sender, text) {
  if (!games.has(chatId)) return null;
  const game = games.get(chatId);
  if (game.ended) return null;

  const pos = parseInt(text.trim());
  if (isNaN(pos) || pos < 1 || pos > 9) return null;

  const idx = pos - 1;
  if (game.board[idx] !== null) return { error: "occupied", pos: idx };

  // Check whose turn
  const isP1 = sender === game.p1;
  const isP2 = sender === game.p2;
  if (!isP1 && !isP2) return { error: "not_player" };

  const playerSym = isP1 ? game.p1Sym : game.p2Sym;
  if (game.turn !== playerSym) return { error: "not_turn", turn: game.turn };

  // Make move
  game.board[idx] = playerSym;

  // Check win
  if (checkWin(game.board, playerSym)) {
    game.ended = true;
    const winnerName = isP1 ? game.p1Name : game.p2Name;
    games.delete(chatId);
    return {
      win: true,
      winner: winnerName,
      sym: playerSym,
      board: game.board,
    };
  }

  // Check draw
  if (isFull(game.board)) {
    game.ended = true;
    games.delete(chatId);
    return { draw: true, board: game.board };
  }

  // Switch turn
  game.turn = game.turn === "X" ? "O" : "X";
  const nextName = game.turn === game.p1Sym ? game.p1Name : game.p2Name;

  return {
    win: false,
    draw: false,
    board: game.board,
    nextTurn: game.turn,
    nextName,
  };
}

export { pluginConfig as config, handler };
