// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// hangman.js — Tebak kata (Hangman style, Indonesia + English)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import { formatRp } from "../../src/lib/rara-rpg-service.js";
import { rollBonus } from "../../src/lib/rara-game-rewards.js";

const pluginConfig = {
  name: "hangman",
  alias: ["hangman"],
  category: "game",
  description: "Tebak kata sebelum gantungan penuh (classic Hangman)",
  usage: ".hangman [start/letter/end]",
  example: ".hangman start\n.hangman a\n.hangman end",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

// Indonesian words (mixed length)
const WORDS_ID = [
  "KOMPUTER", "GADGET", "INTERNET", "KONEKSI", "SINYAL", "BATERAI",
  "LAYAR", "KAMERA", "SPEAKER", "HEADSET", "CHARGER", "KEYBOARD",
  "MONITOR", "PRINTER", "ROUTER", "WIFI", "BLUETOOTH", "DOWNLOAD",
  "UPLOAD", "STREAMING", "GAMING", "APLIKASI", "SOFTWARE", "HARDWARE",
  "PROGRAM", "DATABASE", "NETWORK", "SERVER", "CLOUD", "JARINGAN",
  "NUSANTARA", "MERDEKA", "PANCASILA", "GARUDA", "BENDERA", "BAHASA",
  "KEMERDEKAAN", "REPUBLIK", "DEMOKRASI", "PILKADA", "PEMILU",
  "JAKARTA", "BANDUNG", "SURABAYA", "MEDAN", "MAKASSAR", "SEMARANG",
  "PALEMBANG", "BALIKPAPAN", "DENPASAR", "ACEH", "PAPUA", "MALUKU",
  "RENDANG", "SATE", "NASGOR", "BAKSO", "MIE", "SOTO", "GADO",
  "RUJAK", "PEMPEK", "BATAK", "JAWA", "SUNDA", "BALI",
  "EDUKASI", "PENGETAHUAN", "BELAJAR", "MENGAJAR", "SEKOLAH", "KULIAH",
  "UNIVERSITAS", "PERPUSTAKAAN", "BUKU", "TULIS", "BACA", "HITUNG",
];

// English words
const WORDS_EN = [
  "PYTHON", "JAVASCRIPT", "ALGORITHM", "FUNCTION", "VARIABLE",
  "DATABASE", "FRAMEWORK", "LIBRARY", "COMPILER", "DEBUGGING",
  "DEPLOYMENT", "CONTAINER", "MICROSERVICE", "ENDPOINT", "MIDDLEWARE",
  "BUTTERFLY", "ELEPHANT", "KANGAROO", "PENGUIN", "DOLPHIN",
  "MOUNTAIN", "OCEAN", "FOREST", "DESERT", "WATERFALL",
  "KEYBOARD", "MONITOR", "SPEAKER", "BATTERY", "PROCESSOR",
  "FREEDOM", "COURAGE", "WISDOM", "JOURNEY", "MYSTERY",
  "PUZZLE", "RIDDLE", "ANSWER", "QUESTION", "SOLUTION",
];

// Sessions: chatId -> game
const sessions = new Map();
const MAX_WRONG = 6;

const HANGMAN_STAGES = [
  "  ╭───╮\n  │   │\n      │\n      │\n      │\n ══════",
  "  ╭───╮\n  │   │\n  ☠   │\n      │\n      │\n ══════",
  "  ╭───╮\n  │   │\n  ☠   │\n  │   │\n      │\n ══════",
  "  ╭───╮\n  │   │\n  ☠   │\n ─┼─  │\n      │\n ══════",
  "  ╭───╮\n  │   │\n  ☠   │\n ─┼─  │\n  │   │\n ══════",
  "  ╭───╮\n  │   │\n  ☠   │\n ─┼─  │\n ╭│╮  │\n ══════",
  "  ╭───╮\n  │   │\n  ✖   │\n ─┼─  │\n ╭│╮  │\n ══════",
];

function pickWord(lang) {
  const words = lang === "en" ? WORDS_EN : WORDS_ID;
  return words[Math.floor(Math.random() * words.length)];
}

function maskWord(word, guessed) {
  return word.split("").map(c => guessed.has(c) ? c : "_").join(" ");
}

async function handler(m, { sock, config, db }) {
  try {
    const input = (m.args?.[0] || "").toUpperCase();

    if (!input || input === "HELP") {
      return m.reply(raraWrap("Hangman", [
        "Tebak kata sebelum gantungan penuh!",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}hangman start — mulai game (Indonesia)`,
        `${m.prefix}hangman start en — mulai game (English)`,
        `${m.prefix}hangman <huruf> — tebak huruf`,
        `${m.prefix}hangman end — akhiri game`,
        "",
        `Maksimal ${MAX_WRONG} salah. Setiap tebakan salah = 1 tahap gantungan.`,
      ]));
    }

    if (input === "START" || input === "NEW") {
      const lang = (m.args?.[1] || "id").toLowerCase() === "en" ? "en" : "id";
      const word = pickWord(lang);

      sessions.set(m.chat, {
        word,
        lang,
        guessed: new Set(),
        wrong: 0,
        maxWrong: MAX_WRONG,
        active: true,
        startTime: Date.now(),
      });

      // Auto-end after 3 minutes
      setTimeout(() => {
        if (sessions.has(m.chat) && sessions.get(m.chat).word === word) {
          sessions.delete(m.chat);
        }
      }, 180000);
      return m.reply(raraWrap("Hangman", [
        `Game dimulai! Bahasa: ${lang === "id" ? "Indonesia" : "English"}`,
        `Panjang kata: ${word.length} huruf`,
        "",
        HANGMAN_STAGES[0],
        "",
        maskWord(word, new Set()),
        "",
        `Tebak huruf: ${m.prefix}hangman <huruf>`,
      ]));
    }

    const session = sessions.get(m.chat);

    if (!session || !session.active) {
      return m.reply(raraWrap("Hangman", `Belum ada game aktif. Ketik "${m.prefix}hangman start"`));
    }

    if (input === "END" || input === "GIVEUP") {
      sessions.delete(m.chat);
      return m.reply(raraWrap("Hangman", `Game diakhiri. Jawaban: ${session.word}`));
    }

    // Process letter guess
    if (input.length === 1 && /[A-Z]/.test(input)) {
      const letter = input;

      if (session.guessed.has(letter)) {
        return m.reply(raraWrap("Hangman", `Huruf "${letter}" sudah ditebak! Pilih huruf lain.`));
      }

      session.guessed.add(letter);

      if (session.word.includes(letter)) {
        // Correct guess
        const masked = maskWord(session.word, session.guessed);

        if (!masked.includes("_")) {
          // Won!
          sessions.delete(m.chat);
          // 💵 uang (semua game ada uang — request owner 8 Sep 2026)
          let hmCash = { gain: 0, saldo: 0 };
          try { hmCash = rollBonus(m, "hangman"); } catch {}
          return m.reply(raraWrap("Hangman", [
            `🎉 Selamat! Kata: ${session.word}`,
            `💵 Uang: +${formatRp(hmCash.gain)} (saldo ${formatRp(hmCash.saldo)})`,
            ...(hmCash.jackpot ? ["🎰 JACKPOT! Bonus 3x uang!"] : []),
            `Salah: ${session.wrong}/${MAX_WRONG}`,
            "",
            HANGMAN_STAGES[session.wrong],
            "",
            masked,
          ]));
        }
        return m.reply(raraWrap("Hangman", [
          `✅ "${letter}" benar!`,
          "",
          HANGMAN_STAGES[session.wrong],
          "",
          masked,
          "",
          `Tebakan: ${[...session.guessed].join(", ")}`,
        ]));
      } else {
        // Wrong guess
        session.wrong++;

        if (session.wrong >= session.maxWrong) {
          sessions.delete(m.chat);
          return m.reply(raraWrap("Hangman", [
            `💀 Game over! Kata: ${session.word}`,
            "Yuk coba kata lain kak, jangan takut kena gantung 🥳",
            "",
            HANGMAN_STAGES[MAX_WRONG],
          ]));
        }
        return m.reply(raraWrap("Hangman", [
          `❌ "${letter}" tidak ada!`,
          `Sisa: ${session.maxWrong - session.wrong}`,
          "",
          HANGMAN_STAGES[session.wrong],
          "",
          maskWord(session.word, session.guessed),
          "",
          `Tebakan: ${[...session.guessed].join(", ")}`,
        ]));
      }
    }

    // Try full word guess
    if (input.length > 1) {
      if (input === session.word) {
        sessions.delete(m.chat);
        // 💵 uang (semua game ada uang — request owner 8 Sep 2026)
        let hwCash = { gain: 0, saldo: 0 };
        try { hwCash = rollBonus(m, "hangman"); } catch {}
        return m.reply(raraWrap("Hangman", [
          `🎉 Benar! Kata: ${session.word}`,
          `💵 Uang: +${formatRp(hwCash.gain)} (saldo ${formatRp(hwCash.saldo)})`,
          ...(hwCash.jackpot ? ["🎰 JACKPOT! Bonus 3x uang!"] : []),
          `Salah: ${session.wrong}/${MAX_WRONG}`,
          "",
          "Yuk tebak kata lain kak, biar makin jago 🥳",
        ]));
      } else {
        session.wrong++;
        if (session.wrong >= session.maxWrong) {
          sessions.delete(m.chat);
          return m.reply(raraWrap("Hangman", [
            `💀 Game over! Kata: ${session.word}`,
            "Yuk coba kata lain kak, jangan takut kena gantung 🥳",
            "",
            HANGMAN_STAGES[MAX_WRONG],
          ]));
        }
        return m.reply(raraWrap("Hangman", [
          `❌ Bukan "${input}"! Sisa: ${session.maxWrong - session.wrong}`,
          "",
          maskWord(session.word, session.guessed),
        ]));
      }
    }
    return m.reply(raraWrap("Hangman", `Ketik 1 huruf atau kata penuh. Contoh: ${m.prefix}hangman a`));
  } catch (e) {
    console.error("[hangman] error:", e.message);
    return m.reply(te(m.prefix, m.command, m.pushName), "hangman");
  }
}

export { pluginConfig as config, handler };
