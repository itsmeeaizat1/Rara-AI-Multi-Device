// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Family 100 Game — versi modern ala Family Feud TV (request owner 8 Sep 2026)
// 1 jawaban per pemain per ronde • poin survei 35/25/20/12/8 • reveal medali
// ronde otomatis lanjut • scoreboard kumulatif • .family100 stop buat berhenti

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { smallcapsText } from "../../src/lib/styler.js";
import { toSC } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA, pickFlavor } from "../../src/lib/rara-games.js";
import { normalizeAnswer, getSimilarity } from "../../src/lib/rara-game-engine.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { addExpWithLevelCheck } from "../../src/lib/rara-level.js";
import { addGameCash, formatRp } from "../../src/lib/rara-rpg-service.js";
import { rollGameReward, JACKPOT_MULT } from "../../src/lib/rara-game-rewards.js";
import { harvestFamily100, getRefreshState, onBankUpdated } from "../../src/lib/rara-family100-harvest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config knob (env override buat test/ops) ───
const ROUND_MS = Number(process.env.FAMILY100_ROUND_MS) || 30000;   // 30 dtk per ronde (ala script)
const NEXT_ROUND_MS = Number(process.env.FAMILY100_NEXT_MS) || 5000; // 5 dtk antar ronde (ala script)

// ─── Data Loader ───
const DATA_PATH = path.join(__dirname, "..", "..", "src", "data", "family100.json");
let _cache = null;
export function _invalidateCache() { _cache = null; }
onBankUpdated(_invalidateCache); // harvest/refresh → cache bank soal otomatis dibersihin
function loadData() {
  try {
    if (_cache) return _cache;
    if (!fs.existsSync(DATA_PATH)) { console.error("[family100] Data file not found:", DATA_PATH); return []; }
    _cache = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    return _cache;
  } catch (e) { console.error("[family100] Load error:", e.message); return []; }
}

// ─── Poin survei ala script owner: jawaban #1 paling populer = poin terbesar ───
const POINTS_SCALE = [35, 25, 20, 12, 8, 6, 5, 4, 3, 2];
const pointsFor = (index) => POINTS_SCALE[index] ?? 1;

// ─── Session Manager ───
const sessions = new Map();

function getSession(chatId) { return sessions.get(chatId) || null; }

function clearTimers(s) {
  if (s?.timer) clearTimeout(s.timer);
  if (s?.warnTimer) clearTimeout(s.warnTimer);
  if (s?.nextTimer) clearTimeout(s.nextTimer);
}

function endSession(chatId) {
  const s = sessions.get(chatId);
  clearTimers(s);
  sessions.delete(chatId);
  return s;
}

// ─── Fuzzy answer checker (toleransi typo — keep engine lama) ───
function matchSurveyAnswer(roundAnswers, userAnswer) {
  const normalized = normalizeAnswer(userAnswer);
  if (!normalized) return { status: "empty" };
  for (const ans of roundAnswers) {
    const normAns = normalizeAnswer(ans.text);
    if (normAns === normalized) return { status: "correct", answer: ans };
    if ((normAns.includes(normalized) || normalized.includes(normAns)) && normalized.length >= normAns.length * 0.7) {
      return { status: "correct", answer: ans };
    }
    if (getSimilarity(normAns, normalized) >= 0.85) return { status: "correct", answer: ans };
  }
  // track jawaban survei paling mirip — dipisah yang belum/belum diambil pemain lain
  // (request owner 8 Sep: jawaban pas = 100 poin, hampir mirip = poin sesuai kemiripan)
  let maxSim = 0, closest = null;
  let maxSimTaken = 0, closestTaken = null;
  for (const ans of roundAnswers) {
    const sim = getSimilarity(normalizeAnswer(ans.text), normalized);
    if (ans.foundBy) {
      if (sim > maxSimTaken) { maxSimTaken = sim; closestTaken = ans; }
    } else if (sim > maxSim) { maxSim = sim; closest = ans; }
  }
  if (maxSim >= 0.6) return { status: "close", similarity: maxSim, closest };
  if (maxSimTaken >= 0.6) return { status: "close_taken", closest: closestTaken };
  return { status: "wrong" };
}

