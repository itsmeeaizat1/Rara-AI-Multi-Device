// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Wordle — Tebak kata 5 huruf, 6 kesempatan untuk hadiah
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgwordle",
  alias: ["wordlerpg", "tebakkata5", "wordle", "kata5", "katagame"],
  category: "rpg",
  description: "RPG Wordle — Tebak kata 5 huruf dalam 6 kesempatan",
  usage: ".rpgwordle <biaya> — Mulai game\n.rpgwordle <biaya> <kata5> — Tebak kata\n.rpgwordle info — Statistik",
  example: ".rpgwordle 500\n.rpgwordle 500 pohon",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const MIN_COST = 200;
const MAX_COST = 3000;
const MAX_GUESSES = 6;

const WORDS = [
  "pohon", "meja ", "kursi", "tikus", "pisau", "gajah", "bunga", "sinar",
  "ganti", "batin", "citar", "hutan", "lihai", "mulai", "nyala", "padam",
  "rajaw", "sawah", "tanam", "umpan", "wiras", "yukni",
  "boncos", "dolar ", "emojii", "fokus", "gudang", "hakim",
  "ideal", "jemput", "kunci", "lebih", "makan", "napas", "obat", "puisi",
  "quran", "rapat", "sakit", "taat", "ujian", "vapor", "waktu", "yogya",
  "zaman", "ampas", "bahan", "cegah", "duduk", "enak",
].map(w => w.trim().toLowerCase().substring(0, 5)).filter(w => w.length === 5);

// Ensure we have valid 5-letter words
const VALID_WORDS = [
  "pohon", "tikus", "pisau", "gajah", "bunga", "sinar", "hutan", "mulai",
  "nyala", "padam", "sawah", "tanam", "umpan", "fokus", "gudang",
  "hakim", "ideal", "kunci", "lebih", "makan", "napas", "puisi",
  "rapat", "sakit", "ujian", "waktu", "zaman", "ampas", "bahan",
  "cegah", "duduk", "enak", "henti", "jalan", "kapal", "lelah",
  "mainy", "niaga", "olong", "panda", "ramai", "senja", "tamak",
  "ubang", "wujud", "yakin", "banjir".substring(0, 5),
];

const CLEAN_WORDS = [
  "pohon", "tikus", "pisau", "gajah", "bunga", "sinar", "hutan", "mulai",
  "nyala", "padam", "sawah", "tanam", "umpan", "fokus", "hakim", "kunci",
  "lebih", "makan", "napas", "puisi", "rapat", "sakit", "ujian", "waktu",
  "zaman", "ampas", "bahan", "cegah", "duduk", "jalan", "kapal", "lelah",
  "niaga", "panda", "ramai", "senja", "wujud", "yakin", "henti", "baris",
  "celah", "dalam", "earth", "elang", "fikir", "gigit", "hancur".substring(0,5),
  "ideal", "jawab", "kerja", "latin", "mawar", "negri", "omong",
  "pagir", "ramai", "suara", "tegas", "umurn", "voila", "warna",
];

function pickWord() {
  const clean = CLEAN_WORDS.filter(w => w.length === 5);
  return clean[Math.floor(Math.random() * clean.length)];
}

