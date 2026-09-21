// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menara.js — MENARA SERIBU PINTU: petualangan teka-teki per lantai (request owner 21 Sep 2026)
// 100 lantai, tiap lantai 1 pintu terkunci teka-teki (6 jenis, tema dunia acak per lantai).
// Tiap lantai ke-10: GERBANG SANG BIJAK (boss 2 teka-teki berturut, reward ×3 + 1 permata).
// Salah = jatuh 2 lantai (boss 3). Benar tanpa hint = EXP ×2. Crit "Pintu Emas" 10% = ×1.5.
// Stamina Nafas: 10 max, tiap pintu -1, regen 1/5 menit. Hint: 30 gold ATAU 1 permata.
// Daily + streak bonus, starter pack pemain baru, rank Common→Mitos, prestige rebirth +10% EXP.
// Bank teka-teki src/data/menara-puzzles.json (752, generator test/menara-e2e/generate.mjs).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox } from "../../src/lib/nova-games.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { addGameCash, addGold, removeGold, ensureRpg } from "../../src/lib/nova-rpg-service.js";
import { normalizeAnswer, getSimilarity } from "../../src/lib/nova-game-engine.js";
import { getLocalDateObject } from "../../src/lib/nova-time.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── knob (env override buat test) ──
const Q_MS = Number(process.env.MENARA_Q_MS) || 60000;        // 60 dtk per pintu
const MAX_FLOOR = Number(process.env.MENARA_MAX_FLOOR) || 100;
const NAFAHS_MAX = 10;
const NAFAHS_REGEN_S = 300; // 1 nafas per 5 menit
const HINT_GOLD = 30;
const CRIT_CHANCE = 0.1;
const ANSWER_CD_MS = process.env.MENARA_ANSWER_CD_MS !== undefined ? Number(process.env.MENARA_ANSWER_CD_MS) : 2000; // anti-spam antar jawaban (0 = mati)

// ── bank teka-teki ──
const DATA_PATH = path.join(__dirname, "..", "..", "src", "data", "menara-puzzles.json");
let _cache = null;
function loadPuzzles() {
  if (_cache) return _cache;
  _cache = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  return _cache;
}
export function _setPuzzleSourceForTest(list) { _cache = list; }

// ── tema dunia acak per lantai ──
const THEMES = [
  ["🌲", "Hutan Bayangan"], ["🏛️", "Kuil Kuno"], ["❄️", "Labirin Es"], ["🌋", "Jalur Magma"],
  ["🏜️", "Gurun Bisu"], ["🌊", "Kedalaman Laut"], ["🌙", "Taman Malam"], ["🕸️", "Sarang Laba-laba"],
  ["🍄", "Hutan Jamur"], ["⛰️", "Puncak Kabut"], ["🕯️", "Ruang Lilin Abadi"], ["🪐", "Menara Antik"],
  ["💎", "Gua Kristal"], ["🌸", "Taman Sakura Runtu"], ["⛈️", "Awan Badai"], ["🪶", "Nest Angin"],
  ["🕳️", "Lorong Sunyi"], ["🌾", "Padang Ilalang"], ["🛖", "Desa Terlupakan"], ["🔥", "Neraka Kecil"],
];
const BOSS_GATES = ["🧙", "Gerbang Sang Bijak", "🪞", "Cermin Dua Wajah", "🗿", "Mulut Batu Purba", "🌌", "Pintu Bintang Jatuh"];
const themeFor = (floor) => {
  if (floor % 10 === 0) {
    const idx = (Math.floor(floor / 10) * 2) % BOSS_GATES.length;
    return { emoji: BOSS_GATES[idx], name: BOSS_GATES[idx + 1], boss: true };
  }
  const [emoji, name] = THEMES[(floor * 7 + 3) % THEMES.length];
  return { emoji, name, boss: false };
};

