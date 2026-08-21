// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { delay } from "../../src/lib/nova-utils.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "data", "quizbattle.json"), "utf-8")
);

const pluginConfig = {
  name: "quizbattle",
  alias: ["qbattle", "quizb", "qb"],
  category: "game",
  description: "Team vs Team Trivia Battle - 2 tim adu pengetahuan umum",
  usage: ".quizbattle [jumlah soal] atau .quizbattle join [tim A/B] atau .quizbattle start",
  example: ".quizbattle 10",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const TEAM_NAMES = { A: "TIM MERAH", B: "TIM BIRU" };
const TEAM_EMOJI = { A: "🔴", B: "🔵" };
const TURN_LIMIT = 30; // detik per soal
const MAX_PLAYERS_PER_TEAM = 15;
const MIN_PLAYERS_PER_TEAM = 1;
const DEFAULT_QUESTIONS = 10;
const MAX_QUESTIONS = 30;

// ==================== Safe Helpers ====================
async function safeReply(m, sock, text, options = {}) {
  try {
    await sock.sendMessage(m.chat, { text, ...options }, { quoted: m });
  } catch {
    try { await sock.sendMessage(m.chat, { text }); } catch (e) { console.error('[quizbattle.js]:', e.message); }
  }
}

async function safeReact(m, sock, emoji) {
  try {
    const key = m.key || m?.message?.key || {};
    await sock.sendMessage(m.chat, {
      react: { text: emoji, key: { ...key, remoteJid: m.chat } },
    });
  } catch (e) { console.error('[quizbattle.js]:', e.message); }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(count) {
  return shuffle(QUESTIONS).slice(0, Math.min(count, QUESTIONS.length));
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

// ==================== Game Class ====================
class QuizBattle {
  constructor(chat, totalQuestions) {
    this.chat = chat;
    this.totalQuestions = totalQuestions;
    this.questions = pickQuestions(totalQuestions);
    this.currentQ = 0;
    this.scores = { A: 0, B: 0 };
    this.teams = { A: [], B: [] };
    this.turn = "A"; // Tim yang menjawab pertama per soal
    this.state = "WAITING"; // WAITING -> PLAYING -> DONE
    this.activeQuestion = null;
    this.answered = false;
    this.turnTimer = null;
    this.createdAt = Date.now();
    this.streak = { A: 0, B: 0 };
    this.maxStreak = { A: 0, B: 0 };
  }

  addPlayer(team, jid) {
    if (this.teams[team].includes(jid)) return { ok: false, reason: "already" };
    if (this.teams[team].length >= MAX_PLAYERS_PER_TEAM) return { ok: false, reason: "full" };
    this.teams[team].push(jid);
    return { ok: true };
  }

  removePlayer(jid) {
    let removed = null;
    for (const t of ["A", "B"]) {
      const idx = this.teams[t].indexOf(jid);
      if (idx !== -1) {
        this.teams[t].splice(idx, 1);
        removed = t;
      }
    }
    return removed;
  }

  findTeam(jid) {
    if (this.teams.A.includes(jid)) return "A";
    if (this.teams.B.includes(jid)) return "B";
    return null;
  }

  nextQuestion() {
    if (this.currentQ >= this.totalQuestions) {
      this.state = "DONE";
      return null;
    }
    this.activeQuestion = this.questions[this.currentQ];
    this.answered = false;
    // Alternate starting team per question
    this.turn = this.currentQ % 2 === 0 ? "A" : "B";
    return this.activeQuestion;
  }

  submitAnswer(text) {
    if (!this.activeQuestion || this.answered) return { ok: false };
    const userAns = normalize(text);
    const correctAns = normalize(this.activeQuestion.a);

    // Fuzzy match: accept if user answer contains the correct answer or vice versa
    let isCorrect = false;
    if (userAns === correctAns) {
      isCorrect = true;
    } else if (correctAns.length >= 3 && userAns.length >= 2) {
      if (userAns.includes(correctAns) || correctAns.includes(userAns)) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      this.answered = true;
      this.scores[this.turn]++;
      this.streak[this.turn]++;
      this.streak[this.turn === "A" ? "B" : "A"] = 0;
      this.maxStreak[this.turn] = Math.max(this.maxStreak[this.turn], this.streak[this.turn]);
      return { ok: true, correct: true, team: this.turn, answer: this.activeQuestion.a };
    }

    // Wrong answer - switch turn
    this.streak[this.turn] = 0;
    this.turn = this.turn === "A" ? "B" : "A";
    return { ok: true, correct: false, team: this.turn };
  }

  timeoutQuestion() {
    if (this.answered) return null;
    this.answered = true;
    this.streak.A = 0;
    this.streak.B = 0;
    return this.activeQuestion;
  }

  advance() {
    this.currentQ++;
    if (this.currentQ >= this.totalQuestions) {
      this.state = "DONE";
      return false;
    }
    return true;
  }

  getWinner() {
    if (this.scores.A > this.scores.B) return "A";
    if (this.scores.B > this.scores.A) return "B";
    return "DRAW";
  }

  getScoreboard() {
    const lines = [
      `${TEAM_EMOJI.A} ${TEAM_NAMES.A}: ${this.scores.A} pts`,
      `${TEAM_EMOJI.B} ${TEAM_NAMES.B}: ${this.scores.B} pts`,
      "",
      `Best Streak:`,
      `${TEAM_EMOJI.A} ${this.maxStreak.A}x | ${TEAM_EMOJI.B} ${this.maxStreak.B}x`,
    ];
    if (this.state === "DONE") {
      const winner = this.getWinner();
      lines.push("");
      if (winner === "DRAW") {
        lines.push("Hasil: SERI!");
      } else {
        lines.push(`Pemenang: ${TEAM_EMOJI[winner]} ${TEAM_NAMES[winner]}`);
      }
    }
    return lines.join("\n");
  }
}

// ==================== Global State ====================
if (!global.quizBattleGames) global.quizBattleGames = {};

function findGameByChat(chat) {
  return Object.values(global.quizBattleGames).find((g) => g.chat === chat);
}

function findGameByPlayer(jid) {
  return Object.values(global.quizBattleGames).find(
    (g) => g.findTeam(jid) !== null || (g.state === "WAITING" && false)
  );
}

// ==================== Handler ====================
async function handler(m, { sock, text: args }) {
  const prefix = ".";
  const cmd = (m.args?.[0] || "").toLowerCase();
  const arg2 = (m.args?.[1] || "").toLowerCase();
  const arg3 = (m.args?.[2] || "").toLowerCase();

  // .quizbattle help
  if (cmd === "help" || !cmd) {
    const helpText =
      `CARA MAIN QUIZ BATTLE:\n\n` +
      `1. ${prefix}quizbattle create [jumlah soal]\n` +
      `   Buat room (default 10 soal, max 30)\n\n` +
      `2. ${prefix}quizbattle join A atau ${prefix}quizbattle join B\n` +
      `   Join tim (min 1 orang per tim)\n\n` +
      `3. ${prefix}quizbattle start\n` +
      `   Mulai battle ketika kedua tim ada member\n\n` +
      `4. Reply/ikuti soal dengan jawaban\n` +
      `   Tim giliran menjawab, salah = giliran tim lawan\n\n` +
      `5. ${prefix}quizbattle score\n` +
      `   Lihat skor sementara\n\n` +
      `6. ${prefix}quizbattle leave\n` +
      `   Keluar dari tim\n\n` +
      `7. ${prefix}quizbattle cancel\n` +
      `   Batalkan battle (admin/creator)\n\n` +
      `Total soal tersedia: ${QUESTIONS.length}`;
    return safeReply(m, sock, claraWrap("QUIZ BATTLE", helpText));
  }

  // .quizbattle create [jumlah]
  if (cmd === "create" || cmd === "new") {
    const existing = findGameByChat(m.chat);
    if (existing && existing.state !== "DONE") {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", `Masih ada battle aktif di grup ini!\n\nKetik ${prefix}quizbattle cancel untuk membatalkan.`, "warn"));
    }

    let total = parseInt(arg2) || DEFAULT_QUESTIONS;
    total = Math.min(Math.max(total, 3), MAX_QUESTIONS);

    const gameId = "qb_" + Date.now();
    global.quizBattleGames[gameId] = new QuizBattle(m.chat, total);
    const game = global.quizBattleGames[gameId];
    game.creator = m.sender;

    await safeReact(m, sock, "🕐");
    await safeReply(m, sock, claraWrap("QUIZ BATTLE",
      `Room dibuat oleh @${m.sender.split("@")[0]}\n\n` +
      `Total Soal: ${total}\n` +
      `Tim: ${TEAM_EMOJI.A} ${TEAM_NAMES.A} vs ${TEAM_EMOJI.B} ${TEAM_NAMES.B}\n\n` +
      `Gabung tim sekarang:\n` +
      `${prefix}quizbattle join A\n` +
      `${prefix}quizbattle join B\n\n` +
      `Mulai: ${prefix}quizbattle start`,
      "success"
    ), { mentions: [m.sender] });
    return;
  }

  // .quizbattle join [A/B]
  if (cmd === "join") {
    const game = findGameByChat(m.chat);
    if (!game) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", `Belum ada room aktif!\n\nBuat dulu: ${prefix}quizbattle create`, "warn"));
    }
    if (game.state === "PLAYING") {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Battle sudah dimulai! Tidak bisa join.", "warn"));
    }

    const team = (arg2 || "").toUpperCase();
    if (team !== "A" && team !== "B") {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", `Pilih tim:\n${prefix}quizbattle join A (Merah)\n${prefix}quizbattle join B (Biru)`, "warn"));
    }

    // Check if already in a team
    const existingTeam = game.findTeam(m.sender);
    if (existingTeam) {
      if (existingTeam === team) {
        return safeReply(m, sock, claraWrap("QUIZ BATTLE", `Kamu sudah di ${TEAM_EMOJI[team]} ${TEAM_NAMES[team]}`, "warn"));
      }
      // Switch team
      game.removePlayer(m.sender);
    }

    const result = game.addPlayer(team, m.sender);
    if (!result.ok) {
      const msg = result.reason === "full" ? "Tim sudah penuh!" : "Sudah join tim ini!";
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", msg, "warn"));
    }

    await safeReact(m, sock, "✅");
    const teamAcount = game.teams.A.length;
    const teamBcount = game.teams.B.length;
    const mentionList = [...game.teams.A, ...game.teams.B];

    let joinText =
      `@${m.sender.split("@")[0]} join ${TEAM_EMOJI[team]} ${TEAM_NAMES[team]}!\n\n` +
      `Member Tim:\n` +
      `${TEAM_EMOJI.A} ${TEAM_NAMES.A} (${teamAcount} orang)\n` +
      `${TEAM_EMOJI.B} ${TEAM_NAMES.B} (${teamBcount} orang)\n\n`;

    if (teamAcount >= MIN_PLAYERS_PER_TEAM && teamBcount >= MIN_PLAYERS_PER_TEAM) {
      joinText += `Kedua tim siap! Mulai: ${prefix}quizbattle start`;
    } else {
      joinText += `Menunggu tim lain bergabung...`;
    }

    return safeReply(m, sock, claraWrap("QUIZ BATTLE", joinText, "success"), { mentions: mentionList });
  }

  // .quizbattle start
  if (cmd === "start") {
    const game = findGameByChat(m.chat);
    if (!game) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", `Belum ada room!\n\nBuat: ${prefix}quizbattle create`, "warn"));
    }
    if (game.state === "PLAYING") {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Battle sudah berjalan!", "warn"));
    }

    const aCount = game.teams.A.length;
    const bCount = game.teams.B.length;

    if (aCount < MIN_PLAYERS_PER_TEAM || bCount < MIN_PLAYERS_PER_TEAM) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE",
        `Kedua tim harus punya minimal ${MIN_PLAYERS_PER_TEAM} member!\n\n` +
        `${TEAM_EMOJI.A} ${TEAM_NAMES.A}: ${aCount} orang\n` +
        `${TEAM_EMOJI.B} ${TEAM_NAMES.B}: ${bCount} orang`,
        "warn"));
    }

    game.state = "PLAYING";
    await safeReact(m, sock, "🎮");

    const mentionList = [...game.teams.A, ...game.teams.B];
    const startText =
      `BATTLE DIMULAI!\n\n` +
      `${TEAM_EMOJI.A} ${TEAM_NAMES.A} (${aCount} member)\n` +
      `${TEAM_EMOJI.B} ${TEAM_NAMES.B} (${bCount} member)\n\n` +
      `Total Soal: ${game.totalQuestions}\n` +
      `Waktu per soal: ${TURN_LIMIT} detik\n` +
      `Aturan: Giliran menjawab bergantian. Salah = giliran lawan. Benar = +1 poin.\n\n` +
      `Get ready...`;

    await safeReply(m, sock, claraWrap("QUIZ BATTLE", startText, "success"), { mentions: mentionList });
    await delay(2000);

    // Start first question
    await sendQuestion(m, sock, game);
    return;
  }

  // .quizbattle score
  if (cmd === "score" || cmd === "skor" || cmd === "result") {
    const game = findGameByChat(m.chat);
    if (!game) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Tidak ada battle aktif!", "warn"));
    }
    const mentionList = [...game.teams.A, ...game.teams.B];
    return safeReply(m, sock, claraWrap("QUIZ BATTLE", game.getScoreboard(), game.state === "DONE" ? "success" : "info"), { mentions: mentionList });
  }

  // .quizbattle leave
  if (cmd === "leave" || cmd === "keluar") {
    const game = findGameByChat(m.chat);
    if (!game) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Tidak ada battle aktif!", "warn"));
    }
    const removedTeam = game.removePlayer(m.sender);
    if (!removedTeam) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Kamu tidak terdaftar di tim manapun!", "warn"));
    }
    await safeReact(m, sock, "✅");
    return safeReply(m, sock, claraWrap("QUIZ BATTLE",
      `@${m.sender.split("@")[0]} keluar dari ${TEAM_EMOJI[removedTeam]} ${TEAM_NAMES[removedTeam]}\n\n` +
      `${TEAM_EMOJI.A} ${TEAM_NAMES.A}: ${game.teams.A.length} orang\n` +
      `${TEAM_EMOJI.B} ${TEAM_NAMES.B}: ${game.teams.B.length} orang`,
      "info"), { mentions: [m.sender] });
  }

  // .quizbattle cancel
  if (cmd === "cancel" || cmd === "stop") {
    const game = findGameByChat(m.chat);
    if (!game) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Tidak ada battle aktif!", "warn"));
    }
    // Only creator or admin can cancel
    const metadata = m.isGroup ? await sock.groupMetadata(m.chat).catch(() => null) : null;
    const isAdmin = metadata?.participants?.find(p => p.id === m.sender)?.admin;
    if (game.creator !== m.sender && !isAdmin && !m.isOwner) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Hanya creator, admin grup, atau owner yang bisa cancel!", "warn"));
    }

    if (game.turnTimer) clearTimeout(game.turnTimer);

    const gameId = Object.keys(global.quizBattleGames).find(k => global.quizBattleGames[k] === game);
    delete global.quizBattleGames[gameId];

    await safeReact(m, sock, "✅");
    return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Battle dibatalkan!", "warn"));
  }

  // .quizbattle teams
  if (cmd === "teams" || cmd === "list") {
    const game = findGameByChat(m.chat);
    if (!game) {
      return safeReply(m, sock, claraWrap("QUIZ BATTLE", "Tidak ada battle aktif!", "warn"));
    }
    const teamAList = game.teams.A.map(j => "  - @" + j.split("@")[0]).join("\n") || "  (kosong)";
    const teamBList = game.teams.B.map(j => "  - @" + j.split("@")[0]).join("\n") || "  (kosong)";
    const mentionList = [...game.teams.A, ...game.teams.B];
    return safeReply(m, sock, claraWrap("QUIZ BATTLE",
      `${TEAM_EMOJI.A} ${TEAM_NAMES.A} (${game.teams.A.length})\n${teamAList}\n\n` +
      `${TEAM_EMOJI.B} ${TEAM_NAMES.B} (${game.teams.B.length})\n${teamBList}\n\n` +
      `Status: ${game.state}${game.state === "PLAYING" ? ` | Soal ${game.currentQ + 1}/${game.totalQuestions}` : ""}`,
      "info"), { mentions: mentionList });
  }

  return false;
}