// ─── Scoreboard ───
function renderScoreboard(session, top = 5) {
  const entries = Object.entries(session.scores);
  if (!entries.length) return [];
  entries.sort((a, b) => b[1].points - a[1].points);
  return entries.slice(0, top).map(([jid, s], i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    return `${medal} @${s.name || jid.split("@")[0]} - ${s.points} poin`;
  });
}

// ─── Surrender / Stop ───
const SURRENDER_WORDS = ["nyerah", "menyerah", "surrender", "buka jawaban", "buka"];
const STOP_WORDS = ["stop", "berhenti", "udahan"];
const isWordIn = (text, words) => words.some((w) => text.toLowerCase().trim() === w);

// ─── Reward (juara game) ───
const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
function getRandomReward() {
  return { limit: randBetween(3, 8), koin: randBetween(500, 2000), exp: randBetween(1000, 3000) };
}

// ─── Round Flow ───
async function startRound(sock, session) {
  const data = loadData();
  const used = session.usedIds;
  const available = data.map((q, i) => ({ q, i })).filter(({ i }) => !used.includes(i));
  if (!available.length || !data.length) {
    await revealChampion(sock, session, { finished: true });
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  used.push(pick.i);
  const q = pick.q;

  session.round++;
  session.phase = "question";
  session.question = q.soal || "???";
  // Poin survei dari data (src/data/family100.json upgrade: poin per jawaban,
  // total 100 ala TV) — fallback POINTS_SCALE buat soal lama tanpa poin
  session.survey = (q.jawaban || []).map((text, i) => ({
    text, points: (Array.isArray(q.poin) ? (q.poin[i] ?? pointsFor(i)) : pointsFor(i)), foundBy: null,
  }));
  session.attempts = [];          // [{ jid, name, text, status, points }]
  session.answeredUsers = new Set();
  session.endTime = Date.now() + ROUND_MS;

  const qText =
    `${pickFlavor()}\n` +
    `🎤 *FAMILY 100 CHAT*\n` +
    `📢 *PERTANYAAN KE-${session.round}*\n` +
    `"${q.soal}"\n\n` +
    `🕒 Waktu menjawab: ${Math.round(ROUND_MS / 1000)} detik\n` +
    `💰 Total ${session.survey.reduce((a, b) => a + b.points, 0)} poin di papan survei\n` +
    `💡 Ketik jawabanmu langsung di chat! (1 jawaban per pemain)\n` +
    `🏳️ Ketik "nyerah" buat loncat ronde • .family100 stop buat berhenti`;
  safeSend(sock, session.chatId, qText, []);

  // ⏰ Warning 10 dtk terakhir
  const warnIn = Math.max(0, session.endTime - Date.now() - 10000);
  session.warnTimer = setTimeout(() => {
    const cur = getSession(session.chatId);
    if (!cur || cur.phase !== "question") return;
    safeSend(sock, cur.chatId, `⏰ *Sisa 10 detik!*\n💡 Buruan, 1 jawaban per pemain!`, []);
  }, warnIn);

  // ⏰ Timeout → reveal
  session.timer = setTimeout(() => {
    const cur = getSession(session.chatId);
    if (!cur || cur.phase !== "question") return;
    revealRound(sock, cur, { reason: "timeout" });
  }, Math.max(0, session.endTime - Date.now()));
}

// ─── Reveal 1 ronde (ala script: medali + siapa yang bener + jawaban salah + skor) ───
function revealRound(sock, session, { reason } = {}) {
  clearTimers(session);
  session.phase = "reveal";
  const corrects = session.attempts.filter((a) => a.status === "benar");
  const closes = session.attempts.filter((a) => a.status === "close");
  const wrongs = session.attempts.filter((a) => a.status === "salah");

  let msg = "";
  if (reason === "surrender") msg += `🏳️ *RONDE DILEWATI!*\n\n`;
  else msg += `⏰ *WAKTU MENJAWAB HABIS!*\n\n`;
  msg += `📢 *HOST:* "Mari kita lihat jawaban dari survei 100 orang!"\n\n`;

  session.survey.forEach((qa, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
    msg += `${medal} *${qa.text}* - ${qa.points} poin\n`;
    if (qa.foundBy) {
      const s = session.scores[qa.foundBy];
      const nm = s?.name || qa.foundBy.split("@")[0];
      const awarded = qa.awarded ?? qa.points;
      msg += qa.hampir
        ? `   🔥 @${nm} HAMPIR MIRIP! +${awarded} POIN! 🎯\n`
        : `   ✅ @${nm} MENJAWAB BENAR! +${awarded} POIN! 🎉\n`;
    } else {
      msg += `   ❌ Tidak ada yang menjawab\n`;
    }
  });

  if (wrongs.length) {
    msg += `\n❌ *JAWABAN SALAH:*\n`;
    wrongs.forEach((a) => { msg += `   - @${a.name}: "${a.text}" (TIDAK ADA DI SURVEI)\n`; });
  }

  msg += `\n📊 Total jawaban pas: ${corrects.length}\n`;
  if (closes.length) msg += `🔥 Total hampir mirip: ${closes.length}\n`;
  msg += `📊 Total jawaban salah: ${wrongs.length}\n\n`;

  const board = renderScoreboard(session);
  if (board.length) {
    msg += `🏆 *PEROLEHAN SKOR SEMENTARA*\n`;
    msg += board.join("\n") + "\n\n";
  }

  const mentionJids = [
    ...Object.keys(session.scores),
    ...wrongs.map((a) => a.jid),
  ];
  safeSend(sock, session.chatId, msg, mentionJids);

  // 🔥 Ronde berikutnya otomatis (ala script)
  session.nextTimer = setTimeout(() => {
    const cur = getSession(session.chatId);
    if (!cur) return;
    safeSend(sock, cur.chatId, `🔥 *RONDE ${cur.round + 1} DIMULAI...*`, []);
    startRound(sock, cur).catch(() => {});
  }, NEXT_ROUND_MS);
}

// ─── Game over: juara + reward ───
// ASYNC: wajib await addExpWithLevelCheck SEBELUM bayar uang — kalau gak,
// setUser stale-rpg di dalamnya jalan belakangan (race) & TIMPA balik cash jadi 0.
async function revealChampion(sock, session, { stopped } = {}) {
  const board = renderScoreboard(session, 5);
  let msg = stopped
    ? `🛑 *GAME DIHENTIKAN!*\n\n`
    : `🎉 *SELESAI! Semua pertanyaan telah dimainkan!*\n\n`;
  msg += `🏆 *HASIL AKHIR FAMILY 100*\n`;
  if (board.length) msg += board.join("\n") + "\n\n";
  else msg += `📉 Gak ada yang mencetak poin 😅\n\n`;

  const entries = Object.entries(session.scores).sort((a, b) => b[1].points - a[1].points);
  const [topJid, topScore] = entries[0] || [];

  // Reward juara — profil khas family100 (exp+koin+uang+limit, jackpot 10%)
  if (topJid) {
    let reward = { limit: 0, koin: 0, exp: 0, uang: 0, tokens: 0, diamonds: 0 };
    let rewardRoll = { items: {}, jackpot: false };
    let cashRes = { gain: 0, saldo: 0 };
    try {
      const db = getDatabase();
      rewardRoll = rollGameReward("family100");
      reward = { limit: 0, koin: 0, exp: 0, uang: 0, tokens: 0, diamonds: 0, ...rewardRoll.items };
      if (reward.limit > 0) db.updateEnergi(topJid, reward.limit);
      if (reward.koin > 0) db.updateKoin(topJid, reward.koin);
      if (reward.tokens > 0) db.updateRpgCurrency(topJid, "tokens", reward.tokens);
      if (reward.diamonds > 0) db.updateRpgCurrency(topJid, "diamonds", reward.diamonds);
      if (reward.exp > 0) {
        const user = db.getUser(topJid);
        if (user) {
          const fakeM = { chat: session.chatId, sender: topJid, pushName: topScore.name || "Juara" };
          // AWAIT — EXP tetap EXP (naik level), urus sampai persist DULU
          await addExpWithLevelCheck(sock, fakeM, db, user, reward.exp);
        }
      }
      // 💵 uang juara (request owner 8 Sep: semua game ada uang) — DIBAYAR
      // SETELAH exp persist biar gak ketimpa race setUser rpg basi.
      // EXP & uang dua-duanya kebayar, gak ada yang digantikan.
      try {
        const fakeM = { chat: session.chatId, sender: topJid, pushName: topScore.name || "Juara" };
        cashRes = addGameCash(fakeM, reward.exp || 30);
      } catch {}
      db.save();
    } catch (e) { console.error("[family100] Reward error:", e.message); }
    msg += `🎊 *JUARA:* @${topScore.name || topJid.split("@")[0]} - ${topScore.points} poin\n`;
    if (rewardRoll.jackpot) msg += `🎰 *JACKPOT! Semua bonus ×${JACKPOT_MULT} + token & diamonds!*\n`;
    msg += `🎫 +${reward.limit} Limit | 🪙 +${reward.koin} Koin | ✨ +${reward.exp} EXP\n`;
    if (reward.tokens > 0) msg += `🎟️ +${reward.tokens} Token`;
    if (reward.diamonds > 0) msg += ` | 💎 +${reward.diamonds} Diamonds`;
    if (reward.tokens > 0 || reward.diamonds > 0) msg += `\n`;
    if (cashRes.gain > 0) msg += `💵 +${formatRp(cashRes.gain)} Uang (saldo ${formatRp(cashRes.saldo)})\n\n`;
    else msg += `\n`;
  }
  msg += gameCTA("family100");
  safeSend(sock, session.chatId, msg, Object.keys(session.scores));
  endSession(session.chatId);
}

// ─── Safe send ───
function safeSend(sock, chatId, text, mentions) {
  try {
    const content = { text: smallcapsText(text) };
    // Filter falsy (null/undefined) SEBELUM dedup — mentions null bikin
    // sock.sendMessage baileys crash "string argument ... Received null".
    const clean = Array.isArray(mentions) ? mentions.filter(Boolean) : [];
    if (clean.length) content.mentions = [...new Set(clean)];
    return sock.sendMessage(chatId, content);
  } catch (e) { console.error("[family100] send error:", e.message); }
}

// ─── Plugin Config ───
const pluginConfig = {
  name: "family100",
  alias: ["family100"],
  category: "game",
  description: "Game Family 100 ala TV — 1 jawaban per pemain, poin survei, reveal medali, ronde otomatis!",
  usage: ".family100 [stop | stat | refresh]",
  example: ".family100\n.family100 stop\n.family100 refresh (owner)",
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
async function handler(m, { sock, config }) {
  try {
    const chatId = m.chat;
    const sub = (m.args?.[0] || "").toLowerCase();

    // ─── STOP GAME ───
    if (sub === "stop") {
      const session = getSession(chatId);
      if (!session) return m.reply(raraGameBox({ title: "family100", icon: "💯", flavor: "🤔 *GAK ADA GAME!*", body: "Belum ada game family100 yang jalan di grup ini kak!" }));
      await revealChampion(sock, session, { stopped: true });
      return;
    }

    // ─── REFRESH: harvest soal baru dari internet (owner only) ───
    if (sub === "refresh" || sub === "update") {
      if (!m.isOwner) {
        return m.reply(raraGameBox({ title: "family100", icon: "💯", flavor: "🔒 *KHUSUS OWNER!*", body: "Command ini cuma buat owner bot!" }));
      }
      await m.react("🕒");
      try {
        const report = await harvestFamily100();
        const srcLines = report.sources.map((s) =>
          s.ok ? `✅ ${s.url.replace("https://raw.githubusercontent.com/", "")} — ${s.count} soal` : `❌ ${s.url} — ${s.error}`
        ).join("\n");
        const body = [
          `🌐 ${toSC("Sumber")} :`,
          srcLines,
          "",
          `📥 ${toSC("Soal baru")} : +${report.newSoal}`,
          `➕ ${toSC("Jawaban baru")} : +${report.newAnswers}`,
          `📚 ${toSC("Total bank soal")} : ${report.total}`,
        ].join("\n");
        await m.react("🐣");
        return m.reply(raraGameBox({ title: "family100", icon: "🌐", flavor: "🔄 *BANK SOAL DIREFRESH!*", body }));
      } catch (e) {
        console.error("[family100] refresh error:", e.message);
        return m.reply(raraGameBox({ title: "family100", icon: "💯", flavor: "❌ *REFRESH GAGAL!*", body: "Gagal ambil soal dari internet: " + e.message }));
      }
    }

    // ─── STAT: info bank soal ───
    if (sub === "stat" || sub === "status") {
      const data = loadData();
      const st = getRefreshState();
      const lastRefresh = st.lastAt
        ? new Date(st.lastAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "belum pernah";
      return m.reply(raraGameBox({
        title: "family100", icon: "📊",
        flavor: "📚 *BANK SOAL FAMILY 100*",
        body: [
          `📚 ${toSC("Total soal")} : ${data.length}`,
          `💰 ${toSC("Total poin/soal")} : 100 (papan survei)`,
          `🔄 ${toSC("Refresh terakhir")} : ${lastRefresh}`,
          `📥 ${toSC("Soal baru terakhir")} : +${st.lastNew || 0}`,
          "",
          `💡 .family100 refresh — isi soal baru dari internet (owner)`,
        ].join("\n"),
      }));
    }

    // ─── GAME SEDANG JALAN → tampilin status ───
    const session = getSession(chatId);
    if (session) {
      const remaining = Math.max(0, Math.ceil((session.endTime - Date.now()) / 1000));
      const board = renderScoreboard(session);
      let text =
        `⚠️ *GAME SEDANG BERJALAN — RONDE ${session.round}*\n\n` +
        `"${session.question}"\n\n`;
      if (session.phase === "question") text += `🕒 Sisa waktu: ${remaining} detik\n`;
      text += `💡 Ketik jawabanmu langsung di chat! (1 jawaban per pemain)`;
      if (board.length) text += `\n\n🏆 *SKOR SEMENTARA*\n` + board.join("\n");
      text += `\n\n🛑 .family100 stop buat berhenti`;
      await safeSend(sock, chatId, text, Object.keys(session.scores));
      return;
    }

    // ─── MULAI GAME BARU ───
    const data = loadData();
    if (!data || !data.length) {
      return m.reply(raraGameBox({ title: "family100", icon: "💯", flavor: "🫠 *BANK SOAL KOSONG!*", body: "Soalnya lagi kosong nih kak, coba lagi nanti ya!" }));
    }
    await m.react("🕒");

    const newSession = {
      chatId,
      hostName: config?.bot?.name || "Rara AI",
      startTime: Date.now(),
      round: 0,
      usedIds: [],
      scores: {},        // { jid: { name, points, correct } }
      phase: "idle",
      question: "",
      survey: [],
      attempts: [],
      answeredUsers: new Set(),
      timer: null, warnTimer: null, nextTimer: null,
    };
    sessions.set(chatId, newSession);

    await safeSend(sock, chatId,
      `🎬 *FAMILY 100 CHAT DIMULAI!*\n` +
      `🎤 Host: ${newSession.hostName}\n\n` +
      `📌 Aturan modern:\n` +
      `• 1 jawaban per pemain per ronde\n` +
      `• Jawaban survei terpopuler = poin terbesar\n` +
      `• Ronde baru otomatis setiap selesai!\n\n` +
      `🔥 *RONDE 1 DIMULAI...*`, []);
    startRound(sock, newSession);
    await m.react("🐣");
  } catch (e) {
    console.error("[family100] Handler error:", e.message);
    try { await m.reply(raraGameBox({ title: "family100", icon: "💯", flavor: "❌ *ERROR SAAT MULAI!*", body: "Ada gangguan saat memulai game, coba lagi ya kak!" })); } catch {}
  }
}

// ─── Answer Handler (pesan non-command di grup) ───
async function answerHandler(m, sock) {
  try {
    const session = getSession(m.chat);
    if (!session) return false;
    if (session.phase !== "question") return false;

    const text = (m.body || "").trim();
    if (!text || text.startsWith(".")) return false;

    const sender = m.sender;
    // GUARD 2026-09-08: m.sender bisa null (gagal resolve JID @lid, kasus
    // tepi rara-serialize/rara-lid). Tanpa identitas jelas gak bisa attribute
    // jawaban/poin — dan kalau lolos, mentions:[null] bikin sock.sendMessage
    // crash "string argument ... Received null" (spam di log). Skip aman.
    if (!sender) return false;
    const senderName = m.pushName || sender.split("@")[0];

    // ─── NYERAH → reveal ronde, lanjut ronde berikutnya ───
    if (isWordIn(text, SURRENDER_WORDS)) {
      revealRound(sock, session, { reason: "surrender" });
      return true;
    }

    // ─── STOP (plain text) → game over ───
    if (isWordIn(text, STOP_WORDS)) {
      await revealChampion(sock, session, { stopped: true });
      return true;
    }

    // ─── 1 JAWABAN PER PEMAIN (ala script) ───
    if (session.answeredUsers.has(sender)) {
      await m.react("⚠️");
      await safeSend(sock, session.chatId, `⚠️ *@${senderName}* sudah menjawab! Tunggu hasil reveal.`, [sender]);
      return true;
    }

    const result = matchSurveyAnswer(session.survey, text);

    // ─── MIRIP JAWABAN YANG UDAH DIAMBIL PEMAIN LAIN (jatah aman) ───
    if (result.status === "close_taken") {
      await m.react("⚠️");
      await safeSend(sock, session.chatId,
        `⚠️ Jawaban mirip "*${result.closest?.text || "?"}*" sudah disebutkan pemain lain! Coba jawaban lain (jatahmu masih ada) 💡`, [sender]);
      return true;
    }

    // ─── HAMPIR MIRIP → POIN SESUAI KEMIRIPAN (request owner 8 Sep) ───
    if (result.status === "close" || result.status === "empty") {
      if (result.status === "close") {
        const qa = result.closest;
        const awarded = Math.round(result.similarity * 100); // 71% mirip → 71 poin
        qa.foundBy = sender;
        qa.awarded = awarded;
        qa.hampir = true;
        session.attempts.push({ jid: sender, name: senderName, text, status: "close", points: awarded });
        session.answeredUsers.add(sender); // jatah hangus — poin udah dibayar
        if (!session.scores[sender]) session.scores[sender] = { name: senderName, points: 0, correct: 0 };
        session.scores[sender].points += awarded;
        await m.react("🔥");
        await safeSend(sock, session.chatId,
          `🔥 *HAMPIR MIRIP!* "@${senderName}" menjawab "${text}"\n` +
          `💡 Jawaban aslinya: *${qa.text}*\n` +
          `⭐ Mendapat ${awarded} poin (sesuai kemiripan ${Math.round(result.similarity * 100)}%)!`, [sender]);
        // papan bisa lengkap lewat jawaban hampir → reveal juga
        if (session.survey.every((a) => a.foundBy)) {
          await safeSend(sock, session.chatId, `💯 *WOW! SEMUA JAWABAN SURVEI KETEMU!*\n`, []);
          revealRound(sock, session, { reason: "allfound" });
        }
      }
      return true;
    }

    // ─── JAWABAN UDAH DIAMBIL PEMAIN LAIN ───
    if (result.status === "correct" && result.answer.foundBy) {
      await m.react("⚠️");
      await safeSend(sock, session.chatId,
        `⚠️ Jawaban "${result.answer.text}" sudah disebutkan oleh pemain lain! Coba jawaban lain (jatahmu masih ada) 💡`, [sender]);
      return true;
    }

    // ─── BENAR (ala script) ───
    if (result.status === "correct") {
      const qa = result.answer;
      qa.foundBy = sender;
      qa.awarded = 100; // request owner 8 Sep: jawaban pas = 100 poin flat
      const rank = session.survey.indexOf(qa) + 1;
      session.attempts.push({ jid: sender, name: senderName, text, status: "benar", points: 100 });
      session.answeredUsers.add(sender);
      if (!session.scores[sender]) session.scores[sender] = { name: senderName, points: 0, correct: 0 };
      session.scores[sender].points += 100;
      session.scores[sender].correct += 1;
      await m.react("🎉");
      await safeSend(sock, session.chatId,
        `✅ *BENAR!* "@${senderName}" menjawab "${qa.text}"\n` +
        `⭐ Mendapat *100 poin*! (Jawaban survei #${rank})`, [sender]);

      // Semua jawaban ketemu → langsung reveal
      if (session.survey.every((a) => a.foundBy)) {
        await safeSend(sock, session.chatId, `💯 *WOW! SEMUA JAWABAN SURVEI KETEMU!*\n`, []);
        revealRound(sock, session, { reason: "allfound" });
      }
      return true;
    }

    // ─── SALAH (ala script: jatah jawaban hangus) ───
    session.attempts.push({ jid: sender, name: senderName, text, status: "salah", points: 0 });
    session.answeredUsers.add(sender);
    await m.react("❌");
    await safeSend(sock, session.chatId,
      `❌ *SALAH!* "@${senderName}" menjawab "${text}"\n` +
      `💡 Jawaban tidak ada di survei 100 orang!`, [sender]);
    return true;
  } catch (e) {
    console.error("[family100] AnswerHandler error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, answerHandler };
