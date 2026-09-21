// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// quizarena.js — ARENA KUIS RPG: jawaban soal = senjata! (request owner 21 Sep 2026)
// Bank soal 2003 (src/data/arenakuis.json, generator test/quizarena-e2e/generate.mjs).
// MODE SOLO: tiap wave 1 soal — jawab BENAR = damage ke musuh, SALAH/timeout =
// musuh nyerang. Tiap wave ke-10 BOSS (HP ×2.5, reward ×5).
// HP player 100 + level×5; mati → run over, gold/EXP hasil s/d wave itu tetap.
// MODE PVP: .kuisarena pvp @user — soal sama, jawab benar duluan = damage ke lawan.
// Reward numpang ekonomi RPG: addExpWithLevelCheck + addGameCash.
// Rekor persist db.data.quizarena: bestWave/bestStreak/totalCorrect + .kuisarena rank.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox } from "../../src/lib/nova-games.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { addGameCash, ensureRpg } from "../../src/lib/nova-rpg-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── knob (env override buat test) ──
const Q_MS = Number(process.env.QUIZARENA_Q_MS) || 25000; // 25 dtk per soal
const BOSS_EVERY = Number(process.env.QUIZARENA_BOSS_EVERY) || 10;
const MAX_WAVE = Number(process.env.QUIZARENA_MAX_WAVE) || 200;

// ── data soal ──
const DATA_PATH = path.join(__dirname, "..", "..", "src", "data", "arenakuis.json");
let _cache = null;
function loadSoal() {
  if (_cache) return _cache;
  _cache = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  return _cache;
}
export function _invalidateSoalCache() { _cache = null; }
export function _setSoalSourceForTest(list) { _cache = list; }

// ── musuh arena ──
const FOES = ["Goblin Kurus", "Slime Lapar", "Serigala Abu", "Kobra Pasir", "Golem Kerikil", "Harpi Gunung", "Bandit Kuis", "Dukun Otak", "Labah Tanya", "Necro Soal", "Ksatria Tidur", "Kucing Algebra"];
const BOSSES = ["Minotaur Simbolis", "Titan Fisika", "Naga Geometri", "Raja Logika", "Kalkulator Gila", "Guru Sejarah Agung", "Dewa Deret", "Malaikat Matematika"];
const isBoss = (wave) => wave % BOSS_EVERY === 0;
const foeFor = (wave) => (isBoss(wave) ? BOSSES[Math.floor(wave / BOSS_EVERY - 1) % BOSSES.length] : FOES[(wave - 1) % FOES.length]);
const enemyHpFor = (wave, lvl) => Math.round((60 + wave * 18 + (lvl || 1) * 10) * (isBoss(wave) ? 2.5 : 1));

// ── sesi ──
const sessions = new Map();
export function _getSessionsForTest() { return sessions; }

// ── rekor persist ──
function ensureRecords() {
  const db = getDatabase();
  if (!db.data.quizarena) db.data.quizarena = { perUser: {} };
  return db.data.quizarena;
}
function recordRun(m, wave, streak, correct) {
  try {
    const rec = ensureRecords();
    const u = rec.perUser[m.sender] || { bestWave: 0, bestStreak: 0, totalCorrect: 0, runs: 0 };
    u.bestWave = Math.max(u.bestWave, wave);
    u.bestStreak = Math.max(u.bestStreak, streak);
    u.totalCorrect += correct;
    u.runs += 1;
    rec.perUser[m.sender] = u;
    getDatabase().save();
    return u;
  } catch { return null; }
}

// ── 1 soal: shuffle opsi A-D ──
function buildQuestion(usedIds) {
  const bank = loadSoal();
  let q;
  for (let tries = 0; tries < 50; tries++) {
    q = bank[Math.floor(Math.random() * bank.length)];
    if (!usedIds.has(q.id)) break;
  }
  usedIds.add(q.id);
  const opts = [q.a, ...q.w];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, opts, key: opts.indexOf(q.a) };
}

const LETTERS = ["A", "B", "C", "D"];
const hpBar = (hp, max) => {
  const full = Math.max(0, Math.min(10, Math.round((hp / max) * 10)));
  return "▰".repeat(full) + "▱".repeat(10 - full);
};