// ==================== Send Question ====================
async function sendQuestion(m, sock, game) {
  const q = game.nextQuestion();
  if (!q) {
    // Game over
    await endGame(m, sock, game);
    return;
  }

  const mentionList = [...game.teams.A, ...game.teams.B];
  const qNum = game.currentQ + 1;

  const qText =
    `Soal ${qNum}/${game.totalQuestions}\n\n` +
    `Giliran: ${TEAM_EMOJI[game.turn]} ${TEAM_NAMES[game.turn]}\n\n` +
    `${q.q}\n\n` +
    `Waktu: ${TURN_LIMIT} detik\n` +
    `Ketik jawaban langsung di chat!`;

  await safeReply(m, sock, claraWrap("QUIZ BATTLE", qText, "info"), { mentions: mentionList });

  // Set timeout
  if (game.turnTimer) clearTimeout(game.turnTimer);
  game.turnTimer = setTimeout(async () => {
    const timedOutQ = game.timeoutQuestion();
    if (timedOutQ) {
      await safeReply(m, sock, claraWrap("QUIZ BATTLE",
        `Waktu habis!\n\nJawaban: ${timedOutQ.a}\n\n` +
        game.getScoreboard(),
        "warn"
      ), { mentions: [...game.teams.A, ...game.teams.B] });

      const hasMore = game.advance();
      await delay(1500);
      if (hasMore) {
        await sendQuestion(m, sock, game);
      } else {
        await endGame(m, sock, game);
      }
    }
  }, TURN_LIMIT * 1000);
}

