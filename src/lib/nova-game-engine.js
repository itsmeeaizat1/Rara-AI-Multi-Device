// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-game-engine.js — Game engine rebuild dari nol
// Fix: nyerah/surrender bug, reply detection, session management

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data');

// ═══════════════════════════════════════════════
// DATA LOADING (cached)
// ═══════════════════════════════════════════════

const dataCache = new Map();

function loadData(filename) {
  if (dataCache.has(filename)) return dataCache.get(filename);
  const filePath = path.join(dataPath, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    dataCache.set(filename, data);
    return data;
  } catch (e) {
    console.error(`[GameEngine] Error loading ${filename}:`, e.message);
    return [];
  }
}

function getRandomItem(filename) {
  const data = loadData(filename);
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)];
}

// ═══════════════════════════════════════════════
// SESSION MANAGEMENT
// Key: chatId → { gameType, question, messageKey, startTime, endTime, attempts }
// ═══════════════════════════════════════════════

const sessions = new Map();

function createSession(chatId, gameType, question, messageKey, timeout = 60000) {
  endSession(chatId);
  const session = {
    chatId,
    gameType,
    question,
    messageKey,
    startTime: Date.now(),
    endTime: Date.now() + timeout,
    timeout,
    attempts: 0,
    timer: null,
  };
  sessions.set(chatId, session);
  return session;
}

function getSession(chatId) {
  return sessions.get(chatId) || null;
}

function hasSession(chatId) {
  return sessions.has(chatId);
}

function endSession(chatId) {
  const session = sessions.get(chatId);
  if (session?.timer) clearTimeout(session.timer);
  sessions.delete(chatId);
  return session;
}

function setSessionTimer(chatId, callback) {
  const session = sessions.get(chatId);
  if (!session) return;
  const remaining = session.endTime - Date.now();
  if (remaining <= 0) { callback(); return; }
  session.timer = setTimeout(() => {
    const current = sessions.get(chatId);
    if (current && current.startTime === session.startTime) {
      callback();
      sessions.delete(chatId);
    }
  }, remaining);
}

function getRemainingTime(chatId) {
  const session = sessions.get(chatId);
  if (!session) return 0;
  return Math.max(0, Math.ceil((session.endTime - Date.now()) / 1000));
}

