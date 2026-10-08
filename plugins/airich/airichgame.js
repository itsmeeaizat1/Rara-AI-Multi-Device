// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI RICH GAMES — koleksi game HTML di dalam chat (request owner
//   7 Okt 2026: "tambahin banyak game di airich, .plane aja nggak
//   cukup"). Semua game self-contained di assets/airich/games/
//   (canvas + kontrol tap, gak ada dependensi remote) dan dikirim
//   lewat engine richResponseMessage yang sama dengan .plane.
// 🔹 Akses:
//   .airichgame <nama>   → buka game (mis. .airichgame snake)
//   .airichgame          → daftar semua game
//   alias langsung       → .snake .flappy .tetris .2048 .suisut
// 🔹 Game file = assets/airich/games/<key>.html — LOCAL ONLY
//   (pelajaran .plane: remote repo orang bisa dicabut kapan aja).
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { sendRichResponse, notifyRichDownload } from "../../src/lib/rara-airich.js";

const pluginConfig = {
  name: "airichgame",
  alias: ["gameairich", "gameai", "ular", "flappy", "flappybird", "blok", "blokjatuh", "gabung", "suisut", "tictactoe", "snakegame", "2048game", "dino", "dinorun", "pong", "pongai", "tikus", "pukultikus", "memori", "memory", "sudoku", "susunangka", "simon", "simonsays", "warna", "ranjau", "caribom", "geser", "puzzlegeser", "15", "empatbaris", "connectfour", "c4", "bata", "pecahbata", "breakout"],
  category: "airich",
  description: "AI Rich Games 🎮 — koleksi game HTML langsung di chat (snake, flappy, tetris, 2048, sui sut, dino, pong, pukul tikus, kartu memori, sudoku, simon, cari ranjau, puzzle geser, empat baris, pecah bata)",
  usage: ".airichgame <nama game> — daftar game: .airichgame",
  example: ".airichgame snake",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 10, energi: 2, isEnabled: true,
};

// ── registry game ──
const GAMES = {
  snake: {
    title: "Ular Kelas 🐍",
    tip: "Tap tombol arah — makan apel merah, jangan tabrak dinding/badan sendiri",
    alias: ["ular", "snakegame"],
  },
  flappy: {
    title: "Rara Terbang 🐤",
    tip: "Tap buat terbang — lewati celah pipa hijau, jangan jatuh",
    alias: ["flappy", "flappybird"],
  },
  tetris: {
    title: "Blok Jatuh 🧱",
    tip: "Tap ◀ ▶ geser, ⟳ muter balok, ⬇ turun cepat — susun rapi!",
    alias: ["blok", "blokjatuh"],
  },
  "2048": {
    title: "Gabung 2048 🔢",
    tip: "Tap arah — gabungkan tile angka sama sampai 2048",
    alias: ["gabung"],
  },
  tictactoe: {
    title: "Sui Sut Bot ⭕",
    tip: "Tap kotak — kamu ❌ lawan bot ⭕, pemenang 3 garis lurus",
    alias: ["suisut", "tictactoe"],
  },
  dino: {
    title: "Dino Run 🦖",
    tip: "Tap buat lompat — hindari kaktus, makin lama makin ngebut",
    alias: ["dino", "dinorun"],
  },
  pong: {
    title: "Pong AI 🏓",
    tip: "Geser jari di layar buat gerakkan paddle — kalahkan bot sampai 7 poin",
    alias: ["pong", "pongai"],
  },
  whackamole: {
    title: "Pukul Tikus 🔨",
    tip: "Pukul 🐹 yang muncul selama 30 detik — jangan sampai lolos",
    alias: ["tikus", "pukultikus"],
  },
  memory: {
    title: "Kartu Memori 🧠",
    tip: "Buka 2 kartu — pasangkan semua emoji yang sama",
    alias: ["memori", "memory"],
  },
  sudoku: {
    title: "Sudoku Harian \ud83d\udd22",
    tip: "Tap sel lalu angka 1-9 — isi baris, kolom & blok 3x3 tanpa angka dobel",
    alias: ["sudoku", "susunangka"],
  },
  simon: {
    title: "Simon Says \ud83c\udfb5",
    tip: "Ingat urutan warna yang menyala lalu ulangi — tiap level makin panjang & cepat",
    alias: ["simon", "simonsays", "warna"],
  },
  minesweeper: {
    title: "Cari Ranjau \ud83d\udca3",
    tip: "Tap buka sel — angka = jumlah bom di sekitar. Mode bendera buat tandai",
    alias: ["ranjau", "caribom"],
  },
  slidingpuzzle: {
    title: "Puzzle Geser \u25b2",
    tip: "Tile geser ke kotak kosong — urutkan 1-15 dengan langkah sesedikit mungkin",
    alias: ["geser", "puzzlegeser", "15"],
  },
  fourinarow: {
    title: "Empat Baris \ud83d\udd34",
    tip: "Tap kolom — susun 4 disc sebaris sebelum AI",
    alias: ["empatbaris", "connectfour", "c4"],
  },
  brickbreaker: {
    title: "Pecah Bata \ud83e\uddf1",
    tip: "Geser paddle — mantulkan bola, hancurkan semua bata 3 level",
    alias: ["bata", "pecahbata", "breakout"],
  },
};

