// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Asah Otak — game multiplayer multi-ronde (upgrade ala script owner 9 Sep 2026)
// Menggantikan versi factory 1-soal. Fitur verbatim script:
//   • 5 kategori: Teka-teki 🧩 / Logika 🧠 / Matematika 🔢 / Tebak Gambar 🖼️ / Sulit 🔥
//   • Timer 25 dtk per ronde, jawaban ketik langsung di chat (1 jawaban/pemain/ronde)
//   • Feedback instan ✅ BENAR / ❌ SALAH, reveal waktu habis
//   • Semua yang benar dapat poin soal + jawaban pertama +3 bonus cepat
//   • Reveal: jawaban benar + pemenang ronde + list salah + top 5 medali 🥇🥈🥉
//   • Ronde otomatis lanjut 5 dtk, semua soal habis → juara akhir
//   • .asahotak skor (leaderboard persist db) / profil / kategori / stop
// Jawaban dinilai normalizeAnswer + fuzzy grace ≥85% (biar typo kecil tetep dapet).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeAnswer, getSimilarity } from "../../src/lib/rara-game-engine.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Knob (env override buat test/ops) ───
const ROUND_MS = Number(process.env.ASAHOTAK_ROUND_MS) || 25000; // 25 dtk ala script
const NEXT_ROUND_MS = Number(process.env.ASAHOTAK_NEXT_MS) || 5000; // 5 dtk ala script
const FUZZY_GRACE = 0.85; // kemiripan minimum biar typo kecil tetep dianggap benar

// ─── Data soal ───
const DATA_PATH = path.join(__dirname, "..", "..", "src", "data", "asahotak.json");
let _qCache = null;
function loadQuestions() {
  try {
    if (_qCache) return _qCache;
    _qCache = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    return _qCache;
  } catch (e) {
    console.error("[asahotak] load soal gagal:", e.message);
    return [];
  }
}

const CATEGORY_EMOJI = {
  "Teka-teki": "🧩",
  "Logika": "🧠",
  "Matematika": "🔢",
  "Tebak Gambar": "🖼️",
  "Sulit": "🔥",
};

// alias kategori yang sering diketik user → kategori resmi
const CATEGORY_ALIAS = {
  "teka-teki": "Teka-teki", "tekateki": "Teka-teki", "teka": "Teka-teki",
  "logika": "Logika",
  "matematika": "Matematika", "mtk": "Matematika", "math": "Matematika",
  "tebakgambar": "Tebak Gambar", "gambar": "Tebak Gambar", "deskripsi": "Tebak Gambar",
  "sulit": "Sulit", "hard": "Sulit",
};

const SURRENDER_WORDS = ["nyerah", "menyerah", "surrender", "buka jawaban", "buka"];
const STOP_WORDS = ["stop", "berhenti", "udahan"];
const isWordIn = (text, words) => words.some((w) => text.toLowerCase().trim() === w);

function safeSend(sock, chatId, text, mentions) {
  try {
    const content = { text };
    const clean = Array.isArray(mentions) ? mentions.filter(Boolean) : [];
    if (clean.length) content.mentions = [...new Set(clean)];
    return sock.sendMessage(chatId, content);
  } catch (e) {
    console.error("[asahotak] send error:", e.message);
  }
}

// ─── Session manager (per chat) ───
const sessions = new Map();

function clearTimers(s) {
  if (s?.timer) clearTimeout(s.timer);
  if (s?.nextTimer) clearTimeout(s.nextTimer);
}

function endSession(chatId) {
  const s = sessions.get(chatId);
  clearTimers(s);
  sessions.delete(chatId);
  return s;
}

// ─── Statistik pemain (persist ke database bot, field user.asahotak) ───
function getPlayer(jid, name = "Pemain") {
  const db = getDatabase();
  const user = db.getUser(jid) || db.setUser(jid);
  if (!user.asahotak) {
    user.asahotak = { name, score: 0, correct: 0, wrong: 0, gamesPlayed: 0, joinedAt: new Date().toISOString() };
  }
  // nama terbaru menang (pushName bisa berubah)
  user.asahotak.name = name || user.asahotak.name;
  db.setUser(jid, user);
  return user.asahotak;
}

function savePlayers() {
  try { getDatabase().save(); } catch (e) { console.error("[asahotak] save gagal:", e.message); }
}