function formatTime(seconds) {
  if (seconds <= 0) return '0 detik';
  if (seconds < 60) return `${seconds} detik`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ═══════════════════════════════════════════════
// ANSWER CHECKING
// ═══════════════════════════════════════════════

function normalizeAnswer(answer) {
  if (!answer) return '';
  return answer.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
}

function levenshteinDistance(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function getSimilarity(s1, s2) {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return (maxLen - levenshteinDistance(s1, s2)) / maxLen;
}

function checkAnswer(correct, user) {
  const n1 = normalizeAnswer(correct);
  const n2 = normalizeAnswer(user);
  if (n1 === n2) return { status: 'correct', similarity: 1 };
  if (n1.includes(n2) || n2.includes(n1)) {
    if (n2.length >= n1.length * 0.8) return { status: 'correct', similarity: 0.95 };
  }
  const sim = getSimilarity(n1, n2);
  if (sim >= 0.85) return { status: 'correct', similarity: sim };
  if (sim >= 0.6) return { status: 'close', similarity: sim };
  return { status: 'wrong', similarity: sim };
}

// ═══════════════════════════════════════════════
// SURRENDER DETECTION — FIX UTAMA
// Gunakan includes, bukan exact match
// ═══════════════════════════════════════════════

function isSurrender(text) {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  const surrenderWords = [
    'nyerah', 'menyerah', 'skip', 'lewat', 'ga tau', 'gatau',
    'gak tau', 'tidak tau', 'nggak tau', 'ngak tau', 'give up',
    'aku nyerah', 'gw nyerah', 'gue nyerah', 'aku menyerah',
    'gw menyerah', 'gue menyerah', 'surrender', 'quit', 'bodo',
    'bodoh', 'gak sempat', 'gasempat', 'gabisa',
  ];
  return surrenderWords.some(word => normalized === word || normalized.includes(word));
}

// ═══════════════════════════════════════════════
// REPLY DETECTION — FIX UTAMA (v2)
// Game mengizinkan jawaban LANGSUNG (tanpa reply) sesuai teks
// yang ditampilkan ke user ("Balas pesan ini atau ketik jawaban
// langsung"). Reply HANYA dipakai untuk menolak pesan yang jelas-jelas
// nge-quote pesan LAIN yang tidak terkait game (mencegah false-positive
// saat user quote pesan orang lain untuk ngomong hal lain).
// ═══════════════════════════════════════════════

function isReplyToGame(m, session) {
  if (!session || !session.messageKey) return false;

  // Tidak reply sama sekali -> anggap jawaban langsung (sesuai promise ke user)
  if (!m.quoted) return true;

  const quotedId = m.quoted.id || m.quoted.key?.id || '';
  const sessionId = session.messageKey.id || '';

  // Reply tepat ke pesan soal game -> valid
  if (quotedId && sessionId && quotedId === sessionId) return true;

  // Reply ke pesan bot lain (fromMe) -> masih dianggap valid (longgar)
  if (m.quoted.fromMe === true || m.quoted.isBaileys === true) return true;

  // Reply ke pesan spesifik LAIN yang bukan dari bot -> kemungkinan besar
  // bukan ditujukan untuk jawab game, jangan proses sebagai jawaban
  return false;
}

// ═══════════════════════════════════════════════
// HINT SYSTEM
// ═══════════════════════════════════════════════

function getHint(answer, revealCount = 2) {
  if (!answer) return '';
  return answer.split('').map((char, i) => {
    if (char === ' ') return ' ';
    return i < revealCount ? char : '_';
  }).join('');
}

function getProgressiveHint(answer, attempts) {
  if (!answer) return '';
  const chars = answer.split('');
  const total = chars.filter(c => c !== ' ').length;
  const reveal = Math.min(total, 2 + Math.floor(attempts / 2));
  let count = 0;
  return chars.map(char => {
    if (char === ' ') return ' ';
    if (count < reveal) { count++; return char; }
    return '_';
  }).join('');
}

// ═══════════════════════════════════════════════
// REWARD SYSTEM
// ═══════════════════════════════════════════════

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomReward() {
  return {
    limit: randBetween(3, 8),
    koin: randBetween(500, 2000),
    exp: randBetween(1000, 3000),
  };
}

// ═══════════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════════

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const WIN_MSGS = [
  '🌟 *GG WP! Otakmu encer!*',
  '*KEREN ABIS! Lu emang pinter!*',
  '🎉 *MANTAPPPP! Jawaban sempurna!*',
  '💫 *EPIC! Gak ada lawan lu!*',
  '🏆 *NGERI! Otak lu kayak Google!*',
  '🔥 *LEGEND! Jawab kek gak ada beban!*',
];

const TIMEOUT_MSGS = [
  '⏱️ *Yah telat, waktu habis!*',
  '⏱️ *WAKTU HABIS!*',
  '⏱️ *Telat bro, waktu dah abis!*',
];

const SURRENDER_MSGS = [
  '🏳️ *Yahhh nyerah deh...*',
  '🏳️ *MENYERAH!*',
  '🏳️ *Yah sayang banget nyerah...*',
];

const WRONG_MSGS = [
  '❌ *Salah! Coba lagi~*',
  '❌ *Belum bener nih~*',
  '❌ *Yah salah, semangat!*',
];

// ═══════════════════════════════════════════════
// CLEANUP — auto expire sessions after 10 minutes
// ═══════════════════════════════════════════════

setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of sessions) {
    if (now - session.startTime > 10 * 60 * 1000) {
      if (session.timer) clearTimeout(session.timer);
      sessions.delete(chatId);
    }
  }
}, 5 * 60 * 1000);

// ═══════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════

export {
  getSimilarity,
  loadData,
  getRandomItem,
  createSession,
  getSession,
  hasSession,
  endSession,
  setSessionTimer,
  getRemainingTime,
  formatTime,
  normalizeAnswer,
  checkAnswer,
  isSurrender,
  isReplyToGame,
  getHint,
  getProgressiveHint,
  getRandomReward,
  randBetween,
  pick,
  WIN_MSGS,
  TIMEOUT_MSGS,
  SURRENDER_MSGS,
  WRONG_MSGS,
};

// ═══════════════════════════════════════════════
// ADDITIONAL DATA HELPERS (untuk non-game plugins)
// ═══════════════════════════════════════════════

function getItemByIndex(filename, index) {
  const data = loadData(filename);
  if (!data || data.length === 0) return null;
  return data.find(item => item.index === index) || data[index] || null;
}

function searchItem(filename, query, field = 'latin') {
  const data = loadData(filename);
  if (!data || data.length === 0) return null;
  const q = query.toLowerCase();
  return data.find(item => item[field] && item[field].toLowerCase().includes(q)) || null;
}

function getAllData(filename) {
  return loadData(filename);
}

export { getItemByIndex, searchItem, getAllData };
