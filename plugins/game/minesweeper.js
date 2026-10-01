// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .minesweeper — cari ranjau 6x6 (port altftool.com "Minesweeper")
// Reply koordinat (a1..f6) buat buka sel. Klik pertama DIJAMIN aman (bom digeser).
// ANIMASI KHAS: radar ◎ menyapu ladang lalu kunci sasaran.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { editFramesAnim } from "../../src/lib/rara-anim-runner.js";

const pluginConfig = {
  name: "minesweeper", alias: ["minesweeper", "cariangka"], category: "game",
  description: "Minesweeper 6x6 — buka semua sel tanpa kena bom",
  usage: ".minesweeper", example: ".minesweeper",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const N = 6, MINES = 6, SAFE = N * N - MINES; // 30 sel aman
const sessions = new Map(); // "chat:sender" -> {mines:Set, open:Set, firstSafe, timer, k}
const key = (m) => `${m.chat}:${m.sender}`;

// bom dibangkitkan saat KLIK PERTAMA, exc kluding sel pertama → dijamin aman
function genMines(safeIdx) {
  const mines = new Set();
  while (mines.size < MINES) {
    const i = Math.floor(Math.random() * N * N);
    if (i === safeIdx) continue;
    mines.add(i);
  }
  return mines;
}
function countAround(i, mines) {
  const r = Math.floor(i / N), c = i % N;
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
    if (mines.has(nr * N + nc)) n++;
  }
  return n;
}

function render(s, reveal = false) {
  const COLS = "abcdef";
  let head = "    ";
  for (const c of COLS) head += c + " ";
  head += "\n";
  let body = "";
  for (let r = 0; r < N; r++) {
    body += " " + (r + 1) + "  ";
    for (let c = 0; c < N; c++) {
      const i = r * N + c;
      if (s.open.has(i)) {
        const n = countAround(i, s.mines);
        body += (n === 0 ? "·" : n) + " ";
      } else if (reveal && s.mines.has(i)) body += "💥 ";
      else body += "▫ ";
    }
    body += "\n";
  }
  return head + body;
}

async function animasiMulai(sock, jid) {
  const frames = [
    "🚩 MINESWEEPER 6×6\n\n📡 ○    memindai ladang…",
    "🚩 MINESWEEPER 6×6\n\n📡  ◎   ○  …",
    "🚩 MINESWEEPER 6×6\n\n📡   ●  6 bom terdeteksi — siap sapu!",
  ];
  return editFramesAnim(sock, jid, frames, { frameMs: process.env.MINE_ANIM_MS !== undefined ? Number(process.env.MINE_ANIM_MS) : 500 });
}

async function handler(m, { sock, config }) {
  const k = key(m);
  if (sessions.has(k)) {
    if ((m.text || "").trim().toLowerCase() === "stop") {
      sessions.delete(k);
      return m.reply(raraWrap("Minesweeper", ["Sesi diakhiri."].join("\n")));
    }
    const s = sessions.get(k);
    return m.reply(raraWrap("Minesweeper", ["MASIH ADA SESI AKTIF",
      "",
      "```" + render(s) + "```",
      "",
      `Buka ${SAFE - s.open.size} sel lagi · reply koordinat (contoh b3) · stop buat keluar`].join("\n")));
  }
  const s = { mines: null, open: new Set(), k, timer: null };
  resetT(s);
  sessions.set(k, s);
  await animasiMulai(sock, m.chat);
  return m.reply(raraWrap("Minesweeper", ["MINESWEEPER 6×6 — 6 BOM TERSEMBUNYI",
    "",
    "```" + render(s) + "```",
    "",
    "Reply koordinat buat buka sel: kolom a-f + baris 1-6 (contoh: b3)",
    "Angka = jumlah bom di sekelilingnya · buka semua 30 sel aman buat menang",
    `Klik pertama dijamin aman · ${m.prefix}minesweeper stop buat keluar`].join("\n")));
}

function resetT(s) { clearTimeout(s.timer); s.timer = setTimeout(() => sessions.delete(s.k), 600000); }

export async function answerHandler(m, sock) {
  const k = key(m);
  const s = sessions.get(k);
  if (!s || m.isCommand) return false;
  const raw = (m.text || "").trim().toLowerCase();
  if (!/^[a-f][1-6]$/.test(raw)) return false;
  clearTimeout(s.timer);
  const i = (Number(raw[1]) - 1) * N + "abcdef".indexOf(raw[0]);
  if (s.open.has(i)) {
    resetT(s);
    await m.reply(raraWrap("Minesweeper", ["Sel " + raw + " udah kebuka",
      "",
      "```" + render(s) + "```"].join("\n")));
    return true;
  }
  if (s.mines === null) s.mines = genMines(i); // klik pertama → bom dibangkitkan di tempat lain
  if (s.mines.has(i)) {
    const board = render(s, true), opened = s.open.size;
    sessions.delete(k);
    await m.reply(raraWrap("Minesweeper", ["💥 BOOM! Kena bom di " + raw,
      "",
      "```" + board + "```",
      "",
      `Kamu aman membuka ${opened} sel · coba lagi: ${m.prefix}minesweeper`].join("\n")));
    return true;
  }
  s.open.add(i);
  if (s.open.size >= SAFE) {
    sessions.delete(k);
    await m.reply(raraWrap("Minesweeper", ["🎉 LADANG BERSIH! KAMU MENANG",
      "",
      "```" + render(s, true) + "```",
      "",
      "Semua 30 sel aman kebuka tanpa kena bom 🔥",
      `Main lagi: ${m.prefix}minesweeper`].join("\n")));
    return true;
  }
  resetT(s);
  const n = countAround(i, s.mines);
  await m.reply(raraWrap("Minesweeper", [n === 0 ? "Sel " + raw + " aman — bebas bom di sekitar" : "Sel " + raw + " aman — " + n + " bom di sekitarnya",
    "",
    "```" + render(s) + "```",
    "",
    `Sisa ${SAFE - s.open.size} sel aman · reply koordinat berikutnya`].join("\n")));
  return true;
}

export { pluginConfig as config, handler };
