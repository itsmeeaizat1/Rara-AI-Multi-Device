// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// trivia.js — Trivia quiz via Open Trivia DB + The Trivia API fallback (no API key)
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "trivia",
  alias: ["trivia"],
  category: "fun",
  description: "Quiz trivia multiple choice (sains, sejarah, film, olahraga, dll)",
  usage: ".trivia [kategori] [difficulty]",
  example: ".trivia\n.trivia science\n.trivia history hard\n.trivia film easy",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

// Open Trivia DB category mapping
const OTDB_CATEGORIES = {
  general: 9, books: 10, film: 11, music: 12, theatre: 13,
  television: 14, games: 15, boardgames: 16, science: 17, computers: 18,
  mathematics: 19, mythology: 20, sports: 21, geography: 22, history: 23,
  politics: 24, art: 25, celebrities: 26, animals: 27, vehicles: 28,
  comics: 29, gadgets: 30, anime: 31, cartoon: 32,
};

const DIFFICULTIES = ["easy", "medium", "hard"];

// Session store: chatId -> active trivia
const activeTrivia = new Map();

function decodeHTML(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&eacute;/g, "é");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchOTDB(category, difficulty) {
  let url = "https://opentdb.com/api.php?amount=1&type=multiple";
  if (category && OTDB_CATEGORIES[category]) {
    url += `&category=${OTDB_CATEGORIES[category]}`;
  }
  if (difficulty && DIFFICULTIES.includes(difficulty)) {
    url += `&difficulty=${difficulty}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenTriviaDB ${res.status}`);
  const json = await res.json();
  if (json.response_code !== 0 || !json.results?.length) return null;
  const q = json.results[0];
  const correct = decodeHTML(q.correct_answer);
  const options = shuffle([
    correct,
    ...q.incorrect_answers.map(decodeHTML),
  ]);
  return {
    question: decodeHTML(q.question),
    correct,
    options,
    category: decodeHTML(q.category),
    difficulty: q.difficulty,
  };
}

async function fetchTriviaAPI(category, difficulty) {
  let url = "https://the-trivia-api.com/v2/questions?limit=1";
  if (difficulty && DIFFICULTIES.includes(difficulty)) {
    url += `&difficulty=${difficulty}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TriviaAPI ${res.status}`);
  const json = await res.json();
  if (!json.length) return null;
  const q = json[0];
  const correct = q.correctAnswer;
  const options = shuffle([correct, ...q.incorrectAnswers]);
  return {
    question: q.question.text,
    correct,
    options,
    category: q.category || "General",
    difficulty: q.difficulty || "easy",
  };
}

async function handler(m, { sock, config, db }) {
  try {
    await m.react("🕒");
    const input = m.args || [];
    let category = input[0]?.toLowerCase() || "";
    let difficulty = "";

    // Parse: last arg might be difficulty
    if (input.length >= 2 && DIFFICULTIES.includes(input[input.length - 1].toLowerCase())) {
      difficulty = input[input.length - 1].toLowerCase();
      category = input.slice(0, -1).join(" ").toLowerCase() || "";
    } else if (input.length === 1 && DIFFICULTIES.includes(input[0].toLowerCase())) {
      difficulty = input[0].toLowerCase();
      category = "";
    }

    if (category === "help" || category === "list") {
      return m.reply(raraWrap("Trivia Quiz", [
        "Quiz trivia multiple choice dari Open Trivia DB",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}trivia — soal random`,
        `${m.prefix}trivia <kategori> — soal per kategori`,
        `${m.prefix}trivia <kategori> <difficulty> — kategori + level`,
        "",
        "💡 *Contoh:*",
        `${m.prefix}trivia science`,
        `${m.prefix}trivia history hard`,
        `${m.prefix}trivia film easy`,
        "",
        "Kategori: general, science, history, geography, sports, film, music, games, anime, animals, computers, art, politics, mythology, celebrities, comics",
        "Difficulty: easy, medium, hard",
      ]));
    }

    // Check if there's already an active trivia in this chat
    if (activeTrivia.has(m.chat)) {
      const existing = activeTrivia.get(m.chat);
      if (Date.now() - existing.startTime < 60000) {
        return m.reply(raraWrap("Trivia Quiz", [
          "Masih ada soal yang belum dijawab!",
          "",
          existing.question,
          "",
          `Balas dengan huruf jawaban (A/B/C/D) atau "${m.prefix}trivia skip" untuk lewati`,
        ]));
      }
    }
    let quiz = null;
    let source = "";

    // Try Open Trivia DB first
    try {
      quiz = await fetchOTDB(category, difficulty);
      if (quiz) source = "Open Trivia DB";
    } catch (e) {
      console.log("[trivia] OTDB failed:", e.message);
    }

    // Fallback to The Trivia API
    if (!quiz) {
      try {
        quiz = await fetchTriviaAPI(category, difficulty);
        if (quiz) source = "The Trivia API";
      } catch (e) {
        console.log("[trivia] TriviaAPI failed:", e.message);
      }
    }

    if (!quiz) {
      return m.reply(raraError("Trivia", "Gagal ambil soal nih, coba lagi ya"));
    }

    // Store session
    const letters = ["A", "B", "C", "D"];
    const correctIndex = quiz.options.indexOf(quiz.correct);
    const correctLetter = letters[correctIndex];

    activeTrivia.set(m.chat, {
      question: quiz.question,
      correct: quiz.correct,
      correctLetter,
      options: quiz.options,
      startTime: Date.now(),
      source,
    });

    // Auto-clear after 60 seconds
    setTimeout(() => {
      if (activeTrivia.has(m.chat)) {
        const s = activeTrivia.get(m.chat);
        if (s.question === quiz.question) {
          activeTrivia.delete(m.chat);
        }
      }
    }, 60000);

    // Format question
    let text = `Kategori: ${quiz.category} | ${quiz.difficulty}\n\n`;
    text += `${quiz.question}\n\n`;
    quiz.options.forEach((opt, i) => {
      text += `${letters[i]}. ${opt}\n`;
    });
    text += `\nBalas dengan A/B/C/D atau "${m.prefix}trivia skip" untuk lewati`;
    await m.react("🐣");
    return m.reply(raraWrap("Trivia Quiz", text));
  } catch (e) {
    await m.react("❌");
    console.error("[trivia] error:", e.message);
    return m.reply(te(m.prefix, m.command, m.pushName), "trivia");
  }
}

// Export answer checker for handler integration
export function checkTriviaAnswer(chatId, text) {
  if (!activeTrivia.has(chatId)) return null;
  const session = activeTrivia.get(chatId);
  const answer = text.trim().toUpperCase();
  const letters = ["A", "B", "C", "D"];

  if (answer === "SKIP" || answer === `${session.skipPrefix}SKIP`) {
    activeTrivia.delete(chatId);
    return { correct: false, skipped: true, answer: session.correct, correctLetter: session.correctLetter };
  }

  if (!letters.includes(answer)) return null;

  const isCorrect = answer === session.correctLetter;
  activeTrivia.delete(chatId);
  return {
    correct: isCorrect,
    answer: session.correct,
    correctLetter: session.correctLetter,
    chosen: answer,
  };
}

export { pluginConfig as config, handler };
