// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Trivia API — Quiz RPG dengan soal real dari Open Trivia DB
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import fetch from "node-fetch";

const pluginConfig = {
  name: "rpgtrivia",
  alias: ["trivia", "rpgquiz", "triviaapi", "rpgkuis"],
  category: "rpg",
  description: "RPG Trivia — quiz dengan soal real dari Open Trivia DB API, banyak kategori!",
  usage: ".rpgtrivia | .rpgtrivia category | .rpgtrivia set <kategori> | .rpgtrivia status",
  example: ".rpgtrivia\n.rpgtrivia set science",
  isGroup: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const TRIVIA_CATEGORIES = {
  general: { id: 9, name: "Umum" },
  books: { id: 10, name: "Buku" },
  film: { id: 11, name: "Film" },
  music: { id: 12, name: "Musik" },
  theatre: { id: 13, name: "Teater" },
  tv: { id: 14, name: "TV" },
  games: { id: 15, name: "Video Game" },
  board: { id: 16, name: "Board Game" },
  science: { id: 17, name: "Sains & Alam" },
  computer: { id: 18, name: "Komputer" },
  math: { id: 19, name: "Matematika" },
  mythology: { id: 20, name: "Mitologi" },
  sports: { id: 21, name: "Olahraga" },
  geography: { id: 22, name: "Geografi" },
  history: { id: 23, name: "Sejarah" },
  politics: { id: 24, name: "Politik" },
  art: { id: 25, name: "Seni" },
  celebrities: { id: 26, name: "Selebriti" },
  animals: { id: 27, name: "Hewan" },
  vehicles: { id: 28, name: "Kendaraan" },
  comics: { id: 29, name: "Komik" },
  gadgets: { id: 30, name: "Gadget" },
  anime: { id: 31, name: "Anime & Manga" },
  cartoons: { id: 32, name: "Kartun & Animasi" },
};

async function fetchTrivia(categoryId, amount = 5) {
  try {
    let url = "https://opentdb.com/api.php?amount=" + amount + "&type=multiple&encode=url3986";
    if (categoryId) url += "&category=" + categoryId;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.response_code !== 0 || !data.results) return null;

    return data.results.map((q) => {
      const decode = (s) => decodeURIComponent(s).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&");
      const correct = decode(q.correct_answer);
      const options = [...q.incorrect_answers.map(decode), correct].sort(() => Math.random() - 0.5);
      return {
        question: decode(q.question),
        correct,
        options,
        category: decode(q.category),
        difficulty: q.difficulty,
      };
    });
  } catch (e) {
    console.error("[Trivia API] error:", e);
    return null;
  }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Trivia", [
        "STATUS TRIVIA RPG",
        "",
        "Level: " + (user.triviaLevel || 1),
        "Benar: " + (user.triviaCorrect || 0),
        "Salah: " + (user.triviaWrong || 0),
        "Total soal: " + (user.triviaTotal || 0),
        "Streak terbaik: " + (user.triviaBestStreak || 0),
        "Koin: " + (user.koin || 0),
        "",
        "Kategori: " + (TRIVIA_CATEGORIES[user.triviaCat]?.name || "Acak"),
        "",
        "Ketik .rpgtrivia untuk main!",
      ]));
    }

    // CATEGORY LIST
    if (sub === "category" || sub === "kategori") {
      let lines = ["KATEGORI TRIVIA (Open Trivia DB)", ""];
      Object.entries(TRIVIA_CATEGORIES).forEach(([key, cat]) => {
        lines.push(".rpgtrivia set " + key + " - " + cat.name);
      });
      lines.push("", "Ketik .rpgtrivia set <kategori> untuk pilih");
      lines.push("Default: Acak (semua kategori)");
      return m.reply(claraWrap("RPG Trivia", lines));
    }

    // SET CATEGORY
    if (sub === "set" || sub === "atur") {
      const cat = (args[1] || "").toLowerCase();
      if (!TRIVIA_CATEGORIES[cat]) {
        return m.reply(claraWrap("RPG Trivia", "Kategori tidak ada! Ketik .rpgtrivia category untuk lihat semua."));
      }
      user.triviaCat = cat;
      db.data.users[sender] = user;
      await db.save();
      return m.reply(claraWrap("RPG Trivia", "Kategori: *" + TRIVIA_CATEGORIES[cat].name + "*", "success"));
    }

    // START QUIZ
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Trivia", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const catKey = user.triviaCat || "";
    const categoryId = catKey ? TRIVIA_CATEGORIES[catKey]?.id : null;
    m.reply(claraWrap("RPG Trivia", "Mengambil soal dari Open Trivia DB..."));

    const questions = await fetchTrivia(categoryId, 5);
    if (!questions || questions.length === 0) {
      return m.reply(claraWrap("RPG Trivia", "Gagal mengambil soal dari API. Coba lagi nanti!"));
    }

    let correctCount = 0;
    let streak = 0;
    let bestStreak = 0;

    let lines = [
      "TRIVIA RPG BATTLE",
      "Kategori: " + (catKey ? TRIVIA_CATEGORIES[catKey].name : "Acak"),
      "Soal: " + questions.length + " (Live dari Open Trivia DB)",
      "",
      "SOAL:",
      "",
    ];

    questions.forEach((q, i) => {
      lines.push("Soal " + (i + 1) + " [" + q.difficulty + "]: " + q.question);
      lines.push("A. " + q.options[0]);
      lines.push("B. " + q.options[1]);
      lines.push("C. " + q.options[2]);
      lines.push("D. " + q.options[3]);
      const correctIdx = q.options.indexOf(q.correct);
      lines.push("Jawaban: " + ["A", "B", "C", "D"][correctIdx] + ". " + q.correct);
      if (correctIdx >= 0) {
        correctCount++;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
        lines.push("BENAR! Streak: " + streak);
      } else {
        streak = 0;
        lines.push("SALAH!");
      }
      lines.push("");
    });

    user.energi -= pluginConfig.energi;
    const passed = correctCount >= 3;
    let reward = 0;
    let expGain = 0;

    if (passed) {
      reward = 50 + (correctCount * 25) + (bestStreak * 10);
      expGain = 20 + (correctCount * 8);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      if (correctCount === questions.length) {
        user.triviaLevel = (user.triviaLevel || 1) + 1;
      }
    }
    user.triviaCorrect = (user.triviaCorrect || 0) + correctCount;
    user.triviaWrong = (user.triviaWrong || 0) + (questions.length - correctCount);
    user.triviaTotal = (user.triviaTotal || 0) + questions.length;
    if (bestStreak > (user.triviaBestStreak || 0)) user.triviaBestStreak = bestStreak;
    db.data.users[sender] = user;
    await db.save();

    lines.push("HASIL TRIVIA:");
    lines.push("Benar: " + correctCount + "/" + questions.length);
    lines.push("Best streak: " + bestStreak);
    if (passed) {
      lines.push("LULUS! Reward: " + reward + " koin, +" + expGain + " exp");
      if (correctCount === questions.length) lines.push("SEMPURNA! Level naik!");
    } else {
      lines.push("Belum lulus. Minimal 3/5 benar!");
    }
    lines.push("", "Level: " + (user.triviaLevel || 1));
    lines.push("Energi: " + user.energi);

    return m.reply(claraWrap("RPG Trivia", lines, passed ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Trivia]", e);
    m.reply(claraWrap("RPG Trivia", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
