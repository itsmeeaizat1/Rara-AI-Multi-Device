// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mbti",
  alias: ["mbti", "kepribadian", "personality"],
  category: "fun",
  description: "MBTI Personality Test - 32 questions via OpenJung API (free, no key)",
  usage: ".mbti",
  example: ".mbti",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 30,
  energi: 5,
  isEnabled: true,
};

const API_BASE = "https://openjung.org/api";

// In-memory session store: userId -> { questions, answers, current, startTime }
const sessions = new Map();

// Timeout: 10 minutes
const SESSION_TIMEOUT = 10 * 60 * 1000;

async function apiGet(endpoint) {
  const res = await axios.get(`${API_BASE}${endpoint}`, {
    timeout: 20000,
    validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
  });
  return res;
}

async function apiPost(endpoint, body) {
  const res = await axios.post(`${API_BASE}${endpoint}`, body, {
    timeout: 20000,
    validateStatus: () => true,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });
  return res;
}

// Clean expired sessions
function cleanSessions() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.startTime > SESSION_TIMEOUT) {
      sessions.delete(key);
    }
  }
}

async function handler(m, { sock, args }) {
  const sender = m.sender;
  const text = m.body?.trim() || "";
  const lowerText = text.toLowerCase();

  cleanSessions();

  // Check if user has an active session
  const session = sessions.get(sender);

  // === START TEST ===
  if (!session) {
    if (lowerText === ".mbti" || lowerText === ".mbti start" || lowerText === "!mbti" || lowerText.startsWith(".mbti ") || lowerText.startsWith("!mbti ")) {
      if (m.isGroup) {
        return m.reply(claraWrap("Mbti", "MBTI test hanya bisa dijalankan di private chat (DM) karena membutuhkan sesi interaktif.\n\nChat gw langsung untuk mulai test MBTI!"));
      }

      await m.react("🕒");
      try {
        const res = await apiGet("/questions?locale=en");
        if (res.status !== 200 || !res.data?.questions) throw new Error("Gagal mengambil pertanyaan");

        sessions.set(sender, {
          questions: res.data.questions,
          answers: {},
          current: 0,
          startTime: Date.now(),
        });

        const q = res.data.questions[0];
        let txt = `MBTI Personality Test\n\n`;
        txt += `32 pertanyaan - OpenJung API\n`;
        txt += `Sesi berlaku 10 menit\n\n`;
        txt += `Pertanyaan 1/32\n`;
        txt += `Dimensi: ${q.dimension}\n\n`;
        txt += `A. ${q.leftTrait}\n`;
        txt += `B. ${q.rightTrait}\n\n`;
        txt += `Balas dengan *A* atau *B*`;

        await m.reply(claraWrap(txt.split("\n").filter(l => l.trim())));
        await m.react("🐣");
      } catch (e) {
        console.error("[MBTI] Error:", e.message);
        await m.reply(claraWrap("mbti", `Gagal memulai test MBTI!\n\nError: ${e.message}`));
      }
      return;
    }
    return;
  }

  // === ACTIVE SESSION - handle answer ===
  // Cancel test
  if (lowerText === "cancel" || lowerText === "batal" || lowerText === "stop" || lowerText === ".mbti cancel") {
    sessions.delete(sender);
    await m.react("🐣");
    return m.reply(claraWrap("Mbti", "Test MBTI dibatalkan. Ketik `.mbti` untuk mulai lagi."));
  }

  // Parse answer (A or B)
  let answer;
  if (lowerText === "a" || lowerText === "1") answer = 2; // left trait
  else if (lowerText === "b" || lowerText === "2") answer = 4; // right trait
  else if (lowerText === "aa") answer = 1; // strongly left
  else if (lowerText === "bb") answer = 5; // strongly right
  else {
    return m.reply(claraWrap("Mbti", `Pilih *A* atau *B* saja!\n\nAtau ketik *ᴄᴀɴᴄᴇʟ* untuk batal.`));
  }

  // Record answer
  const q = session.questions[session.current];
  session.answers[String(q.id)] = answer;
  session.current++;

  // Check if test complete
  if (session.current >= session.questions.length) {
    await m.react("🕒");
    try {
      const res = await apiPost("/calculate", {
        answers: session.answers,
        locale: "en",
        save: false,
      });

      if (res.status !== 200 || !res.data?.result) throw new Error("Gagal menghitung hasil");

      const r = res.data.result;
      const ti = r.typeInfo || {};

      let txt = `Hasil MBTI Test\n\n`;
      txt += `Tipe: *${r.type}*\n`;
      if (ti.name) txt += `Nama: ${ti.name}\n\n`;

      // Dimension scores
      const p = r.percentages || {};
      txt += `Skor Dimensi:\n`;
      txt += `E ${p.E || 0}% | I ${p.I || 0}%\n`;
      txt += `S ${p.S || 0}% | N ${p.N || 0}%\n`;
      txt += `T ${p.T || 0}% | F ${p.F || 0}%\n`;
      txt += `J ${p.J || 0}% | P ${p.P || 0}%\n\n`;

      // Description
      if (ti.description) txt += `${ti.description}\n\n`;

      // Strengths
      if (ti.strengths && ti.strengths.length) {
        txt += `Kekuatan:\n`;
        for (let i = 0; i < Math.min(ti.strengths.length, 5); i++) {
          txt += `${i + 1}. ${ti.strengths[i]}\n`;
        }
        txt += `\n`;
      }

      // Weaknesses
      if (ti.weaknesses && ti.weaknesses.length) {
        txt += `Kelemahan:\n`;
        for (let i = 0; i < Math.min(ti.weaknesses.length, 5); i++) {
          txt += `${i + 1}. ${ti.weaknesses[i]}\n`;
        }
        txt += `\n`;
      }

      // Share URL
      if (r.shareUrl) txt += `Detail: ${r.shareUrl}\n\n`;
      txt += `_Test selesai! 32/32 pertanyaan terjawab_`;

      await m.reply(claraWrap(txt.split("\n").filter(l => l.trim())));
      await m.react("🐣");
    } catch (e) {
      console.error("[MBTI] Calculate error:", e.message);
      await m.reply(claraWrap("mbti", `Gagal menghitung hasil!\n\nError: ${e.message}`));
    }
    sessions.delete(sender);
    return;
  }

  // Next question
  const nextQ = session.questions[session.current];
  let txt = `Pertanyaan ${session.current + 1}/32\n`;
  txt += `Dimensi: ${nextQ.dimension}\n\n`;
  txt += `A. ${nextQ.leftTrait}\n`;
  txt += `B. ${nextQ.rightTrait}\n\n`;
  txt += `Balas dengan *A* atau *B*\n`;
  txt += `Ketik *ᴄᴀɴᴄᴇʟ* untuk batal`;

  await m.reply(claraWrap(txt.split("\n").filter(l => l.trim())));
  await m.react("🐣");
}

export { pluginConfig as config, handler };