function qText(s, q) {
  const head = s.mode === "pvp"
    ? [`⚔️ DUEL KUIS — ${s.players[0].name} 🆚 ${s.players[1].name}`,
       `❤️ ${s.players[0].name}: ${hpBar(s.players[0].hp, 100)} ${s.players[0].hp}/100`,
       `❤️ ${s.players[1].name}: ${hpBar(s.players[1].hp, 100)} ${s.players[1].hp}/100`]
    : [`⚔️ WAVE ${s.wave} — ${foeFor(s.wave).toUpperCase()}${isBoss(s.wave) ? " 👑 BOSS" : ""}`,
       `😈 ${foeFor(s.wave)}: ${hpBar(s.enemyHp, s.enemyMax)} ${s.enemyHp}/${s.enemyMax}`,
       `❤️ Kamu: ${hpBar(s.hp, s.hpMax)} ${s.hp}/${s.hpMax}`,
       `🔥 Streak: ${s.streak}`];
  return [
    ...head,
    "",
    `❓ [${q.cat}] ${q.q}`,
    "",
    ...q.opts.map((o, i) => `${LETTERS[i]}. ${o}`),
    "",
    `✍️ Balas A/B/C/D — ⏱️ ${Math.round(Q_MS / 1000)} detik!`,
  ].join("\n");
}

function ask(m, sock, s, prefix) {
  clearTimeout(s.timer);
  s.timer = setTimeout(() => onTimeout(m, sock, s), Q_MS);
  return (prefix ? sock.sendMessage(m.chat, { text: novaGameBox({ title: "kuisarena", icon: prefix.icon, flavor: prefix.flavor, body: prefix.body }) }).catch(() => {}).then(() => sock.sendMessage(m.chat, { text: novaGameBox({ title: "kuisarena", icon: "⚔️", flavor: `🎯 *RONDE ${s.round}!*`, body: qText(s, s.current) }) }).catch(() => {})) : sock.sendMessage(m.chat, { text: novaGameBox({ title: "kuisarena", icon: "⚔️", flavor: `🎯 *RONDE ${s.round}!*`, body: qText(s, s.current) }) }).catch(() => {}));
}

function advance(m, sock, s) {
  // lanjut ronde berikutnya (solo: musuh baru; pvp: soal baru)
  if (s.mode === "solo") {
    s.wave++;
    s.round++;
    s.enemyMax = enemyHpFor(s.wave, s.lvl);
    s.enemyHp = s.enemyMax;
  } else {
    s.round++;
  }
  if (s.mode === "solo" && s.wave > MAX_WAVE) return endRun(m, sock, s, "🏆 Kamu MENAKLUKKAN seluruh arena! Luar biasa!");
  s.current = buildQuestion(s.usedIds);
  s.answeredThisRound = new Set();
  return ask(m, sock, s);
}

// ── reward numpang RPG (per kill musuh / per ronde pvp) ──
function grantKillReward(m, s) {
  const boss = s.mode === "solo" && isBoss(s.wave);
  const exp = boss ? 25 * s.wave : 4 * s.wave;
  const cash = addGameCash(m, boss ? 10 * s.wave : 2 * s.wave);
  let lvlUp = null;
  try { lvlUp = addExpWithLevelCheck(m, exp); } catch {}
  return { exp, cashGain: cash?.gain || 0, lvlUp };
}

// ── selesai run solo ──
function endRun(m, sock, s, closing) {
  clearTimeout(s.timer);
  sessions.delete(m.chat);
  recordRun(m, s.wave, s.bestStreak, s.correct);
  const body = [
    closing,
    "",
    `📊 Wave dicapai: ${s.wave}`,
    `✅ Jawaban benar: ${s.correct}`,
    `🔥 Streak terbaik: ${s.bestStreak}`,
    `💰 EXP dikumpulkan: ${s.expGained}`,
    `💵 Uang dikumpulkan: ${s.cashGained}`,
  ].join("\n");
  return sock.sendMessage(m.chat, { text: novaGameBox({ title: "kuisarena", icon: "🏁", flavor: "🏁 *RUN SELESAI!*", body }) }).catch(() => {});
}