const ALIAS2GAME = {};
for (const [key, g] of Object.entries(GAMES)) {
  ALIAS2GAME[key] = key;
  for (const a of g.alias) ALIAS2GAME[a] = key;
}

const GAMES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "assets", "airich", "games");

// ── seams http buat e2e offline ──
const __gameSeams = { send: null, notify: null };
export function _setAirichGameForTest(s) { Object.assign(__gameSeams, s); }
export function _resetAirichGameForTest() { __gameSeams.send = null; __gameSeams.notify = null; }

export function listGames() {
  return Object.keys(GAMES);
}

export function fetchGameHtml(key) {
  if (!GAMES[key]) throw new Error(`game "${key}" gak ada — daftar: ${Object.keys(GAMES).join(", ")}`);
  const file = path.join(GAMES_DIR, `${key}.html`);
  const html = fs.readFileSync(file, "utf-8");
  if (!html || html.length < 500 || !/<[a-z]/i.test(html)) {
    throw new Error(`file game "${key}" rusak/kosong`);
  }
  return html;
}

function resolveGame(m) {
  const arg = String(m.args?.[0] || "").toLowerCase().trim();
  if (arg && (GAMES[arg] || ALIAS2GAME[arg])) return GAMES[arg] ? arg : ALIAS2GAME[arg];
  const cmd = String(m.command || "").toLowerCase().trim();
  if (GAMES[cmd] || ALIAS2GAME[cmd]) return GAMES[cmd] ? cmd : ALIAS2GAME[cmd];
  return null;
}

// emoji per game — fallback 🎮
const GAME_EMOJI = {"snake": "🐍", "flappy": "🐤", "tetris": "🧱", "2048": "🔢", "tictactoe": "⭕", "dino": "🦖", "pong": "🏓", "whackamole": "🔨", "memory": "🧠", "sudoku": "🔢", "simon": "🎵", "minesweeper": "💣", "slidingpuzzle": "🔲", "fourinarow": "🔴", "brickbreaker": "🧱"};

function menuCard() {
  const lines = [
    "🎮 *AI Rich Games — game HTML di dalam chat*",
    "",
    "Kartu game beneran (bisa dimainin langsung),",
    "bukan gambar/gIF.",
    "",
  ];
  for (const [key, g] of Object.entries(GAMES)) {
    lines.push(`${GAME_EMOJI[key] || "🎮"} .airichgame ${key} — ${g.title}`);
  }
  lines.push("");
  lines.push("_Alias singkat juga bisa: .ular .flappy .blok .gabung .suisut .dino .pong .tikus .memori .sudoku .simon .ranjau .geser .empatbaris .bata_");
  lines.push("_Klik tombol *Unduh* di kartu untuk membuka gamenya._");
  return raraWrap("airichgame", lines.join("\n"), "guide");
}

async function handler(m, { sock }) {
  try {
    const key = resolveGame(m);
    if (!key) {
      // arg ada tapi nyasar → error jelas; polos → daftar menu
      const arg = String(m.args?.[0] || "").toLowerCase().trim();
      if (arg) {
        return m.reply(raraWrap("airichgame", [
          `❗ Game *${arg}* gak ada.`,
          "",
          `Game yang tersedia: ${Object.keys(GAMES).join(", ")}`,
          "",
          "_Contoh: .airichgame snake — atau ketik .airichgame buat daftar._",
        ].join("\n"), "error"));
      }
      return m.reply(menuCard());
    }

    await m.react("🧠");
    const html = fetchGameHtml(key);
    await m.react("🛠️");

    const game = GAMES[key];
    const notify = __gameSeams.notify || notifyRichDownload;
    const send = __gameSeams.send || sendRichResponse;
    await notify(m);
    await send(sock, m.chat, html, { title: `${game.title}\n*${game.tip}*` });

    await m.react("🐣");
  } catch (err) {
    console.error("airichgame error:", err);
    await m.react("❌");
    return m.reply(raraWrap("airichgame", "gagal memuat game: " + (err?.message || "error"), "error"));
  }
}

export default { pluginConfig, handler, command: "airichgame" };
export { pluginConfig as config, handler };