// ── state user persisten (tahan restart) ──
function ensureUser(m) {
  const db = getDatabase();
  if (!db.data.menara) db.data.menara = { perUser: {} };
  const u = db.data.menara.perUser[m.sender] || null;
  if (!u) return null;
  // regen nafas
  const nowS = Math.floor(Date.now() / 1000);
  const gained = Math.floor((nowS - (u.nafasAt || nowS)) / NAFAHS_REGEN_S);
  if (gained > 0 && (u.nafas || 0) < NAFAHS_MAX) {
    u.nafas = Math.min(NAFAHS_MAX, (u.nafas || 0) + gained);
    u.nafasAt = nowS;
  }
  return u;
}
function newUser(m) {
  const db = getDatabase();
  if (!db.data.menara) db.data.menara = { perUser: {} };
  const u = { floor: 1, bestFloor: 0, permata: 0, rebirths: 0, dailyStreak: 0, lastDaily: "", firstTime: true, nafas: NAFAHS_MAX, nafasAt: Math.floor(Date.now() / 1000) };
  db.data.menara.perUser[m.sender] = u;
  return u;
}
function saveDb() { try { getDatabase().save(); } catch {} }

// ── rank & rebirth ──
const rankFor = (best) => best >= 100 ? "🪄 Mitos" : best >= 75 ? "🌟 Legendary" : best >= 50 ? "🟣 Epic" : best >= 25 ? "🔵 Rare" : "⚪ Common";
const rebirthBonus = (rebirths) => 1 + (rebirths || 0) * 0.1;

// ── sesi (1 per chat) ──
const sessions = new Map();
export function _getSessionsForTest() { return sessions; }

// ── pilih teka-teki sesuai lantai ──
function pickPuzzle(usedIds, floor) {
  const bank = loadPuzzles();
  const boss = floor % 10 === 0;
  let wantLvl = floor <= 30 ? 1 : floor <= 70 ? 2 : 3;
  if (boss) wantLvl = Math.min(3, wantLvl + 1);
  let pool = bank.filter((p) => p.lvl === wantLvl && !usedIds.has(p.id));
  if (!pool.length) pool = bank.filter((p) => !usedIds.has(p.id));
  if (!pool.length) { usedIds.clear(); pool = bank.filter((p) => p.lvl === wantLvl); }
  const p = pool[Math.floor(Math.random() * pool.length)];
  usedIds.add(p.id);
  return p;
}

// ── UI ──
function doorText(s, puzzle, extra) {
  const th = themeFor(s.user.floor);
  const bossPart = th.boss
    ? [`${th.emoji} GERBANG SANG BIJAK (Lantai ${s.user.floor})`, `🎯 Tahap ${s.bossStage}/2 — dua teka-teki, dua-duanya harus benar!`]
    : [`${th.emoji} ${th.name.toUpperCase()} — Lantai ${s.user.floor}`];
  return [
    ...bossPart,
    `🌬️ Nafas: ${s.user.nafas}/${NAFAHS_MAX} · 💎 Permata: ${s.user.permata}`,
    "",
    ...puzzle.q.split("\n"),
    "",
    ...(extra ? [extra, ""] : []),
    `💡 Ketik .menara hint — ✍️ Balas jawabanmu — ⏱️ ${Math.round(Q_MS / 1000)} detik`,
  ].join("\n");
}

function askDoor(m, sock, s, prefix) {
  clearTimeout(s.timer);
  s.timer = setTimeout(() => onTimeout(m, sock, s), Q_MS);
  const send = (icon, flavor, body) => sock.sendMessage(m.chat, { text: novaGameBox({ title: "menara", icon, flavor, body }) }).catch(() => {});
  if (prefix) return send(prefix.icon, prefix.flavor, prefix.body).then(() => send("🚪", `🚪 *PINTU LANTAI ${s.user.floor}*`, doorText(s, s.current)));
  return send("🚪", `🚪 *PINTU LANTAI ${s.user.floor}*`, doorText(s, s.current));
}

// ── reward ──
function grantReward(m, s, { boss, hintUsed }) {
  const floor = s.user.floor;
  const th = themeFor(floor);
  let mult = 1;
  let notes = [];
  if (!hintUsed) { mult *= 2; notes.push("🎯 Tanpa hint — EXP ×2"); }
  if (Math.random() < CRIT_CHANCE) { mult *= 1.5; notes.push("✨ PINTU EMAS — EXP ×1.5"); }
  if (boss) { mult *= 3; }
  mult *= rebirthBonus(s.user.rebirths);
  if (s.user.rebirths > 0) notes.push(`♻️ Rebirth ×${s.user.rebirths} — EXP ×${rebirthBonus(s.user.rebirths).toFixed(1)}`);
  const baseExp = Math.floor(Math.pow(floor, 1.2) * 3);
  const exp = Math.floor(baseExp * mult);
  const cash = addGameCash(m, boss ? 6 * floor : 2 * floor);
  let lvlUp = null;
  try { lvlUp = addExpWithLevelCheck(m, exp); } catch {}
  return { exp, cashGain: cash?.gain || 0, lvlUp, notes, boss };
}

