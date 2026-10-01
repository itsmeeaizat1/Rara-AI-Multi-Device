// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-quiz-verify.js — Quiz verification system for new group members
// Anti-spam: member baru harus jawab quiz sebelum bisa chat

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { toSC, bracketBox, tipText } from "./rara-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(process.cwd(), "src", "database", "game", "quiz-verify.json");
const DEFAULT_TIMEOUT = 5; // minutes
const MAX_ATTEMPTS = 3;

// === Database ===
function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDB() {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return { groups: {}, pending: {} };
  }
}

function saveDB(data) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// === Question Generator ===
export function generateQuestion(difficulty = "easy") {
  const questions = {
    easy: [
      () => {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        return { q: `Berapa ${a} + ${b}?`, a: String(a + b) };
      },
      () => {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        return { q: `Berapa ${a} × ${b}?`, a: String(a * b) };
      },
      () => {
        const a = Math.floor(Math.random() * 20) + 10;
        const b = Math.floor(Math.random() * 9) + 1;
        return { q: `Berapa ${a} - ${b}?`, a: String(a - b) };
      },
    ],
    medium: [
      () => {
        const a = Math.floor(Math.random() * 20) + 10;
        const b = Math.floor(Math.random() * 10) + 2;
        return { q: `Berapa ${a} × ${b}?`, a: String(a * b) };
      },
      () => ({ q: "Ibukota Indonesia?", a: "jakarta" }),
      () => ({ q: "Ibukota Jepang?", a: "tokyo" }),
      () => ({ q: "Berapa hari dalam seminggu?", a: "7" }),
      () => ({ q: "Ibukota Prancis?", a: "paris" }),
      () => {
        const a = Math.floor(Math.random() * 50) + 10;
        const b = Math.floor(Math.random() * 10) + 2;
        return { q: `Berapa ${a} ÷ ${b}? (bulatkan ke bawah)`, a: String(Math.floor(a / b)) };
      },
    ],
    hard: [
      () => {
        const a = Math.floor(Math.random() * 10) + 2;
        return { q: `Berapa akar dari ${a * a}?`, a: String(a) };
      },
      () => ({ q: "Planet terdekat dengan matahari?", a: "merkurius" }),
      () => ({ q: "Gas paling banyak di atmosfer bumi?", a: "nitrogen" }),
      () => ({ q: "Siapa presiden pertama Indonesia?", a: "soekarno" }),
      () => {
        const a = Math.floor(Math.random() * 15) + 5;
        const b = Math.floor(Math.random() * 15) + 5;
        const c = Math.floor(Math.random() * 10) + 1;
        return { q: `Berapa (${a} + ${b}) × ${c}?`, a: String((a + b) * c) };
      },
      () => ({ q: "Berapa jumlah provinsi di Indonesia (2024)?", a: "38" }),
    ],
  };

  const pool = questions[difficulty] || questions.easy;
  return pool[Math.floor(Math.random() * pool.length)]();
}

// === Group Settings ===
export function enableQuizVerify(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = true;
  db.groups[groupId].difficulty = db.groups[groupId].difficulty || "easy";
  db.groups[groupId].timeout = db.groups[groupId].timeout || DEFAULT_TIMEOUT;
  saveDB(db);
  return db.groups[groupId];
}

export function disableQuizVerify(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = false;
  // Clear pending for this group
  for (const key of Object.keys(db.pending)) {
    if (key.startsWith(groupId + ":")) delete db.pending[key];
  }
  saveDB(db);
  return db.groups[groupId];
}

export function getQuizStatus(groupId) {
  const db = loadDB();
  return db.groups[groupId] || { enabled: false, difficulty: "easy", timeout: DEFAULT_TIMEOUT };
}

export function setDifficulty(groupId, difficulty) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].difficulty = difficulty;
  saveDB(db);
  return db.groups[groupId];
}

export function setTimeoutMinutes(groupId, minutes) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].timeout = minutes;
  saveDB(db);
  return db.groups[groupId];
}

// === Pending Verifications ===
export function getPendingKey(groupId, userId) {
  return `${groupId}:${userId}`;
}

export function getPendingUsers(groupId) {
  const db = loadDB();
  return Object.entries(db.pending)
    .filter(([key]) => key.startsWith(groupId + ":"))
    .map(([key, val]) => ({ ...val, jid: key.split(":")[1] }));
}

export function isPending(groupId, userId) {
  const db = loadDB();
  return !!db.pending[getPendingKey(groupId, userId)];
}

