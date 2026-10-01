// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .game2048 — puzzle geser gabung angka sampai 2048 (port altftool.com "2048 Game")
// Kontrol reply: w (atas) a (kiri) s (bawah) d (kanan).
// ANIMASI KHAS: tile angka menggabung 2→4→8 (beda dari game lain).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { editFramesAnim } from "../../src/lib/rara-anim-runner.js";

const pluginConfig = {
  name: "game2048", alias: ["2048", "twenty48"], category: "game",
  description: "Puzzle 2048 — gabung tile sampai 2048",
  usage: ".game2048", example: ".game2048",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const sessions = new Map(); // "chat:sender" -> {grid[16], score, won, moves}
const key = (m) => `${m.chat}:${m.sender}`;

const emptyGrid = () => Array(16).fill(0);
function spawn(grid) {
  const empt = grid.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (!empt.length) return;
  grid[empt[Math.floor(Math.random() * empt.length)]] = Math.random() < 0.9 ? 2 : 4;
}
function newBoard() {
  const g = emptyGrid();
  spawn(g); spawn(g);
  return g;
}

// slide satu baris ke arah kiri: gabung pasangan SEKALI dari kiri
function slideLine(line) {
  const a = line.filter((v) => v);
  const out = [];
  let gained = 0;
  for (let i = 0; i < a.length; i++) {
    if (i + 1 < a.length && a[i] === a[i + 1]) { out.push(a[i] * 2); gained += a[i] * 2; i++; }
    else out.push(a[i]);
  }
  while (out.length < 4) out.push(0);
  return { out, gained };
}

function move(grid, dir) {
  let gained = 0;
  const next = emptyGrid();
  for (let i = 0; i < 4; i++) {
    let line = [];
    for (let j = 0; j < 4; j++) {
      if (dir === "a") line.push(grid[i * 4 + j]);        // baris ke kiri
      else if (dir === "d") line.push(grid[i * 4 + (3 - j)]); // baris dibalik → geser kanan
      else if (dir === "w") line.push(grid[j * 4 + i]);        // kolom ke atas
      else line.push(grid[(3 - j) * 4 + i]);                   // kolom dibalik → geser bawah
    }
    const { out, gained: g } = slideLine(line);
    gained += g;
    for (let j = 0; j < 4; j++) {
      if (dir === "a") next[i * 4 + j] = out[j];
      else if (dir === "d") next[i * 4 + (3 - j)] = out[j];
      else if (dir === "w") next[j * 4 + i] = out[j];
      else next[(3 - j) * 4 + i] = out[j];
    }
  }
  return { next, gained };
}

const canMove = (grid) => ["w", "a", "s", "d"].some((d) => {
  const { next } = move(grid, d);
  return next.some((v, i) => v !== grid[i]);
});

function render(grid, score) {
  const t = (v) => (v ? String(v).padStart(4, " ") : "  · ");
  let s = "";
  for (let r = 0; r < 4; r++) s += t(grid[r * 4]) + t(grid[r * 4 + 1]) + t(grid[r * 4 + 2]) + t(grid[r * 4 + 3]) + "\n";
  return s + "\nSkor: " + score;
}

async function animasiMulai(sock, jid) {
  const frames = [
    "🧊 2048\n\n2️⃣ ➡️ 2️⃣",
    "🧊 2048\n\n     4️⃣",
    "🧊 2048\n\n4️⃣ ➡️ 4️⃣",
    "🧊 2048\n\n     8️⃣ — GAS!",
  ];
  return editFramesAnim(sock, jid, frames, { frameMs: process.env.G2048_ANIM_MS !== undefined ? Number(process.env.G2048_ANIM_MS) : 500 });
}

async function handler(m, { sock, config }) {
  const k = key(m);
  if (sessions.has(k)) {
    if ((m.text || "").trim().toLowerCase() === "stop") {
      sessions.delete(k);
      return m.reply(raraWrap("2048", ["Sesi diakhiri. Skor akhir tersimpan di kartu terakhir~"].join("\n")));
    }
    const s = sessions.get(k);
    return m.reply(raraWrap("2048", ["```" + render(s.grid, s.score) + "```",
      "",
      "Reply: w atas · a kiri · s bawah · d kanan"].join("\n")));
  }
  const s = { grid: newBoard(), score: 0, won: false, moves: 0, timer: null, k };
  const resetT = () => { clearTimeout(s.timer); s.timer = setTimeout(() => sessions.delete(k), 600000); };
  resetT();
  sessions.set(k, s);
  await animasiMulai(sock, m.chat);
  return m.reply(raraWrap("2048", ["PUZZLE 2048 DIMULAI",
    "",
    "```" + render(s.grid, s.score) + "```",
    "",
    "Reply: w atas · a kiri · s bawah · d kanan",
    `Gabung tile sampai 2048 · ${m.prefix}game2048 stop buat keluar`].join("\n")));
}

const DIRS = { w: "atas", a: "kiri", s: "bawah", d: "kanan", u: "atas", l: "kiri", r: "kanan", c: "kanan" };

export async function answerHandler(m, sock) {
  const k = key(m);
  const s = sessions.get(k);
  if (!s || m.isCommand) return false;
  const raw = (m.text || "").trim().toLowerCase();
  const dir = raw === "atas" ? "w" : raw === "bawah" ? "s" : raw === "kiri" ? "a" : raw === "kanan" ? "d" : raw.charAt(0);
  if (!DIRS[dir] || raw.length > 6) return false;
  clearTimeout(s.timer);
  const { next, gained } = move(s.grid, dir);
  const changed = next.some((v, i) => v !== s.grid[i]);
  if (!changed) {
    resetT(s);
    await m.reply(raraWrap("2048", ["Gak ada tile yang bisa bergeser ke " + (DIRS[dir] || dir),
      "",
      "```" + render(s.grid, s.score) + "```"].join("\n")));
    return true;
  }
  s.grid = next; s.score += gained; s.moves++;
  if (gained > 0 || canMove(s.grid)) spawn(s.grid);
  if (s.grid.includes(2048) && !s.won) {
    s.won = true;
    await m.reply(raraWrap("2048", ["🏆 2048 TERCAPAI!",
      "",
      "```" + render(s.grid, s.score) + "```",
      "",
      `Skor: ${s.score} dalam ${s.moves} langkah — boleh lanjut main!`].join("\n")));
    resetT(s);
    return true;
  }
  if (!canMove(s.grid)) {
    const score = s.score, moves = s.moves, grid = s.grid;
    sessions.delete(k);
    await m.reply(raraWrap("2048", ["💀 GAME OVER — gak ada langkah tersisa",
      "",
      "```" + render(grid, score) + "```",
      "",
      `Skor akhir: ${score} · ${moves} langkah`,
      `Main lagi: ${m.prefix}game2048`].join("\n")));
    return true;
  }
  resetT(s);
  await m.reply(raraWrap("2048", [gained > 0 ? `+${gained} poin!` : "",
    "```" + render(s.grid, s.score) + "```"].filter(Boolean).join("\n")));
  return true;
}

function resetT(s) { clearTimeout(s.timer); s.timer = setTimeout(() => sessions.delete(s.k), 600000); }
export { pluginConfig as config, handler };