function climbTo(m, sock, s, floor) {
  s.user.floor = Math.max(1, floor);
  s.user.bestFloor = Math.max(s.user.bestFloor, s.user.floor);
  saveDb();
}

function endSession(m, chatId) {
  const s = sessions.get(chatId);
  if (s) { clearTimeout(s.timer); }
  sessions.delete(chatId);
}

function nextDoor(m, sock, s, prefix) {
  const boss = s.user.floor % 10 === 0;
  s.bossStage = boss ? 1 : 0;
  s.current = pickPuzzle(s.usedIds, s.user.floor);
  s.hintUsed = false;
  return askDoor(m, sock, s, prefix);
}

// ── timeout ──
function onTimeout(m, sock, s) {
  if (sessions.get(m.chat) !== s) return;
  // timeout TIDAK menjatuhkan lantai — nafas yang hangus jadi ongkosnya
  return nextDoor(m, sock, s, { icon: "⏰", flavor: "⏰ *WAKTU HABIS!*", body: "Nafasmu habis di depan pintu — pintu mengunci ulang dengan teka-teki baru. (Nafas sudah terpakai, lantai aman)" });
}

// ── jawaban ──
function isCorrect(puzzle, text) {
  const guess = normalizeAnswer(text);
  const ans = normalizeAnswer(puzzle.a);
  if (!guess) return false;
  if (guess === ans) return true;
  return getSimilarity(ans, guess) >= 0.8;
}

export async function answerHandler(m, sock) {
  const s = sessions.get(m.chat);
  if (!s || !s.current) return false;
  if (m.sender !== s.player) return false; // cuma pemain
  const raw = String(m.text || "").trim();
  if (!raw || raw.startsWith(".")) return false;
  // anti-spam: cooldown 2 dtk antar jawaban
  const nowS = Date.now();
  if (nowS - (s.lastAnswerAt || 0) < ANSWER_CD_MS) return true;
  s.lastAnswerAt = nowS;

  const benar = isCorrect(s.current, raw);
  if (m.react) { try { await m.react(benar ? "⚡" : "❌"); } catch {} }

  const u = ensureUser(m) || s.user;
  const boss = u.floor % 10 === 0;

  if (benar) {
    s.correct++;
    // boss: butuh 2 benar beruntun
    if (boss && s.bossStage === 1) {
      s.bossStage = 2;
      s.current = pickPuzzle(s.usedIds, u.floor);
      s.hintUsed = false;
      return askDoor(m, sock, s, { icon: "🧙", flavor: "✅ *SATU LAGI!*", body: `Benar! Tapi Gerbang Sang Bijak minta satu bukti lagi…` });
    }
    const r = grantReward(m, s, { boss, hintUsed: s.hintUsed });
    if (boss) { u.permata += 1; }
    const clearedFloor = u.floor;
    // lantai 100 = puncak
    if (u.floor >= MAX_FLOOR) {
      endSession(m, m.chat);
      u.bestFloor = MAX_FLOOR;
      saveDb();
      const body = [
        `🏆 KAMU MENCAPAI PUNCAK MENARA SERIBU PINTU!`,
        "",
        `🏰 Lantai ${clearedFloor} ditaklukkan · Rank: ${rankFor(u.bestFloor)}`,
        `🎁 +${r.exp} EXP · +${r.cashGain} uang${boss ? " · +1 💎 permata" : ""}`,
        ...(r.notes.length ? ["", ...r.notes] : []),
        "",
        `♻️ Ketik .menara rebirth — mulai ulang dengan +10% EXP permanen!`,
      ].join("\n");
      return sock.sendMessage(m.chat, { text: novaGameBox({ title: "menara", icon: "👑", flavor: "👑 *PUNCAK MENARA!*", body }) }).catch(() => {});
    }
    climbTo(m, sock, s, u.floor + 1);
    s.user = u;
    return nextDoor(m, sock, s, {
      icon: boss ? "🧙" : "🚪",
      flavor: boss ? "🧙 *GERBANG TERBUKA!*" : "🔓 *PINTU TERBUKA!*",
      body: [
        `✅ Jawaban: ${s.current.a}`,
        `🎁 +${r.exp} EXP · +${r.cashGain} uang${boss ? " · +1 💎 permata" : ""}${r.lvlUp ? " · 🎊 LEVEL UP!" : ""}`,
        ...(r.notes.length ? r.notes : []),
        "",
        `⬆️ Naik ke lantai ${u.floor}!`,
      ].join("\n"),
    });
  }

  // salah → jatuh 2 (boss 3)
  const fall = boss ? 3 : 2;
  const from = u.floor;
  climbTo(m, sock, s, u.floor - fall);
  s.user = u;
  s.streakWrong = (s.streakWrong || 0) + 1;
  const th = themeFor(u.floor);
  const body = [
    `❌ Jawaban yang diminta: ${s.current.a}`,
    `🩹 Kamu terpeleset dan jatuh ${fall} lantai…`,
    `📉 Lantai ${from} → ${u.floor} (${th.emoji} ${th.name})`,
    "",
    `Ayo panjat lagi — pintu baru sudah menunggu!`,
  ].join("\n");
  return nextDoor(m, sock, s, { icon: "🩹", flavor: "💥 *PINTU MENOLAK!*", body });
}