// ── timeout ronde ──
function onTimeout(m, sock, s) {
  if (sessions.get(m.chat) !== s) return;
  s.streak = 0;
  if (s.mode === "solo") {
    const dmg = 8 + s.wave * 2;
    s.hp -= dmg;
    if (s.hp <= 0) return endRun(m, sock, s, `⏰ Waktu habis! ${foeFor(s.wave)} nyerang ${dmg} damage — kamu tumbang di wave ${s.wave}!`);
    return advance(m, sock, s, { icon: "⏰", flavor: "❌ *WAKTU HABIS!*", body: `Jawaban benar: ${s.current.a}\n💥 ${foeFor(s.wave)} nyerang ${dmg} damage!` });
  }
  return advance(m, sock, s, { icon: "⏰", flavor: "⏳ *RONDE SERI!*", body: `Waktu habis! Jawaban benar: ${s.current.a}` });
}

// ── jawaban masuk (huruf A-D / 1-4) ──
export async function answerHandler(m, sock) {
  const s = sessions.get(m.chat);
  if (!s || !s.current) return false;
  const raw = String(m.text || "").trim().toLowerCase();
  if (!raw) return false;
  const letterIdx = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 }[raw];
  if (letterIdx === undefined) return false;
  if (s.answeredThisRound?.has(m.sender)) return true; // 1 jawab per ronde per orang
  s.answeredThisRound.add(m.sender);

  const q = s.current;
  const benar = letterIdx === q.key;
  if (m.react) { try { await m.react(benar ? "⚡" : "❌"); } catch {} }

  if (s.mode === "solo") {
    if (benar) {
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak || 0, s.streak);
      s.correct++;
      const dmg = 20 + s.lvl * 3 + s.streak * 2 + (isBoss(s.wave) ? 15 : 0);
      s.enemyHp -= dmg;
      if (s.enemyHp <= 0) {
        const r = grantKillReward(m, s);
        s.expGained += r.exp;
        s.cashGained += r.cashGain;
        const boss = isBoss(s.wave);
        if (s.hp < s.hpMax) { s.hp = Math.min(s.hpMax, s.hp + 10); } // regen tiap kill
        return advance(m, sock, s, { icon: "🛡️", flavor: `💀 *${foeFor(s.wave).toUpperCase()} TUMBANG!*`, body: `✅ ${q.a}\n💥 Damage ${dmg}${boss ? `\n👑 BOSS kalah! Bonus ×5` : ""}\n🎁 +${r.exp} EXP, +${r.cashGain} uang${r.lvlUp ? "\n🎊 LEVEL UP!" : ""}\n❤️ +10 HP regen` });
      }
      // musuh masih hidup → soal baru, wave sama
      s.round++;
      s.current = buildQuestion(s.usedIds);
      s.answeredThisRound = new Set();
      return ask(m, sock, s, { icon: "⚡", flavor: "⚔️ *KENA! LANJUT!*", body: `✅ ${q.a}\n💥 Damage ${dmg} — musuh sisa ${Math.max(0, s.enemyHp)} HP` });
    }
    // salah
    s.streak = 0;
    const dmg = 8 + s.wave * 2;
    s.hp -= dmg;
    if (s.hp <= 0) return endRun(m, sock, s, `❌ Salah! ${foeFor(s.wave)} nyerang ${dmg} damage — kamu tumbang di wave ${s.wave}!`);
    s.round++;
    s.current = buildQuestion(s.usedIds);
    s.answeredThisRound = new Set();
    return ask(m, sock, s, { icon: "❌", flavor: "❌ *SALAH!*", body: `Jawaban benar: ${q.a}\n💥 ${foeFor(s.wave)} nyerang ${dmg} damage!` });
  }

  // ── PVP ──
  const attacker = s.players.find((p) => p.jid === m.sender);
  if (!attacker) return true; // penonton nyoba jawab → diabaikan (tapi consume)
  const defender = s.players.find((p) => p.jid !== m.sender);
  if (benar) {
    s.streak++;
    s.correct++;
    defender.hp -= 20;
    if (defender.hp <= 0) {
      clearTimeout(s.timer);
      sessions.delete(m.chat);
      try { recordRun({ sender: attacker.jid, }, 0, s.streak, 1); } catch {}
      const r = grantKillReward({ sender: attacker.jid, }, { wave: 5, });
      const body = [
        `🏆 ${attacker.name} MENANG duel kuis!`,
        "",
        `✅ Jawaban: ${q.a}`,
        `🎁 +${r.exp} EXP, +${r.cashGain} uang`,
        `📊 Total ronde: ${s.round}`,
      ].join("\n");
      return sock.sendMessage(m.chat, { text: novaGameBox({ title: "kuisarena", icon: "🏆", flavor: "🏆 *DUEL SELESAI!*", body }) }).catch(() => {});
    }
    s.round++;
    s.current = buildQuestion(s.usedIds);
    s.answeredThisRound = new Set();
    return ask(m, sock, s, { icon: "⚡", flavor: `⚔️ *${attacker.name.toUpperCase()} KENA!*`, body: `✅ ${q.a}\n💥 ${defender.name} terkena 20 damage — sisa ${defender.hp} HP` });
  }
  // salah di pvp: gak dikonsumsi pelanggaran — orang yang sama boleh coba lagi? tidak: 1x per ronde
  const bothAnswered = s.answeredThisRound.size >= 2;
  if (bothAnswered) return advance(m, sock, s, { icon: "❌", flavor: "⏳ *RONDE SERI!*", body: `Dua-duanya meleset! Jawaban benar: ${q.a}` });
  return sock.sendMessage(m.chat, { text: novaGameBox({ title: "kuisarena", icon: "❌", flavor: "❌ *MELESET!*", body: `${attacker.name} salah! ${defender.name} masih punya kesempatan…` }) }).catch(() => {});
}

