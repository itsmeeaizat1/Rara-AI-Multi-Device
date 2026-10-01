// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "wordle",
  alias: ["wordle"],
  category: "smart",
  description: "Wordle harian - tebak kata 5 huruf, 6 kesempatan",
  usage: ".wordle <command>",
  example: ".wordle",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const WORDS = [
  "kasih", "makan", "minum", "tidur", "jalan", "kunci", "batas", "hatim", "hatim",
  "pohon", "meja", "kursi", "rotan", "gelas", "pisau", "garpu", "sendok", "topi",
  "sabun", "handuk", "tikar", "lampu", "pintu", "jendela", "atap", "dindin",
  "kaget", "senang", "sedih", "marah", "takut", "malu", "bangga", "benci",
  "cerdas", "bodoh", "rajin", "malas", "kaya", "miskin", "kuat", "lemah",
  "cepat", "lambat", "tinggi", "rendah", "besar", "kecil", "panjang", "pendek",
  "putih", "hitam", "merah", "biru", "hijau", "kuning", "ungu", "pink",
  "banjir", "gempa", "gunung", "lautan", "sungai", "hutan", "padang", "gurun",
  "langit", "awan", "hujan", "badai", "petir", "pelangi", "mataha", "bintan",
  "kucing", "anjing", "kelinci", "burung", "ikan", "kuda", "sapi", "kambing",
  "manis", "asin", "pahit", "pedas", "asam", "guri", "hambar", "enak",
  "sepatu", "baju", "celana", "jas", "dasi", "sabuk", "kaos", "gamis",
  "bukuu", "pulpen", "pensil", "pengas", "kertas", "map", "staple", "klip",
  "dokter", "perawat", "guru", "polisi", "satpam", "pilot", "nelayan", "tukang",
  "cinta", "sayang", "kasih", "rindu", "kangen", "suka", "benci", "jijik",
  "mimpi", "cita", "harap", "doa", "usaha", "kerja", "lelah", "cape",
  "waktu", "jam", "menit", "detik", "hari", "minggu", "bulan", "tahun",
  "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "mingu", "libur",
  "januar", "februa", "maret", "april", "mei", "juni", "juli", "agust",
  "banjir", "kemarau", "lombok", "sumatr", "jawa", "sulawe", "kalima", "papua",
];

// Filter to only valid 5-letter words
const VALID_WORDS = [...new Set(WORDS.filter(w => w.length === 5))];

const MAX_ATTEMPTS = 6;

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function getDailyWord() {
  const today = todayDate();
  const seed = today.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return VALID_WORDS[seed % VALID_WORDS.length];
}

function getConfig(db, gid) {
  const all = db.setting("wordle") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("wordle") || {};
  all[gid] = data;
  db.setting("wordle", all);
  db.save();
}

function evaluateGuess(guess, answer) {
  const result = [];
  const answerArr = answer.split("");
  const guessArr = guess.split("");
  const used = new Array(5).fill(false);

  // First pass: correct position
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = { letter: guessArr[i], status: "correct" };
      used[i] = true;
    }
  }
  // Second pass: wrong position or absent
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue;
    let found = false;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === answerArr[j]) {
        result[i] = { letter: guessArr[i], status: "present" };
        used[j] = true;
        found = true;
        break;
      }
    }
    if (!found) {
      result[i] = { letter: guessArr[i], status: "absent" };
    }
  }
  return result;
}

function formatGuess(result) {
  return result.map(r => {
    if (r.status === "correct") return "[" + r.letter.toUpperCase() + "]";
    if (r.status === "present") return "(" + r.letter.toLowerCase() + ")";
    return " " + r.letter.toLowerCase() + " ";
  }).join(" ");
}

