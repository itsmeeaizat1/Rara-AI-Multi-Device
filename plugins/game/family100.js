// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Family 100 Game — Build from scratch
// Multi-answer survey game (Family Feud style)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaBox, toSC } from "../../src/lib/nova-menu-style.js";
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
  const lines = [];
  for (let i = 0; i < session.answers.length; i++) {
    const ans = session.answers[i];
    if (ans.revealed) {
      const finder = ans.foundBy ? ` (@${ans.foundBy.split("@")[0]})` : "";
      lines.push(`${i + 1}. ${ans.text.toUpperCase()} ✅${finder}`);
    } else {
      lines.push(`${i + 1}. ???????????`);
    }
  }
  return lines;
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
        ]);
        await m.reply(text);
        return;
      }
    }

    const data = loadData();
    if (!data || data.length === 0) {
      await m.reply("❌ Soalnya lagi kosong nih 🫠\nCoba lagi nanti ya!");
      return;
    }

    const questionData = data[Math.floor(Math.random() * data.length)];
    if (!questionData || !questionData.jawaban || questionData.jawaban.length === 0) {
      await m.reply("❌ Soalnya rusak nih 😵\nCoba ulang ya!");
      return;
    }
    const text = novaBox("Family 100", [
      `➥ ${questionData.soal}`,
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
      `${toSC("Total Jawaban")} : ${questionData.jawaban.length}`,
      `${toSC("Waktu")} : ${formatTime(120000)}`,
      `${toSC("Hadiah")} : Limit, Koin, EXP (random per jawaban)`,
      "---",
      "Balas pesan ini atau ketik jawaban langsung",
      'Ketik "nyerah" untuk menyerah',
    ]);

    const sentMsg = await m.reply(text);
    const session = createSession(
      chatId,
      questionData,
      sentMsg?.key || m.key,
      120000
    );

    setSessionTimer(chatId, async () => {
      try {
        const revealLines = [];
        for (let i = 0; i < session.answers.length; i++) {
          const ans = session.answers[i];
          revealLines.push(`${i + 1}. ${ans.text} ${ans.revealed ? "✅" : "❌"}`);
        }
        const endLines = [
          pick(TIMEOUT_MSGS),
          "---",
          session.question,
          { sub: "Jawaban Lengkap" },
          ...revealLines,
          "---",
          `${toSC("Ditemukan")} : ${session.foundCount}/${session.totalAnswers}`,
        ];
        const scores = renderScores(session);
        if (scores) {
          endLines.push({ sub: "Skor Akhir" }, ...scores);
        }
        endLines.push("---", "Yuk main lagi kak untuk mendapatkan poin yang lebih tinggi 🥳");
        const endText = novaBox("Family 100", endLines);
        await sock.sendMessage(chatId, { text: endText });
      } catch (e) {
        console.error("[family100] Timeout handler error:", e.message);
      }
    });
  } catch (e) {
    console.error("[family100] Handler error:", e.message);
    try {
      await m.reply("❌ *Terjadi error saat memulai game!*");
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
      const revealLines = [];
      for (let i = 0; i < session.answers.length; i++) {
        const ans = session.answers[i];
        revealLines.push(`${i + 1}. ${ans.text} ${ans.revealed ? "✅" : "❌"}`);
      }
      const endLines = [
        pick(SURRENDER_MSGS),
        "---",
        session.question,
        { sub: "Jawaban Lengkap" },
        ...revealLines,
        "---",
        `${toSC("Ditemukan")} : ${session.foundCount}/${session.totalAnswers}`,
      ];
      const scores = renderScores(session);
      if (scores) {
        endLines.push({ sub: "Skor Akhir" }, ...scores);
      }
      endLines.push("---", "Yuk main lagi kak untuk mendapatkan poin yang lebih tinggi 🥳");
      let text = novaBox("Family 100", endLines);

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
        `✅ @${sender.split("@")[0]} menebak: ${result.answer.text.toUpperCase()}`,
        `${toSC("Dapat")} : ${points} poin`,
        `${toSC("Ditemukan")} : ${session.foundCount}/${session.totalAnswers}`,
        "---",
        session.question,
        ...renderBoard(session),
        "---",
        `${toSC("Sisa Waktu")} : ${formatTime(getRemainingTime(chatId))}`,
      ];
      const scores = renderScores(session);
      if (scores.length) {
        replyLines.push({ sub: "Skor" }, ...scores);
      }
      const replyText = novaBox("Family 100", replyLines);

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
            `${toSC("Jawaban Benar")} : ${topScore.correct}`,
            `${toSC("Total Poin")} : ${topScore.points}`,
            "---",
            { sub: "Hadiah" },
          );
          if (reward.limit > 0) winLines.push(`+${reward.limit} Limit`);
          if (reward.koin > 0) winLines.push(`+${reward.koin} Koin`);
          if (reward.exp > 0) winLines.push(`+${reward.exp} EXP`);
        }
        const winText = novaBox("Family 100", winLines);

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
        await m.reply(`🔥 Hampir! Jawabanmu ${percent}% mirip — sisa ${formatTime(remaining)}`);
      } catch {}
      return true;
    }

    if (result.status === "wrong") {
      const remaining = getRemainingTime(chatId);
      try {
        await m.reply(`❌ Belum ada yang cocok — sisa ${formatTime(remaining)}`);
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