// ── daily ──
function todayWib() {
  const d = getLocalDateObject ? getLocalDateObject() : new Date();
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
}
function yesterdayWib() {
  const d = getLocalDateObject ? getLocalDateObject() : new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
}

// ── command .menara ──
async function handler(m, { sock, config }) {
  const sub = (m.args?.[0] || "").toLowerCase();

  // sub yang sah saat sesi jalan ATAU tanpa sesi
  if (sub === "stop") {
    const s = sessions.get(m.chat);
    if (!s) return m.reply(novaGameBox({ title: "menara", icon: "🤔", flavor: "❓ *GAK ADA PERJALANAN!*", body: "Belum ada pendakian menara yang jalan di chat ini!" }));
    const u = s.user;
    endSession(m, m.chat);
    saveDb();
    return m.reply(novaGameBox({ title: "menara", icon: "🛑", flavor: "🛑 *PENDAKIAN DIJEDA!*", body: `Kamu berhenti di lantai ${u.floor}. Ketik .menara kapan saja untuk lanjut dari lantai yang sama — progres tersimpan permanen.` }));
  }

  if (sub === "hint") {
    const s = sessions.get(m.chat);
    if (!s || !s.current) return m.reply(novaGameBox({ title: "menara", icon: "💡", flavor: "❓ *GAK ADA PINTU!*", body: "Mulai dulu pendakianmu: ketik .menara" }));
    if (s.hintUsed) return m.reply(novaGameBox({ title: "menara", icon: "💡", flavor: "💡 *HINT SUDAH DIPAKAI!*", body: "Satu pintu cuma boleh 1 hint. Jawab dulu teka-tekinya!" }));
    const u = ensureUser(m) || s.user;
    // bayar: 30 gold, fallback 1 permata (transaksi atomic per try)
    let paidWith = null;
    if (removeGold(m, HINT_GOLD)) paidWith = `${HINT_GOLD} gold`;
    else if ((u.permata || 0) >= 1) { u.permata -= 1; paidWith = "1 permata"; saveDb(); }
    else {
      return m.reply(novaGameBox({ title: "menara", icon: "🪙", flavor: "💸 *KURANG DANA!*", body: `Hint butuh ${HINT_GOLD} gold ATAU 1 permata. Kamu gak punya keduanya — Gaskeun jawab tanpa hint, EXP-mu dobel!` }));
    }
    s.hintUsed = true;
    s.user = u;
    return m.reply(novaGameBox({ title: "menara", icon: "💡", flavor: "💡 *HINT DIBELI!*", body: `Dibayar pakai ${paidWith}.\n\n${s.current.hint}\n\n⚠️ Jawaban benar sekarang EXP normal (tanpa bonus tanpa-hint).` }));
  }

  if (sub === "status") {
    let u = ensureUser(m);
    if (!u) return m.reply(novaGameBox({ title: "menara", icon: "🏗️", flavor: "🏗️ *MENARA SERIBU PINTU*", body: "Kamu belum pernah mendaki! Ketik .menara untuk mulai — pemain baru dapat starter pack 3 permata + 50 gold." }));
    const th = themeFor(u.floor);
    return m.reply(novaGameBox({
      title: "menara", icon: "🏗️",
      flavor: "🏗️ *KARTU PETUALANG*",
      body: [
        `🏰 Lantai: ${u.floor} · Terakhir di ${th.emoji} ${th.name}`,
        `🏆 Lantai tertinggi: ${u.bestFloor}`,
        `${rankFor(u.bestFloor)} — Rank kamu`,
        "",
        `🌬️ Nafas: ${u.nafas}/${NAFAHS_MAX} (+1 tiap 5 menit)`,
        `💎 Permata: ${u.permata}`,
        `♻️ Rebirth: ${u.rebirths} (+${(u.rebirths || 0) * 10}% EXP permanen)`,
        `📅 Daily streak: ${u.dailyStreak} hari`,
      ].join("\n"),
    }));
  }

  if (sub === "rank" || sub === "top") {
    const db = getDatabase();
    const all = Object.entries(db.data?.menara?.perUser || {})
      .map(([jid, u]) => ({ jid, ...u }))
      .sort((a, b) => b.bestFloor - a.bestFloor || b.permata - a.permata)
      .slice(0, 10);
    const body = all.length
      ? all.map((r, i) => `${i + 1}. @${r.jid.split("@")[0]}\n   🏰 Lantai ${r.bestFloor} · ${rankFor(r.bestFloor)} · 💎 ${r.permata} · ♻️ ${r.rebirths}`).join("\n\n")
      : "Belum ada petualang yang tercatat! Ketik .menara";
    return m.reply(novaGameBox({ title: "menara", icon: "🏆", flavor: "🏆 *PAPAN PETUALANG MENARA*", body }));
  }

  if (sub === "daily") {
    let u = ensureUser(m);
    if (!u) return m.reply(novaGameBox({ title: "menara", icon: "🏗️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Mulai pendakian dulu: ketik .menara" }));
    const today = todayWib();
    if (u.lastDaily === today) return m.reply(novaGameBox({ title: "menara", icon: "📅", flavor: "📅 *SUDAH DIKLAIM!*", body: "Bonus harian hari ini sudah kamu ambil. Kembali besok!" }));
    u.dailyStreak = (u.lastDaily === yesterdayWib()) ? (u.dailyStreak || 0) + 1 : 1;
    u.lastDaily = today;
    u.permata += 1;
    const gold = 30 + (u.dailyStreak - 1) * 5;
    try { addGold(m, gold); } catch {}
    saveDb();
    return m.reply(novaGameBox({
      title: "menara", icon: "📅",
      flavor: "📅 *BONUS HARIAN!*",
      body: [
        `🎁 +1 💎 permata · +${gold} gold`,
        `🔥 Streak: ${u.dailyStreak} hari (+${(u.dailyStreak - 1) * 5} gold bonus streak)`,
        "",
        "Makin rajin klaim, makin gemuk bonusnya!",
      ].join("\n"),
    }));
  }

  if (sub === "rebirth") {
    let u = ensureUser(m);
    if (!u) return m.reply(novaGameBox({ title: "menara", icon: "♻️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Mulai pendakian dulu: ketik .menara" }));
    if (u.bestFloor < MAX_FLOOR) {
      return m.reply(novaGameBox({ title: "menara", icon: "♻️", flavor: "🔒 *BELUM SIAP!*", body: `Rebirth terbuka setelah mencapai puncak lantai ${MAX_FLOOR}. Lantai tertinggimu: ${u.bestFloor}.` }));
    }
    u.rebirths += 1;
    u.floor = 1;
    u.nafas = NAFAHS_MAX;
    saveDb();
    endSession(m, m.chat);
    return m.reply(novaGameBox({
      title: "menara", icon: "♻️",
      flavor: "♻️ *REBIRTH BERHASIL!*",
      body: [
        `🌟 Menara mereset, tapi kamu kembali lebih kuat!`,
        `♻️ Rebirth ke-${u.rebirths} — semua EXP dari pendakian +${(u.rebirths * 10)}% permanen`,
        `🏰 Lantai: 1 — Rank all-time tetap ${rankFor(u.bestFloor)}`,
        "",
        `Ketik .menara untuk memulai babak baru!`,
      ].join("\n"),
    }));
  }

  // ── MULAI / LANJUT PENDAKIAN ──
  if (sessions.get(m.chat)) {
    return m.reply(novaGameBox({ title: "menara", icon: "⏳", flavor: "⏳ *PENDAKIAN SEDANG BERJALAN!*", body: "Pintu di chat ini lagi dibuka. Balas teka-tekinya atau .menara stop" }));
  }

  let u = ensureUser(m);
  let isNew = false;
  if (!u) { u = newUser(m); isNew = true; saveDb(); }

  // nafas
  if ((u.nafas || 0) < 1) {
    const mins = Math.ceil((NAFAHS_REGEN_S - ((Math.floor(Date.now() / 1000) - (u.nafasAt || 0)) % NAFAHS_REGEN_S)) / 60);
    return m.reply(novaGameBox({ title: "menara", icon: "🌬️", flavor: "😮‍💨 *NAFASMU HABIS!*", body: `Nafasmu habis (${u.nafas}/${NAFAHS_MAX}). Rehat dulu — nafas pulih +1 tiap 5 menit (kurang lebih ${mins} menit lagi). Ketik .menara daily buat bonus sambil nunggu!` }));
  }
  u.nafas -= 1;
  u.nafasAt = Math.floor(Date.now() / 1000);
  saveDb();

  const s = { chat: m.chat, player: m.sender, user: u, usedIds: new Set(), bossStage: u.floor % 10 === 0 ? 1 : 0, hintUsed: false, correct: 0, lastAnswerAt: 0 };
  sessions.set(m.chat, s);
  if (m.react) { try { await m.react("🧠"); } catch {} }

  if (isNew) {
    // starter pack + onboarding
    u.permata += 3;
    try { addGold(m, 50); } catch {}
    saveDb();
    return m.reply(novaGameBox({
      title: "menara", icon: "🏗️",
      flavor: "🏗️ *SELAMAT DATANG DI MENARA SERIBU PINTU!*",
      body: [
        `Jauh di kejauhan berdiri menara 100 lantai. Tiap lantai dikunci SATU teka-teki, tiap lantai dunianya berganti acak — dari 🌲 Hutan Bayangan sampai 🌌 Pintu Bintang Jatuh.`,
        "",
        `🎯 Cara main:`,
        `1. Baca teka-teki pintu, balas jawabanmu langsung`,
        `2. Benar = naik 1 lantai · Salah = jatuh 2 lantai`,
        `3. Tiap lantai ke-10: 🧙 Gerbang Sang Bijak (2 teka-teki, reward ×3)`,
        `4. Nafas habis? Rehat — pulih 1 tiap 5 menit`,
        "",
        `🎁 STARTER PACK: +3 💎 permata · +50 gold`,
        `💡 .menara hint (30 gold / 1 permata) · 📅 .menara daily · 📊 .menara status`,
        "",
        `Pintu pertamamu menanti…`,
        "",
        doorText(s, (s.current = pickPuzzle(s.usedIds, u.floor)), ""),
      ].join("\n"),
    }));
  }

  s.current = pickPuzzle(s.usedIds, u.floor);
  return m.reply(novaGameBox({
    title: "menara", icon: "🧗",
    flavor: "🧗 *PENDAKIAN DILANJUTKAN!*",
    body: doorText(s, s.current, `Progresmu tersimpan permanen — lantai ${u.floor} (tertinggi: ${u.bestFloor}, ${rankFor(u.bestFloor)}).`),
  }));
}

export { handler, loadPuzzles };
export const pluginConfig = {
  name: ["menara", "menaraseribupintu", "towerpuzzle"],
  type: "rpg",
  description: "Menara Seribu Pintu — petualangan teka-teki per lantai, 100 lantai, boss tiap 10, tema dunia acak",
  usage: ".menara | .menara hint | .menara daily | .menara status | .menara rank | .menara rebirth | .menara stop",
  isOwner: false,
  premium: false,
  group: false,
};
export { pluginConfig as config };