function formatLegend() {
  return "[A] = benar posisi | (a) = ada tapi salah posisi |  a  = tidak ada";
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const today = todayDate();
  const cfg = getConfig(db, gid);

  // Reset daily
  if (cfg.dailyDate !== today) {
    cfg.dailyDate = today;
    cfg.users = {};
  }

  if (!cfg.users[m.sender]) {
    cfg.users[m.sender] = {
      attempts: [],
      solved: false,
      failed: false,
      streak: cfg.users[m.sender]?.streak || 0,
      lastPlayed: cfg.users[m.sender]?.lastPlayed || "",
    };
  }
  const udata = cfg.users[m.sender];

  const dailyWord = getDailyWord();

  if (sub === "play" || sub === "tebak" || !sub) {
    const guess = (args[2] || "").toLowerCase().trim();

    if (udata.solved) {
      await m.reply(raraWrap("Wordle", "Kamu sudah menang hari ini! Jawaban: " + dailyWord + "\nStreak: " + udata.streak + "\nMain lagi besok!"));
      return { handled: true };
    }
    if (udata.failed) {
      await m.reply(raraWrap("Wordle", "Kamu sudah kalah hari ini. Jawaban: " + dailyWord + "\nMain lagi besok!"));
      return { handled: true };
    }
    if (!guess) {
      const board = udata.attempts.length === 0 ? "(belum ada tebakan)" : udata.attempts.map((a, i) => (i + 1) + ". " + formatGuess(a.result)).join("\n");
      await m.reply(raraWrap("Wordle " + today, [
        "Tebak kata 5 huruf! (" + udata.attempts.length + "/" + MAX_ATTEMPTS + ")",
        "",
        board,
        "",
        "Ketik: " + prefix + "wordle <kata5huruf>",
        formatLegend(),
      ].join("\n")));
      return { handled: true };
    }

    if (guess.length !== 5) {
      await m.reply(raraWrap("Wordle", "Kata harus 5 huruf!"));
      return { handled: true };
    }

    if (!/^[a-z]+$/.test(guess)) {
      await m.reply(raraWrap("Wordle", "Hanya huruf a-z!"));
      return { handled: true };
    }

    const result = evaluateGuess(guess, dailyWord);
    udata.attempts.push({ guess, result });
    saveConfig(db, gid, cfg);

    const won = result.every(r => r.status === "correct");
    const board = udata.attempts.map((a, i) => (i + 1) + ". " + formatGuess(a.result)).join("\n");

    if (won) {
      udata.solved = true;
      udata.streak = (udata.lastPlayed === yesterday() ? udata.streak + 1 : 1);
      udata.lastPlayed = today;
      const attemptsUsed = udata.attempts.length;
      const score = (MAX_ATTEMPTS - attemptsUsed + 1) * 10;
      saveConfig(db, gid, cfg);
      await m.reply(raraWrap("Wordle - MENANG!", [
        "@" + m.sender.split("@")[0],
        "",
        board,
        "",
        "Jawaban: " + dailyWord,
        "Tebakan: " + attemptsUsed + "/" + MAX_ATTEMPTS,
        "Score: +" + score,
        "Streak: " + udata.streak + " hari",
      ].join("\n")), { mentions: [m.sender] });
    } else if (udata.attempts.length >= MAX_ATTEMPTS) {
      udata.failed = true;
      udata.streak = 0;
      udata.lastPlayed = today;
      saveConfig(db, gid, cfg);
      await m.reply(raraWrap("Wordle - KALAH", [
        "@" + m.sender.split("@")[0],
        "",
        board,
        "",
        "Jawabannya: " + dailyWord,
        "Streak: reset ke 0",
        "Coba lagi besok!",
      ].join("\n")), { mentions: [m.sender] });
    } else {
      await m.reply(raraWrap("Wordle " + today, [
        "@" + m.sender.split("@")[0] + " (" + udata.attempts.length + "/" + MAX_ATTEMPTS + ")",
        "",
        board,
        "",
        formatLegend(),
        "",
        "Tebak lagi: " + prefix + "wordle <kata5huruf>",
      ].join("\n")), { mentions: [m.sender] });
    }
    return { handled: true };
  }

  if (sub === "streak" || sub === "streak") {
    await m.reply(raraWrap("Wordle Streak", [
      "@" + m.sender.split("@")[0],
      "Streak: " + (udata.streak || 0) + " hari",
      "Last played: " + (udata.lastPlayed || "belum"),
      "Solved hari ini: " + (udata.solved ? "YA" : "BELUM"),
    ].join("\n")), { mentions: [m.sender] });
    return { handled: true };
  }

  if (sub === "leaderboard" || sub === "top") {
    const sorted = Object.entries(cfg.users)
      .filter(([_, u]) => u.solved)
      .sort((a, b) => b[1].streak - a[1].streak)
      .slice(0, 10);
    if (sorted.length === 0) {
      await m.reply(raraWrap("Wordle", "Belum ada pemenang hari ini."));
      return { handled: true };
    }
    const list = sorted.map(([jid, u], i) => (i + 1) + ". @" + jid.split("@")[0] + " - Streak: " + u.streak + " (" + u.attempts.length + " tebakan)").join("\n");
    await m.reply(raraWrap("Wordle Leaderboard " + today, "Pemenang hari ini:\n" + list), { mentions: sorted.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "hint" || sub === "petunjuk") {
    if (udata.solved || udata.failed) {
      await m.reply(raraWrap("Wordle", "Game sudah selesai hari ini."));
      return { handled: true };
    }
    const pos = Math.floor(Math.random() * 5);
    await m.reply(raraWrap("Wordle Hint", "Huruf posisi " + (pos + 1) + " adalah: " + dailyWord[pos].toUpperCase()));
    return { handled: true };
  }

  await m.reply(raraWrap("Wordle", [
    "WORDLE HARIAN",
    "",
    prefix + "wordle <kata5huruf> - tebak kata",
    prefix + "wordle streak - lihat streak kamu",
    prefix + "wordle leaderboard - top pemenang hari ini",
    prefix + "wordle hint - 1 petunjuk huruf",
    "",
    "1 kata per hari, semua tebak kata yang sama!",
    "[A] = benar | (a) = ada salah posisi | a = tidak ada",
  ].join("\n")));
  return { handled: true };
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

export { pluginConfig as config, handler };
