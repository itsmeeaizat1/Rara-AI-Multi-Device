// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Family 100 Game — Build from scratch
// Multi-answer survey game (Family Feud style)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaBox, toSC } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, pickFlavor, renderProgressBar, renderSlotBoard } from "../../src/lib/nova-games.js";
import { normalizeAnswer, getSimilarity, isReplyToGame } from "../../src/lib/nova-game-engine.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Data Loader ───
const DATA_PATH = path.join(__dirname, "..", "..", "src", "data", "family100.json");
let _cache = null;

function loadData() {
  try {
    if (_cache) return _cache;
    if (!fs.existsSync(DATA_PATH)) {
      console.error("[family100] Data file not found:", DATA_PATH);
      return [];
    }
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    _cache = JSON.parse(raw);
    return _cache;
  } catch (e) {
    console.error("[family100] Load error:", e.message);
    return [];
  }
}

// ─── Session Manager (Global Map) ───
// Key: chatId
const sessions = new Map();

function createSession(chatId, questionData, messageKey, timeout = 120000) {
  if (sessions.has(chatId)) {
    const old = sessions.get(chatId);
    if (old.timer) clearTimeout(old.timer);
  }

  const answers = (questionData.jawaban || []).map((j, i) => ({
    text: j,
    index: i,
    revealed: false,
    foundBy: null,
  }));

  const session = {
    chatId,
    question: questionData.soal || "???",
    answers,
    totalAnswers: answers.length,
    foundCount: 0,
    messageKey,
    startTime: Date.now(),
    timeout,
    endTime: Date.now() + timeout,
    timer: null,
    warnTimer: null,
    scores: {},
    attempts: {},
  };

  sessions.set(chatId, session);
  return session;
}

function getSession(chatId) {
  return sessions.get(chatId) || null;
}

function endSession(chatId) {
  const s = sessions.get(chatId);
  if (s && s.timer) clearTimeout(s.timer);
  if (s && s.warnTimer) clearTimeout(s.warnTimer);
  sessions.delete(chatId);
  return s;
}

function hasActiveSession(chatId) {
  return sessions.has(chatId);
}

function setSessionTimer(chatId, callback) {
  const s = sessions.get(chatId);
  if (!s) return;
  const remaining = s.endTime - Date.now();
  if (remaining <= 0) {
    callback();
    return;
  }
  s.timer = setTimeout(() => {
    const cur = sessions.get(chatId);
    if (cur && cur.startTime === s.startTime) {
      callback();
      sessions.delete(chatId);
    }
  }, remaining);
}

