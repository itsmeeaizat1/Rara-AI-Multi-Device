// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// wordle.js — Wordle game (tebak kata 5 huruf, 6 kesempatan)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "wordle",
  alias: ["wordle"],
  category: "game",
  description: "Game Wordle — tebak kata 5 huruf dalam 6 percobaan",
  usage: ".wordle [start/new/hint]",
  example: ".wordle\n.wordle start\n.wordle hint",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

// Indonesian 5-letter words (common)
const WORDS_ID = [
  "BUNDA", "DUNIA", "CINTA", "BAJAK", "BANJIR", "BARAT", "BASAH", "BUKAN",
  "BUKTI", "BULAN", "BUNCI", "CURGA", "DAGING", "DALAM", "DASAR", "DAUN",
  "DINGIN", "DIPAN", "DOSA", "DUKUN", "DURI", "EKOR", "FAJAR", "GAGAL",
  "GAMBAR", "GANJA", "GARIS", "GELAP", "GUNUN", "HALUS", "HARUM", "HATI",
  "HIDUP", "HITAM", "JAHIT", "JAHAT", "JALAN", "JAMIN", "JANGAN", "JATUH",
  "JENIS", "JUARA", "KACAU", "KAJIAN", "KAKUS", "KAMAR", "KANAN", "KAPAN",
  "KASIH", "KAWAL", "KAYU", "KEBUN", "KECIL", "KEJAM", "KELAM", "KELAP",
  "KEMBALI", "KENAL", "KEPIT", "KERTAS", "KETIK", "KOBAR", "KOTA", "KUDA",
  "KURSI", "LAMPU", "LANGIT", "LARI", "LEBAR", "LEMAH", "LENGAN", "LIDAH",
  "LIHAT", "LIMA", "LIMA", "LOMBA", "LUAS", "LUCU", "MAJU", "MALAR",
  "MANIS", "MATA", "MATI", "MAKAN", "MAKAN", "MEJA", "MERAH", "MERAH",
  "MEREK", "MUDAH", "MUKA", "MUSIM", "NANTI", "NASI", "NGAK", "NYALA",
  "OBAT", "PAGI", "PAKAI", "PANDA", "PARUT", "PAYUNG", "PINTU", "PIPA",
  "PISAU", "POHON", "POJOK", "PUNCA", "PUTIH", "RACUN", "RAJIN", "RAKIT",
  "RASA", "RATA", "RUMUS", "RIBUT", "SABUN", "SAKIT", "SALAM", "SAMA",
  "SAPI", "SEHAT", "SEKAR", "SELAM", "SELAT", "SEMUA", "SENI", "SEPAT",
  "SINI", "SITUS", "SOAL", "SUSAH", "TAJAM", "TANDA", "TANGAN", "TAPI",
  "TARIK", "TEBAL", "TEGAS", "TEKUN", "TEMA", "TENGAH", "TIDAK", "TIDUR",
  "TIGA", "TIKET", "TIPIS", "TIRTA", "TOPI", "TULIS", "TUNGGU", "TUNTAS",
  "UNTUK", "WAJAH", "WAKTU", "WANITA", "WARNA", "WIRA", "YURAN",
];