// ── command .kuisarena ──
async function handler(m, { sock, config }) {
  const sub = (m.args?.[0] || "").toLowerCase();

  if (sessions.get(m.chat)) {
    if (sub !== "stop") return m.reply(novaGameBox({ title: "kuisarena", icon: "⚔️", flavor: "⏳ *GAME SEDANG BERJALAN!*", body: "Arena kuis lagi jalan di chat ini! Balas soalnya (A/B/C/D) atau ketik .kuisarena stop" }));
    const s = sessions.get(m.chat);
    clearTimeout(s.timer);
    sessions.delete(m.chat);
    if (s.mode === "solo") recordRun(m, s.wave, s.bestStreak, s.correct);
    return m.reply(novaGameBox({ title: "kuisarena", icon: "🛑", flavor: "🛑 *ARENA DIBUBARKAN!*", body: s.mode === "solo" ? `Berhenti di wave ${s.wave}. Sampai jumpa lagi!` : "Duel dibatalkan." }));
  }

  if (sub === "stop") return m.reply(novaGameBox({ title: "kuisarena", icon: "🤔", flavor: "❓ *GAK ADA GAME!*", body: "Belum ada arena kuis yang jalan di chat ini!" }));

  if (sub === "rank" || sub === "top") {
    const rec = ensureRecords();
    const rows = Object.entries(rec.perUser)
      .map(([jid, u]) => ({ jid, ...u }))
      .sort((a, b) => b.bestWave - a.bestWave || b.bestStreak - a.bestStreak)
      .slice(0, 10);
    const body = rows.length
      ? rows.map((r, i) => `${i + 1}. @${r.jid.split("@")[0]}\n   🏰 Wave ${r.bestWave} · 🔥 ${r.bestStreak} · ✅ ${r.totalCorrect}`).join("\n\n")
      : "Belum ada yang berani masuk arena! Ketik .kuisarena";
    return m.reply(novaGameBox({ title: "kuisarena", icon: "🏆", flavor: "🏆 *TOP PETARUNG ARENA*", body }));
  }

  if (sub === "stat" || sub === "status") {
    const bank = loadSoal();
    const rec = ensureRecords();
    const totalRuns = Object.values(rec.perUser).reduce((a, u) => a + u.runs, 0);
    const best = Object.values(rec.perUser).reduce((a, u) => Math.max(a, u.bestWave), 0);
    const cats = {};
    for (const q of bank) cats[q.cat] = (cats[q.cat] || 0) + 1;
    return m.reply(novaGameBox({
      title: "kuisarena", icon: "📊",
      flavor: "📊 *ARENA KUIS RPG*",
      body: [
        `📚 Bank soal: ${bank.length}`,
        ...Object.entries(cats).map(([k, v]) => `   • ${k}: ${v}`),
        "",
        `🎮 Total run semua pemain: ${totalRuns}`,
        `🏰 Wave tertinggi: ${best}`,
        "",
        `⚔️ .kuisarena — mulai solo`,
        `🤜 .kuisarena pvp @user — duel`,
        `🏆 .kuisarena rank — papan juara`,
      ].join("\n"),
    }));
  }

  // ── MODE PVP ──
  if (sub === "pvp" || sub === "duel") {
    const target = (m.mentionedJid?.length ? m.mentionedJid : null) || null;
    if (!target || !target.length) return m.reply(novaGameBox({ title: "kuisarena", icon: "🤜", flavor: "❓ *FORMAT SALAH!*", body: "Tag lawanmu! Contoh: .kuisarena pvp @user" }));
    if (target[0] === m.sender) return m.reply(novaGameBox({ title: "kuisarena", icon: "🤦", flavor: "😅 *SENDIRI?*", body: "Gak bisa duel sama diri sendiri!" }));
    if (target[0] === (config?.botNumber || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net") return m.reply(novaGameBox({ title: "kuisarena", icon: "🤖", flavor: "🤖 *MELAWAN BOT?*", body: "Duel lawan manusia aja kak!" }));
    const name = (jid) => (jid === m.sender ? (m.pushName || "Kamu") : "@" + jid.split("@")[0]);
    const s = {
      mode: "pvp", chat: m.chat,
      players: [{ jid: m.sender, name: name(m.sender), hp: 100 }, { jid: target[0], name: name(target[0]), hp: 100 }],
      round: 1, streak: 0, bestStreak: 0, correct: 0, usedIds: new Set(), answeredThisRound: new Set(),
    };
    s.current = buildQuestion(s.usedIds);
    sessions.set(m.chat, s);
    if (m.react) { try { await m.react("🧠"); } catch {} }
    return sock.sendMessage(m.chat, {
      text: novaGameBox({ title: "kuisarena", icon: "⚔️", flavor: "🤜 *DUEL KUIS DIMULAI!*", body: qText(s, s.current) }),
      mentions: target,
    }).catch(() => {});
  }

  // ── MODE SOLO (default) ──
  const rpg = ensureRpg(m);
  const lvl = rpg?.level || 1;
  const s = {
    mode: "solo", chat: m.chat,
    hp: 100 + lvl * 5, hpMax: 100 + lvl * 5,
    wave: 1, round: 1, streak: 0, bestStreak: 0, correct: 0,
    enemyMax: enemyHpFor(1, lvl), enemyHp: enemyHpFor(1, lvl),
    usedIds: new Set(), answeredThisRound: new Set(), lvl,
    expGained: 0, cashGained: 0,
  };
  s.current = buildQuestion(s.usedIds);
  sessions.set(m.chat, s);
  if (m.react) { try { await m.react("🧠"); } catch {} }
  return m.reply(novaGameBox({ title: "kuisarena", icon: "⚔️", flavor: "⚔️ *ARENA KUIS DIMULAI!*", body: qText(s, s.current) }));
}

export { handler, loadSoal };
export const pluginConfig = {
  name: ["kuisarena", "arenakuis", "quizarena", "petualangkuis"],
  type: "rpg",
  description: "Arena Kuis RPG — jawaban soal = senjata! Solo wave + boss tiap 10, duel PVP",
  usage: ".kuisarena | .kuisarena pvp @user | .kuisarena rank | .kuisarena stat | .kuisarena stop",
  isOwner: false,
  premium: false,
  group: false,
};
export { pluginConfig as config };
