// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .slidingpuzzle — puzzle geser angka 15/8 (port altftool.com "Sliding Puzzle")
// Reply w/a/s/d = tile dari arah itu digeser ke lubang. ANIMASI KHAS: tile angka meluncur ke slot kosong.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { editFramesAnim } from "../../src/lib/rara-anim-runner.js";

const pluginConfig = {
  name: "slidingpuzzle", alias: ["15puzzle", "puzzleangka"], category: "game",
  description: "Puzzle geser angka — urutkan 1..15",
  usage: ".slidingpuzzle [3/4]", example: ".slidingpuzzle 3",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const sessions = new Map(); // "chat:sender" -> {n, tiles[], blank, moves, timer, k}
const key = (m) => `${m.chat}:${m.sender}`;

const solved = (n) => Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1));
const isSolved = (tiles) => {
  const n = Math.sqrt(tiles.length);
  const sol = solved(n);
  return tiles.every((v, i) => v === sol[i]);
};

// shuffle solvable: dari kondisi SOLVED, lakukan gerakan legal acak (dijamin bisa diselesaikan)
function shuffle(n) {
  const t = solved(n);
  let blank = t.indexOf(0);
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (let i = 0; i < (n === 3 ? 120 : 200); i++) {
    const br = Math.floor(blank / n), bc = blank % n;
    const [dr, dc] = DIRS[Math.floor(Math.random() * 4)];
    const nr = br + dr, nc = bc + dc;
    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
    const ni = nr * n + nc;
    t[blank] = t[ni]; t[ni] = 0; blank = ni;
  }
  return { tiles: t, blank };
}

function render(tiles) {
  const n = Math.sqrt(tiles.length);
  let s = "";
  for (let r = 0; r < n; r++) {
    s += tiles.slice(r * n, r * n + n).map((v) => (v === 0 ? "◻️ " : String(v).padStart(2, " ") + " ")).join("") + "\n";
  }
  return s;
}

async function animasiMulai(sock, jid, n) {
  const frames = [
    `🧩 SLIDING PUZZLE ${n}×${n}\n\n 5  ◀️  geser ke slot kosong`,
    `🧩 SLIDING PUZZLE ${n}×${n}\n\n     5  ◀️  nyaris masuk…`,
    `🧩 SLIDING PUZZLE ${n}×${n}\n\n  ✅  urutkan 1 sampai ${n * n - 1}!`,
  ];
  return editFramesAnim(sock, jid, frames, { frameMs: process.env.SLIDE_ANIM_MS !== undefined ? Number(process.env.SLIDE_ANIM_MS) : 500 });
}

async function handler(m, { sock, config }) {
  const k = key(m);
  if (sessions.has(k)) {
    if ((m.text || "").trim().toLowerCase() === "stop") {
      sessions.delete(k);
      return m.reply(raraWrap("Sliding Puzzle", ["Sesi diakhiri."].join("\n")));
    }
    const s = sessions.get(k);
    return m.reply(raraWrap("Sliding Puzzle", ["MASIH ADA SESI AKTIF — " + s.moves + " langkah",
      "",
      "```" + render(s.tiles) + "```",
      "",
      "Reply w/a/s/d buat geser tile · stop buat keluar"].join("\n")));
  }
  const n = (m.text || "").trim() === "3" ? 3 : 4;
  const { tiles, blank } = shuffle(n);
  const s = { n, tiles, blank, moves: 0, k, timer: null };
  resetT(s);
  sessions.set(k, s);
  await animasiMulai(sock, m.chat, n);
  return m.reply(raraWrap("Sliding Puzzle", [`PUZZLE ${n}×${n} — URUTKAN 1 SAMPAI ${n * n - 1}`,
    "",
    "```" + render(tiles) + "```",
    "",
    "Reply w/a/s/d — tile dari arah itu meluncur ke slot kosong",
    `Contoh: ketik w = tile di atas lubang turun · ${m.prefix}slidingpuzzle stop buat keluar`].join("\n")));
}

function resetT(s) { clearTimeout(s.timer); s.timer = setTimeout(() => sessions.delete(s.k), 600000); }

const LETTER = { w: "atas", a: "kiri", s: "bawah", d: "kanan" };
const DIRV = { w: [-1, 0], a: [0, -1], s: [1, 0], d: [0, 1] };

export async function answerHandler(m, sock) {
  const k = key(m);
  const s = sessions.get(k);
  if (!s || m.isCommand) return false;
  const raw = (m.text || "").trim().toLowerCase();
  if (!/^[wasd]$/.test(raw)) return false;
  clearTimeout(s.timer);
  const n = s.n;
  const br = Math.floor(s.blank / n), bc = s.blank % n;
  const [dr, dc] = DIRV[raw];
  const nr = br - dr, nc = bc - dc; // tile dari aras raw → berpindah ke lubang
  if (nr < 0 || nr >= n || nc < 0 || nc >= n) {
    resetT(s);
    await m.reply(raraWrap("Sliding Puzzle", ["Gak ada tile di " + LETTER[raw] + " lubang",
      "",
      "```" + render(s.tiles) + "```"].join("\n")));
    return true;
  }
  const ni = nr * n + nc;
  s.tiles[s.blank] = s.tiles[ni]; s.tiles[ni] = 0; s.blank = ni; s.moves++;
  if (isSolved(s.tiles)) {
    const moves = s.moves, nn = s.n;
    sessions.delete(k);
    await m.reply(raraWrap("Sliding Puzzle", ["🎉 BERHASIL! PAPAAN TERURUT",
      "",
      "```" + render(solved(nn)) + "```",
      "",
      `Selesai dalam ${moves} langkah${moves <= (nn === 3 ? 40 : 120) ? " — mantap! 🔥" : ""}`,
      `Main lagi: ${m.prefix}slidingpuzzle ${nn}`].join("\n")));
    return true;
  }
  resetT(s);
  await m.reply(raraWrap("Sliding Puzzle", [`${s.moves} langkah`,
    "",
    "```" + render(s.tiles) + "```",
    "",
    "Reply w/a/s/d · 🧩 target: urut 1.." + (s.n * s.n - 1)].join("\n")));
  return true;
}

export { pluginConfig as config, handler };