// === Handle New Member Join ===
export async function handleNewMemberQuiz(sock, groupId, participants) {
  const db = loadDB();
  const settings = db.groups[groupId];

  if (!settings?.enabled) return;

  for (const participant of participants) {
    // Skip bot itself
    const botJid = sock.user?.id;
    if (participant === botJid) continue;

    const botNumber = sock.user?.id?.split(":")[0]?.split("@")[0];
    if (participant.includes(botNumber)) continue;

    const { q, a } = generateQuestion(settings.difficulty || "easy");
    const key = getPendingKey(groupId, participant);

    db.pending[key] = {
      question: q,
      answer: a.toLowerCase().trim(),
      attempts: 0,
      joinedAt: Date.now(),
      timeout: (settings.timeout || DEFAULT_TIMEOUT) * 60 * 1000,
    };
    saveDB(db);

    // Send quiz message
    const mentionJid = participant.includes("@") ? participant : participant + "@s.whatsapp.net";
    const text = bracketBox("🛡️", toSC("Verifikasi Member Baru"), [
      `@${participant.split("@")[0].split(":")[0]}`,
      "",
      toSC("Selamat datang! Sebelum bisa chat,"),
      toSC("jawab pertanyaan verifikasi ini:"),
      "",
      `❓ ${toSC(q)}`,
      "",
      `📌 ${toSC("Ketik jawabanmu di chat")}`,
      `❗ ${toSC("Max salah")}: ${MAX_ATTEMPTS}x`,
      `⏰ ${toSC("Timeout")}: ${settings.timeout || DEFAULT_TIMEOUT} menit`,
      "",
      tipText(toSC("Jawab yang benar untuk diverifikasi!")),
    ]);

    try {
      await sock.sendMessage(groupId, {
        text,
        mentions: [mentionJid],
      });
    } catch (e) {
      console.error("[QuizVerify] Failed to send quiz:", e.message);
    }
  }
}

// === Check Message Verification ===
// Returns: { verified, wasPending, shouldDelete, message }
export function checkMessageVerification(groupId, userId, text) {
  const db = loadDB();
  const settings = db.groups[groupId];

  if (!settings?.enabled) return { verified: false, wasPending: false, shouldDelete: false };

  const key = getPendingKey(groupId, userId);
  const pending = db.pending[key];

  if (!pending) return { verified: false, wasPending: false, shouldDelete: false };

  // Check timeout
  const elapsed = Date.now() - pending.joinedAt;
  if (elapsed > pending.timeout) {
    delete db.pending[key];
    saveDB(db);
    return {
      verified: false,
      wasPending: true,
      shouldDelete: true,
      timedOut: true,
      message: "Timeout! Silakan join ulang untuk verifikasi.",
    };
  }

  // Check answer
  const userAnswer = (text || "").toLowerCase().trim();
  if (userAnswer === pending.answer) {
    delete db.pending[key];
    saveDB(db);
    return {
      verified: true,
      wasPending: true,
      shouldDelete: false,
      message: "Verifikasi berhasil! Selamat chat di grup.",
    };
  }

  // Wrong answer
  pending.attempts++;
  if (pending.attempts >= MAX_ATTEMPTS) {
    delete db.pending[key];
    saveDB(db);
    return {
      verified: false,
      wasPending: true,
      shouldDelete: true,
      kicked: true,
      message: `Jawaban salah ${MAX_ATTEMPTS}x! Anda akan dikeluarkan.`,
    };
  }

  saveDB(db);
  return {
    verified: false,
    wasPending: true,
    shouldDelete: true,
    message: `Jawaban salah! Sisa percobaan: ${MAX_ATTEMPTS - pending.attempts}\nPertanyaan: ${pending.question}`,
  };
}

// === Cleanup Expired Verifications ===
export function cleanupExpired(sock) {
  const db = loadDB();
  const now = Date.now();
  const expired = [];

  for (const [key, pending] of Object.entries(db.pending)) {
    if (now - pending.joinedAt > pending.timeout) {
      expired.push({ key, ...pending });
      delete db.pending[key];
    }
  }

  if (expired.length > 0) saveDB(db);

  return expired;
}

// === Init: start cleanup interval ===
export function initQuizVerify(sock) {
  // Run cleanup every 60 seconds
  setInterval(() => {
    const expired = cleanupExpired(sock);
    if (expired.length > 0) {
      console.log(`[QuizVerify] Cleaned ${expired.length} expired verifications`);
    }
  }, 60 * 1000);
}

export default {
  initQuizVerify,
  enableQuizVerify,
  disableQuizVerify,
  getQuizStatus,
  generateQuestion,
  checkMessageVerification,
  handleNewMemberQuiz,
  getPendingUsers,
  cleanupExpired,
  isPending,
  setDifficulty,
  setTimeoutMinutes,
};