// ─── Cek jawaban: exact normalized + fuzzy grace typo ───
function checkAnswer(userAnswer, correctAnswer) {
  const a = normalizeAnswer(userAnswer);
  const b = normalizeAnswer(correctAnswer);
  if (!a) return false;
  if (a === b) return true;
  return getSimilarity(a, b) >= FUZZY_GRACE;
}

// ─── Pilih soal belum terpakai ───
function pickQuestion(usedIds, categoryFilter) {
  let pool = loadQuestions();
  if (categoryFilter) pool = pool.filter((q) => q.category === categoryFilter);
  const available = pool.filter((q) => !usedIds.includes(q.id));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// ─── GAME ENGINE ───
async function startGame(m, sock, { categoryFilter = null } = {}) {
  const chatId = m.chat;
  if (sessions.has(chatId)) {
    return safeSend(sock, chatId, "🕒 Game asah otak lagi jalan! Tunggu ronde selesai atau ketik .asahotak stop");
  }
  const session = {
    chatId,
    phase: "question",
    question: null,
    categoryFilter,
    usedIds: [],
    round: 0,
    answers: [], // { jid, name, text, correct, ts }
    answeredUsers: new Set(),
    timer: null,
    nextTimer: null,
  };
  sessions.set(chatId, session);
  await sendRound(m, sock, session);
}

async function sendRound(m, sock, session) {
  const q = pickQuestion(session.usedIds, session.categoryFilter);
  if (!q) {
    // semua soal (kategori) sudah dimainkan → juara akhir
    return finishAll(sock, session);
  }
  session.question = q;
  session.phase = "question";
  session.answers = [];
  session.answeredUsers = new Set();
  session.usedIds.push(q.id);
  session.round += 1;

  const emoji = CATEGORY_EMOJI[q.category] || "❓";
  const msg =
    `🧠 *ASAH OTAK #${session.round}*\n` +
    `${emoji} *Kategori: ${q.category}*\n\n` +
    `❓ *Pertanyaan:*\n"${q.question}"\n\n` +
    `💡 *Petunjuk:* ${q.hint}\n` +
    `⭐ *Poin:* ${q.points}\n\n` +
    `🕒 *Waktu menjawab: 25 detik*\n` +
    `📌 Ketik jawabanmu langsung di chat! (1 jawaban per pemain)\n` +
    `🔥 *Semoga beruntung!*`;
  safeSend(sock, session.chatId, msg);

  session.timer = setTimeout(() => revealRound(sock, session, { reason: "timeout" }), ROUND_MS);
}

async function revealRound(sock, session, { reason = "timeout", final = false } = {}) {
  if (session.phase !== "question") return;
  session.phase = "reveal";
  clearTimeout(session.timer);

  const q = session.question;
  const correct = session.answers.filter((a) => a.correct);
  const wrong = session.answers.filter((a) => !a.correct);

  let reveal = `⏰ *WAKTU HABIS!*\n\n📢 *JAWABAN YANG BENAR:*\n✅ *${q.answer}*\n\n`;
  const mentions = [];

  if (correct.length > 0) {
    reveal += `🎉 *PEMENANG RONDE INI:*\n`;
    correct.forEach((a, i) => {
      const player = getPlayer(a.jid, a.name);
      player.score += q.points;
      player.correct += 1;
      const bonus = i === 0 ? ` (cepat! +3 bonus)` : ``;
      reveal += `   ${i + 1}. @${player.name} +${q.points} poin${bonus}\n`;
      if (i === 0) player.score += 3; // bonus jawaban pertama
      mentions.push(a.jid);
    });
    savePlayers();
    reveal += `\n`;
  } else {
    reveal += `😔 *Tidak ada yang menjawab dengan benar*\n\n`;
  }

  if (wrong.length > 0) {
    reveal += `❌ *JAWABAN SALAH:*\n`;
    wrong.forEach((a) => {
      const player = getPlayer(a.jid, a.name);
      player.wrong += 1;
      reveal += `   - @${player.name}: "${a.text}"\n`;
      mentions.push(a.jid);
    });
    savePlayers();
    reveal += `\n`;
  }

  // top 5 sementara (statistik global persist)
  const board = leaderboard(5);
  if (board.length > 0) {
    reveal += `🏆 *PEROLEHAN SKOR SEMENTARA*\n`;
    board.forEach((p, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      reveal += `${medal} @${p.name} - ${p.score} poin\n`;
    });
  }
  safeSend(sock, session.chatId, reveal, mentions);

  // stop (final) → skor udah dibayar di atas, langsung game over tanpa lanjut ronde
  if (final) {
    session.nextTimer = setTimeout(() => finishAll(sock, session, { stopped: true }), 2500);
    return;
  }

  // ronde selanjutnya
  const remaining = pickQuestion(session.usedIds, session.categoryFilter);
  if (!remaining) {
    session.nextTimer = setTimeout(() => finishAll(sock, session), 3000);
    return;
  }
  safeSend(sock, session.chatId, `🔥 *Ronde selanjutnya dalam 5 detik...*\n💡 Ketik .asahotak stop jika ingin berhenti`);
  session.nextTimer = setTimeout(async () => {
    if (sessions.get(session.chatId) !== session) return; // udah di-stop
    await sendRound(null, sock, session);
  }, NEXT_ROUND_MS);
}

// stop: jawaban ronde jalan tetap dibayar — reveal dulu baru game over
async function stopGame(sock, session) {
  if (session.phase === "question") {
    await revealRound(sock, session, { reason: "stop", final: true });
  } else {
    await finishAll(sock, session, { stopped: true });
  }
}

async function finishAll(sock, session, { stopped = false } = {}) {
  session.phase = "done";
  clearTimers(session);
  const board = leaderboard(3);
  const champion = board[0];
  let msg = stopped
    ? `⏹️ *GAME ASAH OTAK DIHENTIKAN!*\n\n`
    : `🎉 *SELESAI! Semua soal telah dimainkan!*\n\n`;
  if (champion) {
    msg += `🏆 *PEMENANG ASAH OTAK*\n🥇 @${champion.name} - ${champion.score} poin\n\n`;
    if (board[1]) msg += `🥈 @${board[1].name} - ${board[1].score} poin\n`;
    if (board[2]) msg += `🥉 @${board[2].name} - ${board[2].score} poin\n\n`;
  } else {
    msg += `😔 Belum ada pemain yang mencetak poin.\n\n`;
  }
  msg += `💡 Ketik .asahotak untuk bermain ulang!`;
  endSession(session.chatId);
  safeSend(sock, session.chatId, msg, board.map((p) => p.jid));
}

// ─── Leaderboard dari statistik persist ───
function leaderboard(limit = 10) {
  try {
    const db = getDatabase();
    const all = db.getAllUsers() || {};
    return Object.entries(all)
      .filter(([jid, u]) => u.asahotak && u.asahotak.score > 0)
      .map(([jid, u]) => ({ jid, ...u.asahotak }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) {
    console.error("[asahotak] leaderboard gagal:", e.message);
    return [];
  }
}

// ─── ANSWER HANDLER (jawaban bebas di chat, di-route dari handler.js) ───
async function answerHandler(m, sock) {
  try {
    const session = sessions.get(m.chat);
    if (!session || session.phase !== "question") return false;

    const text = (m.body || "").trim();
    if (!text || text.startsWith(".")) return false;

    const sender = m.sender;
    // guard: m.sender null (resolve JID gagal) — skip biar gak crash mention
    if (!sender) return false;
    const senderName = m.pushName || sender.split("@")[0];

    // nyerah → reveal langsung, lanjut ronde berikutnya
    if (isWordIn(text, SURRENDER_WORDS)) {
      await revealRound(sock, session, { reason: "surrender" });
      return true;
    }
    // stop → reveal dulu (jawaban kebayar) baru game over
    if (isWordIn(text, STOP_WORDS)) {
      await stopGame(sock, session);
      return true;
    }

    // 1 jawaban per pemain per ronde (ala script)
    if (session.answeredUsers.has(sender)) {
      await m.react("⚠️");
      safeSend(sock, session.chatId, `⚠️ *@${senderName}* sudah menjawab! Tunggu hasilnya.`, [sender]);
      return true;
    }

    const isCorrect = checkAnswer(text, session.question.answer);
    session.answeredUsers.add(sender);
    session.answers.push({ jid: sender, name: senderName, text, correct: isCorrect, ts: Date.now() });

    await m.react(isCorrect ? "✅" : "❌");
    const status = isCorrect ? "BENAR!" : "SALAH!";
    safeSend(
      sock,
      session.chatId,
      `${isCorrect ? "✅" : "❌"} *${status}* "@${senderName}" menjawab: "${text}"\n💡 ${isCorrect ? "Selamat!" : "Coba lagi di ronde berikutnya!"}`,
      [sender]
    );
    return true;
  } catch (e) {
    console.error("[asahotak] answerHandler error:", e.message);
    return false;
  }
}

// ─── PLUGIN HANDLER ───
const pluginConfig = {
  name: "asahotak",
  alias: ["asahotak"],
  category: "game",
  description: "Asah Otak multiplayer — 5 kategori, ronde otomatis, bonus cepat, leaderboard!",
  usage: ".asahotak — mulai game (acak semua kategori)\n.asahotak <kategori> — mulai dengan kategori\n.asahotak stop — hentikan game\n.asahotak skor — leaderboard\n.asahotak profil — statistik kamu\n.asahotak kategori — daftar kategori",
  example: ".asahotak\n.asahotak logika\n.asahotak skor",
  isOwner: false,
  isPremium: false,
  isRegister: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const sub = (m.args?.[0] || "").toLowerCase();
  const sender = m.sender;

  // STOP
  if (sub === "stop" || sub === "berhenti") {
    const session = sessions.get(m.chat);
    if (!session) return m.reply("⚠️ Tidak ada game asah otak yang sedang berjalan.");
    await stopGame(sock, session);
    return;
  }

  // SKOR / LEADERBOARD
  if (sub === "skor" || sub === "score" || sub === "leaderboard") {
    const board = leaderboard(10);
    if (!board.length) return m.reply("📊 Belum ada pemain yang mencetak poin.");
    let msg = `🏆 *LEADERBOARD ASAH OTAK*\n\n`;
    board.forEach((p, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      msg += `${medal} @${p.name} - ${p.score} poin\n   ✅ ${p.correct} benar | ❌ ${p.wrong} salah\n\n`;
    });
    msg += `📌 Total pemain: ${board.length}`;
    return safeSend(sock, m.chat, msg, board.map((p) => p.jid));
  }

  // PROFIL
  if (sub === "profil" || sub === "profile") {
    if (!sender) return m.reply("⚠️ Gagal membaca identitas kamu, coba lagi.");
    const p = getPlayer(sender, m.pushName || "Pemain");
    const msg =
      `👤 *PROFIL PEMAIN ASAH OTAK*\n\n` +
      `📛 Nama: @${p.name}\n` +
      `🏆 Skor: ${p.score} poin\n` +
      `✅ Jawaban benar: ${p.correct}\n` +
      `❌ Jawaban salah: ${p.wrong}\n` +
      `📅 Bergabung: ${new Date(p.joinedAt).toLocaleDateString("id-ID")}`;
    return safeSend(sock, m.chat, msg, [sender]);
  }

  // KATEGORI
  if (sub === "kategori" || sub === "category") {
    const questions = loadQuestions();
    const categories = [...new Set(questions.map((q) => q.category))];
    let msg = `🏷️ *KATEGORI SOAL ASAH OTAK*\n\n`;
    categories.forEach((cat) => {
      const count = questions.filter((q) => q.category === cat).length;
      const emoji = CATEGORY_EMOJI[cat] || "❓";
      msg += `${emoji} ${cat} (${count} soal)\n`;
    });
    msg += `\n💡 Gunakan: .asahotak [nama kategori]`;
    return safeSend(sock, m.chat, msg);
  }

  // START dengan kategori?
  let categoryFilter = null;
  if (sub && !["help", "bantuan"].includes(sub)) {
    const key = sub.replace(/[-\s]/g, "");
    const cat = CATEGORY_ALIAS[key] || CATEGORY_ALIAS[sub];
    if (!cat) {
      const questions = loadQuestions();
      const categories = [...new Set(questions.map((q) => q.category))];
      return m.reply(
        `⚠️ Kategori "*${sub}*" tidak ditemukan!\n\n🏷️ *Kategori Tersedia:*\n${categories.map((c) => `- ${c}`).join("\n")}`
      );
    }
    categoryFilter = cat;
  }

  if (!loadQuestions().length) return m.reply("⚠️ Bank soal asah otak belum siap, coba lagi nanti.");
  await startGame(m, sock, { categoryFilter });
}

export { pluginConfig as config, handler, answerHandler };