// English 5-letter words (common)
const WORDS_EN = [
  "ABOUT", "ABOVE", "ABUSE", "ACTOR", "ADAPT", "ADMIT", "ADOPT", "ADULT",
  "AFTER", "AGAIN", "AGENT", "AGREE", "AHEAD", "ALARM", "ALBUM", "ALERT",
  "ALIEN", "ALIGN", "ALIVE", "ALLOW", "ALONE", "ALONG", "ALPHA", "ALTER",
  "AMONG", "ANGER", "ANGLE", "ANGRY", "APPLE", "APPLY", "ARENA", "ARGUE",
  "ARISE", "ARRAY", "ASIDE", "ASSET", "AVOID", "AWAKE", "AWARD", "AWARE",
  "BADLY", "BAKER", "BASES", "BASIC", "BASIS", "BEACH", "BEGAN", "BEGIN",
  "BEGUN", "BEING", "BELOW", "BENCH", "BIBLE", "BIRTH", "BLACK", "BLAME",
  "BLIND", "BLOCK", "BLOOD", "BOARD", "BOOST", "BOOTH", "BOUND", "BRAIN",
  "BRAND", "BREAD", "BREAK", "BREED", "BRIEF", "BRING", "BROAD", "BROKE",
  "BROWN", "BUILD", "BUILT", "BUYER", "CABLE", "CALIF", "CARRY", "CATCH",
  "CAUSE", "CHAIN", "CHAIR", "CHART", "CHASE", "CHEAP", "CHECK", "CHEST",
  "CHIEF", "CHILD", "CHINA", "CHOSE", "CIVIL", "CLAIM", "CLASS", "CLEAN",
  "CLEAR", "CLICK", "CLOCK", "CLOSE", "COACH", "COAST", "COULD", "COUNT",
  "COURT", "COVER", "CRAFT", "CRASH", "CREAM", "CRIME", "CROSS", "CROWD",
  "CROWN", "CURVE", "CYCLE", "DAILY", "DANCE", "DATED", "DEALT", "DEATH",
  "DEBUT", "DELAY", "DEPTH", "DOING", "DOUBT", "DOZEN", "DRAFT", "DRAMA",
  "DRAWN", "DREAM", "DRESS", "DRILL", "DRINK", "DRIVE", "DROVE", "DYING",
  "EAGER", "EARLY", "EARTH", "EIGHT", "ELITE", "EMPTY", "ENEMY", "ENJOY",
  "ENTER", "ENTRY", "EQUAL", "ERROR", "EVENT", "EVERY", "EXACT", "EXIST",
  "EXTRA", "FAITH", "FALSE", "FAULT", "FIBER", "FIELD", "FIFTH", "FIFTY",
  "FIGHT", "FINAL", "FIRST", "FIXED", "FLASH", "FLEET", "FLOOR", "FLUID",
  "FOCUS", "FORCE", "FORTH", "FORTY", "FORUM", "FOUND", "FRAME", "FRANK",
  "FRAUD", "FRESH", "FRONT", "FRUIT", "FULLY", "FUNNY", "GHOST", "GIANT",
  "GIVEN", "GLASS", "GLOBE", "GOING", "GRACE", "GRADE", "GRAND", "GRANT",
  "GRASS", "GREAT", "GREEN", "GROSS", "GROUP", "GROWN", "GUARD", "GUESS",
  "GUEST", "GUIDE", "HAPPY", "HARRY", "HEART", "HEAVY", "HENCE", "HENRY",
  "HORSE", "HOTEL", "HOUSE", "HUMAN", "IDEAL", "IMAGE", "INDEX", "INNER",
  "INPUT", "ISSUE", "JAPAN", "JIMMY", "JOINT", "JONES", "JUDGE", "KNOWN",
  "LABEL", "LARGE", "LASER", "LATER", "LAUGH", "LAYER", "LEARN", "LEASE",
  "LEAST", "LEAVE", "LEGAL", "LEVEL", "LEWIS", "LIGHT", "LIMIT", "LINKS",
  "LIVES", "LOCAL", "LOGIC", "LOOSE", "LOWER", "LUCKY", "LUNCH", "LYING",
  "MAGIC", "MAJOR", "MAKER", "MARCH", "MARIA", "MATCH", "MAYBE", "MAYOR",
  "MEANT", "MEDIA", "METAL", "MIGHT", "MINOR", "MINUS", "MIXED", "MODEL",
  "MONEY", "MONTH", "MORAL", "MOTOR", "MOUNT", "MOUSE", "MOUTH", "MOVIE",
  "MUSIC", "NEEDS", "NEVER", "NEWLY", "NIGHT", "NOISE", "NORTH", "NOTED",
  "NOVEL", "NURSE", "OCEAN", "OFFER", "OFTEN", "ORDER", "OTHER", "OUGHT",
  "PAINT", "PANEL", "PAPER", "PARTY", "PEACE", "PETER", "PHASE", "PHONE",
  "PHOTO", "PIECE", "PILOT", "PITCH", "PLACE", "PLAIN", "PLANE", "PLANT",
  "PLATE", "POINT", "POUND", "POWER", "PRESS", "PRICE", "PRIDE", "PRIME",
  "PRINT", "PRIOR", "PRIZE", "PROOF", "PROUD", "PROVE", "QUEEN", "QUICK",
  "QUIET", "QUITE", "RADIO", "RAISE", "RANGE", "RAPID", "RATIO", "REACH",
  "READY", "REFER", "RIGHT", "RIVAL", "RIVER", "ROBIN", "ROGER", "ROMAN",
  "ROUGH", "ROUND", "ROUTE", "ROYAL", "RURAL", "SCALE", "SCENE", "SCOPE",
  "SCORE", "SENSE", "SERVE", "SEVEN", "SHALL", "SHAPE", "SHARE", "SHARP",
  "SHEET", "SHELF", "SHELL", "SHIFT", "SHIRT", "SHOCK", "SHOOT", "SHORT",
  "SHOWN", "SIGHT", "SINCE", "SIXTH", "SIXTY", "SIZED", "SKILL", "SLEEP",
  "SLIDE", "SMALL", "SMART", "SMILE", "SMITH", "SMOKE", "SOLID", "SOLVE",
  "SORRY", "SOUND", "SOUTH", "SPACE", "SPARE", "SPEAK", "SPEED", "SPEND",
  "SPENT", "SPLIT", "SPOKE", "SPORT", "STAFF", "STAGE", "STAKE", "STAND",
  "START", "STATE", "STEAM", "STEEL", "STICK", "STILL", "STOCK", "STONE",
  "STOOD", "STORE", "STORM", "STORY", "STRIP", "STUCK", "STUDY", "STUFF",
  "STYLE", "SUGAR", "SUITE", "SUPER", "SWEET", "TABLE", "TAKEN", "TASTE",
  "TAXES", "TEACH", "TEAMS", "TEETH", "TERRY", "TEXAS", "THANK", "THEFT",
  "THEIR", "THEME", "THERE", "THESE", "THICK", "THING", "THINK", "THIRD",
  "THOSE", "THREE", "THREW", "THROW", "TIGHT", "TIMES", "TIRED", "TITLE",
  "TODAY", "TOPIC", "TOTAL", "TOUCH", "TOUGH", "TOWER", "TRACK", "TRADE",
  "TRAIN", "TREAT", "TREND", "TRIAL", "TRIED", "TRIES", "TRUCK", "TRULY",
  "TRUST", "TRUTH", "TWICE", "UNDER", "UNDUE", "UNION", "UNITY", "UNTIL",
  "UPPER", "UPSET", "URBAN", "USAGE", "USUAL", "VALID", "VALUE", "VIDEO",
  "VIRUS", "VISIT", "VITAL", "VOICE", "WASTE", "WATCH", "WATER", "WHEEL",
  "WHERE", "WHICH", "WHILE", "WHITE", "WHOLE", "WHOSE", "WOMAN", "WORLD",
  "WORRY", "WORSE", "WORST", "WORTH", "WOULD", "WRITE", "WRONG", "WROTE",
  "YIELD", "YOUNG", "YOUTH",
];