function checkGuess(guess, answer) {
  const result = [];
  const answerChars = answer.split("");
  const guessChars = guess.split("");
  const used = new Array(5).fill(false);

  // First pass: exact matches
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "🟩"; // correct position
      used[i] = true;
    }
  }

  // Second pass: wrong position
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue;
    let found = false;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessChars[i] === answerChars[j]) {
        result[i] = "🟨"; // wrong position
        used[j] = true;
        found = true;
        break;
      }
    }
    if (!found) result[i] = "⬛"; // not in word
  }

  return result;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const player = ensurePlayer(m);
    const cost = parseInt(args[0]) || 0;

    if (cost < MIN_COST) {
      return m.reply(claraWrap("RPG Wordle", [
        "WORDLE RPG",
        "Tebak kata 5 huruf dalam 6 kesempatan!",
        "",
        "Petunjuk:",
        "🟩 = huruf benar di posisi tepat",
        "🟨 = huruf benar, posisi salah",
        "⬛ = huruf tidak ada di kata",
        "",
        "Min: " + MIN_COST + " | Max: " + MAX_COST,
        "",
        "Mulai: " + usedPrefix + "rpgwordle <biaya>",
        "Tebak: " + usedPrefix + "rpgwordle <biaya> <kata5>",
      ], "info"));
    }

    if (cost > MAX_COST) {
      return m.reply(claraWrap("RPG Wordle", "Max: " + MAX_COST, "warn"));
    }

    const guess = args[1]?.toLowerCase();
    const session = player.wordleGame;

    // Start new game
    if (!guess) {
      if ((player.gold || 0) < cost) {
        return m.reply(claraWrap("RPG Wordle", "Gold kurang!", "warn"));
      }

      addGold(m, -cost);
      const answer = pickWord();
      player.wordleGame = {
        answer,
        guesses: [],
        cost,
        startTime: Date.now(),
      };
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Wordle", [
        "GAME DIMULAI!",
        "Biaya: " + cost + " gold",
        "Kesempatan: " + MAX_GUESSES,
        "",
        "Tebak kata 5 huruf:",
        usedPrefix + "rpgwordle " + cost + " <kata>",
      ], "info"));
    }

    if (!session) {
      return m.reply(claraWrap("RPG Wordle", "Tidak ada game aktif. Mulai: " + usedPrefix + "rpgwordle " + cost, "warn"));
    }

    if (Date.now() - session.startTime > 300000) {
      delete player.wordleGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Wordle", "Game expired (5 min). Jawaban: " + session.answer, "warn"));
    }

    if (guess.length !== 5) {
      return m.reply(claraWrap("RPG Wordle", "Kata harus 5 huruf!", "warn"));
    }

    if (session.guesses.length >= MAX_GUESSES) {
      delete player.wordleGame;
      savePlayer(m, player);
      return m.reply(claraWrap("RPG Wordle", "Kesempatan habis! Jawaban: " + session.answer, "warn"));
    }

    // Check guess
    const result = checkGuess(guess, session.answer);
    session.guesses.push({ guess, result });

    const lines = ["WORDLE RPG", ""];

    // Show all guesses
    session.guesses.forEach((g, i) => {
      lines.push((i + 1) + ". " + g.guess.toUpperCase() + " " + g.result.join(""));
    });

    const isWin = guess === session.answer;

    if (isWin) {
      const guessesUsed = session.guesses.length;
      const multiplier = MAX_GUESSES - guessesUsed + 1; // fewer guesses = bigger reward
      const winnings = cost * multiplier;
      addGold(m, winnings);
      addExp(m, cost);
      delete player.wordleGame;
      savePlayer(m, player);

      lines.push("");
      lines.push("MENANG dalam " + guessesUsed + " tebakan!");
      lines.push("Multiplier: " + multiplier + "x");
      lines.push("Gold: +" + winnings);
      lines.push("Exp: +" + cost);
      return m.reply(claraWrap("RPG Wordle", lines, "info"));
    }

    if (session.guesses.length >= MAX_GUESSES) {
      delete player.wordleGame;
      addExp(m, Math.round(cost * 0.3));
      savePlayer(m, player);
      lines.push("");
      lines.push("KALAH! Jawaban: " + session.answer.toUpperCase());
      lines.push("Consolation exp: +" + Math.round(cost * 0.3));
      return m.reply(claraWrap("RPG Wordle", lines, "warn"));
    }

    savePlayer(m, player);
    lines.push("");
    lines.push("Sisa: " + (MAX_GUESSES - session.guesses.length) + " tebakan");
    lines.push("Tebak: " + usedPrefix + "rpgwordle " + cost + " <kata>");
    return m.reply(claraWrap("RPG Wordle", lines, "info"));
  } catch (e) {
    console.error("[RpgWordle]", e);
    return m.reply(claraWrap("RPG Wordle", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