// ==================== End Game ====================
async function endGame(m, sock, game) {
  const winner = game.getWinner();
  const mentionList = [...game.teams.A, ...game.teams.B];

  let endText =
    `BATTLE SELESAI!\n\n` +
    game.getScoreboard() + "\n\n";

  if (winner === "DRAW") {
    endText += "Hasil: SERI!\nSeri keren dari kedua tim!";
  } else {
    endText += `Selamat ${TEAM_EMOJI[winner]} ${TEAM_NAMES[winner]}!`;
  }

  endText += "\n\nTerima kasih sudah bermain!";

  await safeReply(m, sock, claraWrap("QUIZ BATTLE", endText, "success"), { mentions: mentionList });

  // Cleanup
  const gameId = Object.keys(global.quizBattleGames).find(k => global.quizBattleGames[k] === game);
  if (gameId) delete global.quizBattleGames[gameId];
}

// ==================== Answer Handler ====================
async function answerHandler(m, sock) {
  if (!m.body) return false;
  const text = m.body.trim();

  // Ignore commands
  if (/^[.!/]/.test(text)) return false;

  const game = findGameByChat(m.chat);
  if (!game || game.state !== "PLAYING" || !game.activeQuestion || game.answered) return false;

  // Check if sender is in a team
  const team = game.findTeam(m.sender);
  if (!team) return false;

  // Only the current turn team can answer
  if (team !== game.turn) {
    // Wrong team answering - ignore (or notify)
    return false;
  }

  const result = game.submitAnswer(text);

  if (result.ok && result.correct) {
    // Correct answer
    if (game.turnTimer) clearTimeout(game.turnTimer);
    await safeReact(m, sock, "✅");

    await safeReply(m, sock, claraWrap("QUIZ BATTLE",
      `Benar! @${m.sender.split("@")[0]} dari ${TEAM_EMOJI[result.team]} ${TEAM_NAMES[result.team]}\n\n` +
      `Jawaban: ${result.answer}\n\n` +
      game.getScoreboard(),
      "success"
    ), { mentions: [m.sender] });

    const hasMore = game.advance();
    await delay(1500);
    if (hasMore) {
      await sendQuestion(m, sock, game);
    } else {
      await endGame(m, sock, game);
    }
    return true;
  } else if (result.ok && !result.correct) {
    // Wrong answer - turn switches
    await safeReact(m, sock, "❌");
    await safeReply(m, sock, claraWrap("QUIZ BATTLE",
      `Salah! Giliran: ${TEAM_EMOJI[result.team]} ${TEAM_NAMES[result.team]}\n\n` +
      `Jawab: ${game.activeQuestion.q}`,
      "warn"
    ), { mentions: [...game.teams.A, ...game.teams.B] });
    return true;
  }

  return false;
}

export { pluginConfig as config, handler, answerHandler };