// Session: chatId -> game
const sessions = new Map();

function pickWord(lang) {
  const words = lang === "id" ? WORDS_ID : WORDS_EN;
  return words[Math.floor(Math.random() * words.length)];
}

function evaluate(guess, answer) {
  const result = [];
  const answerArr = answer.split("");
  const guessArr = guess.split("");
  const used = new Array(5).fill(false);

  // First pass: correct position (green)
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = "🟩";
      used[i] = true;
    }
  }

  // Second pass: wrong position (yellow) or miss (gray)
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue;
    let found = false;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === answerArr[j]) {
        result[i] = "🟨";
        used[j] = true;
        found = true;
        break;
      }
    }
    if (!found) result[i] = "⬛";
  }

  return result.join("");
}

async function handler(m, { sock, config, db }) {
  try {
    const input = (m.args?.[0] || "").toLowerCase();
    const lang = (m.args?.[1] || "id").toLowerCase() === "en" ? "en" : "id";

    if (input === "help" || !input) {
      return m.reply(claraWrap("Wordle", [
        "Game Wordle — tebak kata 5 huruf",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}wordle start — mulai game (Indonesia)`,
        `${m.prefix}wordle start en — mulai game (English)`,
        `${m.prefix}wordle hint — minta petunjuk`,
        `${m.prefix}wordle giveup — menyerah`,
        "",
        "🟩 = benar posisinya, 🟨 = ada tapi salah posisi, ⬛ = tidak ada",
        "Ketik kata 5 huruf untuk menebak (maks 6 kali)",
      ]));
    }

    if (input === "start" || input === "new") {
      // End existing
      if (sessions.has(m.chat)) {
        sessions.delete(m.chat);
      }

      const answer = pickWord(lang);
      const session = {
        answer,
        lang,
        attempts: [],
        maxAttempts: 6,
        startTime: Date.now(),
        active: true,
      };
      sessions.set(m.chat, session);

      // Auto-end after 5 minutes
      setTimeout(() => {
        if (sessions.has(m.chat) && sessions.get(m.chat).answer === answer) {
          sessions.delete(m.chat);
        }
      }, 300000);

      await m.react("🐣");
      return m.reply(claraWrap("Wordle", [
        `Game dimulai! Bahasa: ${lang === "id" ? "Indonesia" : "English"}`,
        `Tebak kata 5 huruf dalam ${session.maxAttempts} percobaan`,
        "",
        "🟩 = benar, 🟨 = salah posisi, ⬛ = tidak ada",
        `Ketik kata 5 huruf untuk menebak`,
      ]));
    }

    const session = sessions.get(m.chat);

    if (!session || !session.active) {
      await m.react("🐣");
      return m.reply(claraWrap("Wordle", `Belum ada game aktif. Ketik "${m.prefix}wordle start" untuk mulai.`));
    }

    if (input === "hint") {
      const revealed = session.answer[0] + " _ _ _ _";
      await m.react("🐣");
      return m.reply(claraWrap("Wordle", [
        "Petunjuk:",
        `Huruf pertama: "${session.answer[0]}"`,
        `Sisa percobaan: ${session.maxAttempts - session.attempts.length}`,
      ]));
    }

    if (input === "giveup" || input === "end") {
      sessions.delete(m.chat);
      await m.react("🐣");
      return m.reply(claraWrap("Wordle", `Kata yang benar: ${session.answer}`));
    }

    // Check if input is a 5-letter word (the guess)
    const guess = (m.args?.[0] || "").toUpperCase();
    if (guess.length !== 5 || !/^[A-Z]+$/.test(guess)) {
      await m.react("🐣");
      return m.reply(claraWrap("Wordle", "Ketik 5 huruf untuk menebak. Contoh: HALUS"));
    }

    if (session.attempts.length >= session.maxAttempts) {
      sessions.delete(m.chat);
      await m.react("🐣");
      return m.reply(claraWrap("Wordle", `Kesempatan habis! Jawaban: ${session.answer}`));
    }

    const result = evaluate(guess, session.answer);
    session.attempts.push({ guess, result });

    let boardText = session.attempts.map(a => `${a.result} ${a.guess}`).join("\n");
    const remaining = session.maxAttempts - session.attempts.length;

    if (guess === session.answer) {
      sessions.delete(m.chat);
      await m.react("🐣");
      return m.reply(claraWrap("Wordle", [
        `🎉 Benar! Jawaban: ${session.answer}`,
        `Percobaan: ${session.attempts.length}/${session.maxAttempts}`,
        "",
        boardText,
      ]));
    }

    if (session.attempts.length >= session.maxAttempts) {
      sessions.delete(m.chat);
      await m.react("🐣");
      return m.reply(claraWrap("Wordle", [
        `Kesempatan habis! Jawaban: ${session.answer}`,
        "",
        boardText,
      ]));
    }

    await m.react("🐣");
    return m.reply(claraWrap("Wordle", [
      `Sisa: ${remaining} percobaan`,
      "",
      boardText,
    ]));
  } catch (e) {
    console.error("[wordle] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "wordle");
  }
}

export { pluginConfig as config, handler };
