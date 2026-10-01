// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .fourinarow — Connect Four vs AI (port altftool.com "Four in a Row")
// Reply angka 1-7 buat drop disc. ANIMASI KHAS: disc 🔵 jatuh ke bawah kolom frame demi frame.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { editFramesAnim } from "../../src/lib/rara-anim-runner.js";

const pluginConfig = {
  name: "fourinarow", alias: ["connect4", "connectfour"], category: "game",
  description: "Connect Four — susun 4 sejajar lawan AI",
  usage: ".fourinarow", example: ".fourinarow",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const W = 7, H = 6;
const sessions = new Map(); // "chat:sender" -> {board, turn, timer, k}
const key = (m) => `${m.chat}:${m.sender}`;

const drop = (board, col) => { // return row index (dari bawah) atau -1 kalau penuh
  for (let r = H - 1; r >= 0; r--) if (board[r * W + col] === 0) return r;
  return -1;
};
function checkWin(board, p) {
  const at = (r, c) => (r >= 0 && r < H && c >= 0 && c < W ? board[r * W + c] : 0);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (at(r, c) !== p) continue;
    if (at(r, c + 1) === p && at(r, c + 2) === p && at(r, c + 3) === p) return true;
    if (at(r + 1, c) === p && at(r + 2, c) === p && at(r + 3, c) === p) return true;
    if (at(r + 1, c + 1) === p && at(r + 2, c + 2) === p && at(r + 3, c + 3) === p) return true;
    if (at(r + 1, c - 1) === p && at(r + 2, c - 2) === p && at(r + 3, c - 3) === p) return true;
  }
  return false;
}
const full = (board) => board.every((v) => v !== 0);

function render(board) {
  const sym = (v) => (v === 1 ? "🔵" : v === 2 ? "🔴" : "⚫");
  let s = "1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣\n";
  for (let r = 0; r < H; r++) s += [0, 1, 2, 3, 4, 5, 6].map((c) => sym(board[r * W + c])).join("") + "\n";
  return s;
}

// AI: 1) menang kalau bisa 2) blok kemenangan player 3) kolom tengah dulu
function aiMove(board) {
  for (const p of [2, 1]) {
    for (let c = 0; c < W; c++) {
      const r = drop(board, c);
      if (r < 0) continue;
      board[r * W + c] = p;
      const win = checkWin(board, p);
      board[r * W + c] = 0;
      if (win) return c;
    }
  }
  for (const c of [3, 2, 4, 1, 5, 0, 6]) if (drop(board, c) >= 0) return c;
  return -1;
}

async function animasiMulai(sock, jid) {
  const frames = [
    "🔵 FOUR IN A ROW\n\n⚫⚫⚫⚫⚫⚫⚫",
    "🔵 FOUR IN A ROW\n\n⚫⚫⚫⚫⚫⚫⚫\n🔵",
    "🔵 FOUR IN A ROW\n\n⚫⚫⚫⚫⚫⚫⚫\n⚫\n🔵",
    "🔵 FOUR IN A ROW\n\n⚫⚫⚫⚫⚫⚫⚫\n⚫\n⚫\n🔵 — SIAP!",
  ];
  return editFramesAnim(sock, jid, frames, { frameMs: process.env.C4_ANIM_MS !== undefined ? Number(process.env.C4_ANIM_MS) : 450 });
}

async function handler(m, { sock, config }) {
  const k = key(m);
  if (sessions.has(k)) {
    if ((m.text || "").trim().toLowerCase() === "stop") {
      sessions.delete(k);
      return m.reply(raraWrap("Four in a Row", ["Sesi diakhiri."].join("\n")));
    }
    return m.reply(raraWrap("Four in a Row", ["MASIH ADA SESI AKTIF",
      "",
      "```" + render(sessions.get(k).board) + "```",
      "",
      `Reply 1-7 buat drop disc 🔵 · ${m.prefix}fourinarow stop buat keluar`].join("\n")));
  }
  const s = { board: Array(W * H).fill(0), k, timer: null };
  resetT(s);
  sessions.set(k, s);
  await animasiMulai(sock, m.chat);
  return m.reply(raraWrap("Four in a Row", ["KAMU 🔵 VS AI 🔴 — SUSUN 4 SEJAJAR",
    "",
    "```" + render(s.board) + "```",
    "",
    "Reply angka 1-7 buat drop disc di kolom itu. Kamu duluan!"].join("\n")));
}

function resetT(s) { clearTimeout(s.timer); s.timer = setTimeout(() => sessions.delete(s.k), 600000); }

export async function answerHandler(m, sock) {
  const k = key(m);
  const s = sessions.get(k);
  if (!s || m.isCommand) return false;
  const raw = (m.text || "").trim();
  if (!/^[1-7]$/.test(raw)) return false; // bukan input game → gak dikonsumsi
  clearTimeout(s.timer);
  const col = Number(raw) - 1;
  const r = drop(s.board, col);
  if (r < 0) {
    resetT(s);
    await m.reply(raraWrap("Four in a Row", ["Kolom " + (col + 1) + " penuh, pilih kolom lain",
      "",
      "```" + render(s.board) + "```"].join("\n")));
    return true;
  }
  s.board[r * W + col] = 1;
  if (checkWin(s.board, 1)) {
    sessions.delete(k);
    await m.reply(raraWrap("Four in a Row", ["🏆 KAMU MENANG!",
      "",
      "```" + render(s.board) + "```",
      "",
      `Lawan AI lagi: ${m.prefix}fourinarow`].join("\n")));
    return true;
  }
  if (full(s.board)) {
    sessions.delete(k);
    await m.reply(raraWrap("Four in a Row", ["🤝 SERI — papan penuh",
      "",
      "```" + render(s.board) + "```",
      "",
      `Main lagi: ${m.prefix}fourinarow`].join("\n")));
    return true;
  }
  const aiCol = aiMove(s.board);
  const aiRow = drop(s.board, aiCol);
  s.board[aiRow * W + aiCol] = 2;
  if (checkWin(s.board, 2)) {
    sessions.delete(k);
    await m.reply(raraWrap("Four in a Row", ["💀 AI MENANG — coba lagi ya",
      "",
      "```" + render(s.board) + "```",
      "",
      `Main lagi: ${m.prefix}fourinarow`].join("\n")));
    return true;
  }
  if (full(s.board)) {
    sessions.delete(k);
    await m.reply(raraWrap("Four in a Row", ["🤝 SERI — papan penuh",
      "",
      "```" + render(s.board) + "```",
      "",
      `Main lagi: ${m.prefix}fourinarow`].join("\n")));
    return true;
  }
  resetT(s);
  await m.reply(raraWrap("Four in a Row", ["AI drop di kolom " + (aiCol + 1),
    "",
    "```" + render(s.board) + "```",
    "",
    "Reply 1-7 — giliranmu 🔵"].join("\n")));
  return true;
}

export { pluginConfig as config, handler };