function getRemainingTime(chatId) {
  const s = sessions.get(chatId);
  if (!s) return 0;
  return Math.max(0, s.endTime - Date.now());
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

// ─── Answer Checker ───
function checkFamilyAnswer(session, userAnswer) {
  const normalized = normalizeAnswer(userAnswer);
  if (!normalized) return { status: "empty" };

  for (const ans of session.answers) {
    if (ans.revealed) continue;
    const normAns = normalizeAnswer(ans.text);
    if (normAns === normalized) {
      return { status: "correct", answer: ans };
    }
    if (
      (normAns.includes(normalized) || normalized.includes(normAns)) &&
      normalized.length >= normAns.length * 0.7
    ) {
      return { status: "correct", answer: ans };
    }
    const sim = getSimilarity(normAns, normalized);
    if (sim >= 0.85) {
      return { status: "correct", answer: ans };
    }
  }

  let maxSim = 0;
  for (const ans of session.answers) {
    if (ans.revealed) continue;
    const sim = getSimilarity(normalizeAnswer(ans.text), normalized);
    if (sim > maxSim) maxSim = sim;
  }
  if (maxSim >= 0.6) {
    return { status: "close", similarity: maxSim };
  }

  return { status: "wrong" };
}

// ─── Board Renderer ─── array plain — │ & format dibuang, novaBox yang nyusun
function renderBoard(session) {
  return renderSlotBoard(session.answers, {
    nameOf: (jid) => jid.split("@")[0],
  });
}

// ─── Score Renderer ───
function renderScores(session) {
  const entries = Object.entries(session.scores);
  if (entries.length === 0) return [];
  entries.sort((a, b) => b[1].points - a[1].points);
  return entries.slice(0, 5).map(([jid, s], i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    return `${medal} @${jid.split("@")[0]} — ${s.correct} jawaban, ${s.points} pts`;
  });
}

// ─── Surrender Words ───
const SURRENDER_WORDS = [
  "nyerah", "aku nyerah", "gw nyerah", "gue nyerah", "menyerah",
  "aku menyerah", "gw menyerah", "skip", "lewat", "ga tau",
  "gatau", "gak tau", "tidak tau", "nggak tau", "give up",
  "buka jawaban", "buka", "akhir", "selesai",
];

function isSurrender(text) {
  if (!text) return false;
  const norm = text.toLowerCase().trim();
  return SURRENDER_WORDS.some((w) => norm === w);
}

// ─── Reward ───
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

// ─── Win Messages ───
const WIN_MSGS = [
  "🎉 *ꜱᴇʟᴀᴍᴀᴛ!* Semua jawaban ketemu!",
  "🔥 *WOW!* Board selesai semua!",
  " *ᴍᴀɴᴛᴀᴘ!* Kerja sama tim yang mantap!",
  "🏆 *ɢɢ ᴡᴘ!* Keluarga cerdas nih!",
];

const TIMEOUT_MSGS = [
  "⏱️ *Waktu habis! Game berakhir!*",
  "⏱️ *Time's up! Yah telat nih~*",
  "⏱️ *ᴡᴀᴋᴛᴜ ʜᴀʙɪꜱ!*",
];

const SURRENDER_MSGS = [
  "🏳️ *Yah nyerah deh...*",
  "🏳️ *ᴍᴇɴʏᴇʀᴀʜ!* Oke, ini jawabannya:",
  "🏳️ *Kasihan nih nyerah...*",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Plugin Config ───
const pluginConfig = {
  name: "family100",
  alias: ["family100"],
  category: "game",
  description: "Game Family 100 — tebak semua jawaban survey!",
  usage: ".family100",
  example: ".family100",
  isOwner: false,
  isPremium: true,
  isRegister: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// ─── Main Handler ───
async function handler(m, { sock }) {
  try {
    const chatId = m.chat;

    if (hasActiveSession(chatId)) {
      const session = getSession(chatId);
      if (session) {
        const remaining = getRemainingTime(chatId);
        const text = novaBox("Family 100", [
          "⚠️ Game masih berjalan",
          "---",
          session.question,
          ...renderBoard(session),
          "---",
          `${toSC("Ditemukan")} : ${session.foundCount}/${session.totalAnswers}`,
          `${toSC("Sisa Waktu")} : ${formatTime(remaining)}`,
          "---",
          'Ketik "nyerah" untuk menyerah dan lihat semua jawaban',
        ], { border: false });
        await m.reply(text);
        return;
      }
    }

    const data = loadData();
    if (!data || data.length === 0) {
      await m.reply(novaGameBox({ title: "family100", icon: "💯", flavor: "🫠 *BANK SOAL KOSONG!*", body: "Soalnya lagi kosong nih kak, coba lagi nanti ya!" }));
      return;
    }

    const questionData = data[Math.floor(Math.random() * data.length)];
    if (!questionData || !questionData.jawaban || questionData.jawaban.length === 0) {
      await m.reply(novaGameBox({ title: "family100", icon: "💯", flavor: "😵 *SOAL RUSAK!*", body: "Soalnya kepotong nih, coba ulang ya kak!" }));
      return;
    }
    await m.react("🕒");
    const text = novaBox("Family 100", [
      pickFlavor(),
      questionData.soal,
      "---",
      ...renderBoard({
        answers: questionData.jawaban.map((j, i) => ({
          text: j,
          index: i,
          revealed: false,
        })),
        totalAnswers: questionData.jawaban.length,
      }),
      "---",
      `${toSC("Progres")} : ${renderProgressBar(0, questionData.jawaban.length)}`,
      `${toSC("Total Jawaban")} : ${questionData.jawaban.length}`,
      `${toSC("Waktu")} : ${formatTime(120000)}`,
      `${toSC("Hadiah")} : Limit, Koin, EXP (random per jawaban)`,
      "---",
      "💬 Balas pesan ini atau ketik jawaban langsung",
      '🏳️ Ketik "nyerah" buat buka semua jawaban',
    ], { border: false });

    const sentMsg = await m.reply(text);
    await m.react("🐣");
    const session = createSession(
      chatId,
      questionData,
      sentMsg?.key || m.key,
      120000
    );

    // ⏰ Reminder 30 detik terakhir — biar seru kayak TV
    const warnDelay = Math.max(0, session.endTime - Date.now() - 30000);
    session.warnTimer = setTimeout(async () => {
      try {
        const cur = getSession(chatId);
        if (!cur || cur.startTime !== session.startTime) return;
        await sock.sendMessage(chatId, {
          // FIX OWNER 2026-09-07 (screenshot): label "Progres:" nempel
          // langsung ke progress bar — kelihatan dempet/berantakan.
          // Fix final (revisi owner): pakai JARAK BARIS KOSONG biar
          // progress bar keliatan jelas terpisah dan rapi.
          text: `⏰ *Sisa 30 detik!*\n\n📊 Progres:\n${renderProgressBar(cur.foundCount, cur.totalAnswers)}\n\nSemangat, buruan jawab yang belum kebuka! 💪`,
        });
      } catch {}
    }, warnDelay);

    setSessionTimer(chatId, async () => {
      try {
        // Reveal jawaban = hasil game → plain text tanpa box (aturan hasil plain)
        let endText = `${pick(TIMEOUT_MSGS)}\n\n`;
        endText += `${session.question}\n\n`;
        endText += `Jawaban lengkap:\n\n`;
        for (let i = 0; i < session.answers.length; i++) {
          const ans = session.answers[i];
          const num = String(i + 1).padStart(2, "0");
          endText += `${ans.revealed ? "✅" : "❌"} ${num} ${ans.text}${ans.revealed && ans.foundBy ? ` — @${ans.foundBy.split("@")[0]}` : ""}\n`;
        }
        endText += `\n📊 Progres akhir:\n${renderProgressBar(session.foundCount, session.totalAnswers)}\n\n`;
        const scores = renderScores(session);
        if (scores.length) {
          endText += `🏆 Skor akhir:\n${scores.join("\n")}\n\n`;
        }
        endText += gameCTA("family100");
        await sock.sendMessage(chatId, { text: endText });
      } catch (e) {
        console.error("[family100] Timeout handler error:", e.message);
      }
    });
  } catch (e) {
    console.error("[family100] Handler error:", e.message);
    try {
      await m.reply(novaGameBox({ title: "family100", icon: "💯", flavor: "❌ *ERROR SAAT MULAI!*", body: "Ada gangguan saat memulai game, coba lagi ya kak!" }));
    } catch {}
  }
}

// ─── Answer Handler (untuk pesan non-command) ───
async function answerHandler(m, sock) {
  try {
    const chatId = m.chat;
    const session = getSession(chatId);

    if (!session) return false;

    const userAnswer = (m.body || "").trim();
    if (!userAnswer || userAnswer.startsWith(".")) return false;

    // WAJIB reply pesan game (soal) untuk jawab atau nyerah
    if (!isReplyToGame(m, session)) return false;

    const sender = m.sender;

    if (!session.attempts[sender]) session.attempts[sender] = 0;
    session.attempts[sender]++;

    // ─── SURRENDER ───
    if (isSurrender(userAnswer)) {
      // Build reveal text BEFORE ending session
      // Format hasil (request owner): jawaban plain tanpa bold/uppercase,
      // bold cuma di header — biar gak berlebihan.
      // Reveal jawaban = hasil game → plain text tanpa box (aturan hasil plain)
      let text = `${pick(SURRENDER_MSGS)}\n\n`;
      text += `${session.question}\n\n`;
      text += `Jawaban lengkap:\n\n`;
      for (let i = 0; i < session.answers.length; i++) {
        const ans = session.answers[i];
        const num = String(i + 1).padStart(2, "0");
        text += `${ans.revealed ? "✅" : "❌"} ${num} ${ans.text}${ans.revealed && ans.foundBy ? ` — @${ans.foundBy.split("@")[0]}` : ""}\n`;
      }
      text += `\n📊 Progres akhir: ${renderProgressBar(session.foundCount, session.totalAnswers)}\n\n`;
      const scores = renderScores(session);
      if (scores.length) {
        text += `🏆 Skor akhir:\n${scores.join("\n")}\n\n`;
      }
      text += gameCTA("family100");

      const mentionJids = Object.keys(session.scores).length > 0
        ? Object.keys(session.scores)
        : undefined;

      // End session FIRST, then send message
      endSession(chatId);

      try {
        await sock.sendMessage(chatId, {
          text,
          mentions: mentionJids,
        });
      } catch (e) {
        console.error("[family100] Surrender send error:", e.message);
      }
      return true;
    }

    // ─── CHECK ANSWER ───
    const result = checkFamilyAnswer(session, userAnswer);

    if (result.status === "correct") {
      result.answer.revealed = true;
      result.answer.foundBy = sender;
      session.foundCount++;

      if (!session.scores[sender]) {
        session.scores[sender] = {
          name: m.pushName || sender.split("@")[0],
          correct: 0,
          points: 0,
        };
      }
      session.scores[sender].correct++;
      const points = session.totalAnswers - result.answer.index;
      session.scores[sender].points += points;
      const replyLines = [
        `🎉 @${sender.split("@")[0]} menebak: ${result.answer.text.toUpperCase()}`,
        `⚡ ${toSC("Dapat")} : ${points} poin`,
        `📊 ${toSC("Progres")} : ${renderProgressBar(session.foundCount, session.totalAnswers)}`,
        "---",
        session.question,
        ...renderBoard(session),
        "---",
        `⏳ ${toSC("Sisa Waktu")} : ${formatTime(getRemainingTime(chatId))}`,
      ];
      const scores = renderScores(session);
      if (scores.length) {
        replyLines.push({ sub: "Skor" }, ...scores);
      }
      const replyText = novaBox("Family 100", replyLines, { border: false });

      try {
        await m.react("🎉"); // react di pesan tebakan si penebak
      } catch {}
      try {
        await sock.sendMessage(chatId, {
          text: replyText,
          mentions: Object.keys(session.scores),
        });
      } catch (e) {
        console.error("[family100] Correct send error:", e.message);
      }

      // ─── CHECK IF ALL ANSWERS FOUND ───
      if (session.foundCount >= session.totalAnswers) {
        // Build win text BEFORE ending session
        const entries = Object.entries(session.scores);
        const winLines = [pick(WIN_MSGS)];

        if (entries.length > 0) {
          entries.sort((a, b) => b[1].points - a[1].points);
          const [topJid, topScore] = entries[0];

          // Give rewards
          let reward = { limit: 0, koin: 0, exp: 0 };
          try {
            const db = getDatabase();
            reward = getRandomReward();
            if (reward.limit > 0) db.updateEnergi(topJid, reward.limit);
            if (reward.koin > 0) db.updateKoin(topJid, reward.koin);
            if (reward.exp > 0) {
              const user = db.getUser(topJid);
              if (user) await addExpWithLevelCheck(sock, m, db, user, reward.exp);
            }
            db.save();
          } catch (e) {
            console.error("[family100] Reward error:", e.message);
          }

          winLines.push(
            "---",
            `🥇 ${toSC("Juara")} : @${topJid.split("@")[0]}`,
            `✅ ${toSC("Jawaban Benar")} : ${topScore.correct}`,
            `💯 ${toSC("Total Poin")} : ${topScore.points}`,
            `📊 ${toSC("Progres")} : ${renderProgressBar(session.foundCount, session.totalAnswers)}`,
            "---",
            { sub: "Hadiah" },
          );
          if (reward.limit > 0) winLines.push(`🎫 +${reward.limit} Limit`);
          if (reward.koin > 0) winLines.push(`🪙 +${reward.koin} Koin`);
          if (reward.exp > 0) winLines.push(`✨ +${reward.exp} EXP`);
          winLines.push("---", "🎊 *Board abis semua! Kerja tim yang keren!*");
        }
        const winText = novaBox("Family 100", winLines, { border: false });

        // End session FIRST, then send
        endSession(chatId);

        try {
          await sock.sendMessage(chatId, {
            text: winText,
            mentions: Object.keys(session.scores).length > 0
              ? [entries[0][0]]
              : undefined,
          });
        } catch (e) {
          console.error("[family100] Win send error:", e.message);
        }
      }

      return true;
    }

    if (result.status === "close") {
      const remaining = getRemainingTime(chatId);
      const percent = Math.round(result.similarity * 100);
      await m.react("🔥");
      try {
        await m.reply(novaGameBox({ title: "family100", icon: "💯", flavor: "🔥 *HAMPIR SEMPURNA!*", body: `Jawabanmu ${percent}% mirip — sisa ${formatTime(remaining)}` }));
      } catch {}
      return true;
    }

    if (result.status === "wrong") {
      // Interaktif ala modern: react ❌ doang di pesan tebakan —
      // gak spam box salah tiap tebakan, chat tetep bersih
      try {
        await m.react("❌");
      } catch {}
      return true;
    }

    return false;
  } catch (e) {
    console.error("[family100] AnswerHandler error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, answerHandler };
