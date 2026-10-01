// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// detektif.js — RARA DETEKTIF: Kasus Kriminal Kota (request owner 21 Sep 2026, standar Game Designer)
// Solo, hybrid: jelajah lokasi (.pergi), cari bukti (.cari), interogasi per topik (.interogasi/.tanya),
// teka-teki lockbox (.jawab), deduksi final (.tuduh). 8 kasus berlapis tier (src/data/detektif-cases.json).
// Risiko-reward: salah tuduh -50 gold & wrongStreak (pity clue di 3 salah berturut); perfect solve (semua bukti
// kunci + tanpa salah tuduh + tanpa hint) = EXP ×2 + 1 kopi. Crit Intuisi 10% saat .cari.
// Energi 10 max regen 1/5 mnt (pergi -2, cari/interogasi -1). Kopi: beli hint (1 kopi / 30 gold), minum +5 energi.
// Rank: 🕵️ Magang → 🎖️ Inspektur → 🥇 Detektif Senior → 👑 Komisaris → 🪙 Legenda Kriminal.
// Prestige: 20 kasus → .sangdetektif rebirth (+10% EXP permanen per rebirth). State persist db.data.detektif.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraGameBox } from "../../src/lib/rara-games.js";
import { playSiramAnim } from "../../src/lib/libanimationrpg/libmasterdetectiverpg.js";
import { addExpWithLevelCheck } from "../../src/lib/rara-level.js";
import { addGameCash, addGold, removeGold } from "../../src/lib/rara-rpg-service.js";
import { normalizeAnswer } from "../../src/lib/rara-game-engine.js";
import { getLocalDateObject } from "../../src/lib/rara-time.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── knob (env override buat test) ──
const ENERGI_MAX = process.env.DETEKTIF_ENERGI_MAX !== undefined ? Number(process.env.DETEKTIF_ENERGI_MAX) : 10;
const ENERGI_REGEN_S = process.env.DETEKTIF_REGEN_S !== undefined ? Number(process.env.DETEKTIF_REGEN_S) : 300; // 1 energi / 5 mnt
const COST_PERGI = 2, COST_CARI = 1, COST_TANYA_SUS = 1;
const ANIM_FRAME_MS = process.env.DETEKTIF_ANIM_MS !== undefined ? Number(process.env.DETEKTIF_ANIM_MS) : 700;
const WRONG_ACCUSE_GOLD = 50;
const HINT_GOLD = 30;
const CRIT_CHANCE = process.env.DETEKTIF_CRIT !== undefined ? Number(process.env.DETEKTIF_CRIT) : 0.1;
const REBIRTH_AT = 20; // total kasus selesai buat buka rebirth
const ANSWER_CD_MS = process.env.DETEKTIF_ANSWER_CD_MS !== undefined ? Number(process.env.DETEKTIF_ANSWER_CD_MS) : 2000;

// ── bank kasus ──
const DATA_PATH = path.join(__dirname, "..", "..", "src", "data", "detektif-cases.json");
let _cache = null;
function loadCases() {
  if (_cache) return _cache;
  _cache = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  return _cache;
}
export function _setCaseSourceForTest(list) { _cache = list; }

// ── state user persisten ──
function ensureUser(m) {
  const db = getDatabase();
  if (!db.data.detektif) db.data.detektif = { users: {} };
  let u = db.data.detektif.users[m.sender];
  if (!u) return null;
  // regen energi
  const nowS = Math.floor(Date.now() / 1000);
  const gained = Math.floor((nowS - (u.energiAt || nowS)) / ENERGI_REGEN_S);
  if (gained > 0 && (u.energi || 0) < ENERGI_MAX) {
    u.energi = Math.min(ENERGI_MAX, (u.energi || 0) + gained);
    u.energiAt = nowS;
  }
  return u;
}
function newUser(m) {
  const db = getDatabase();
  if (!db.data.detektif) db.data.detektif = { users: {} };
  const u = {
    casesSolved: 0, solvedTotal: 0, usedCases: { "1": [], "2": [], "3": [] },
    active: null, energi: ENERGI_MAX, energiAt: Math.floor(Date.now() / 1000),
    kopi: 0, rebirths: 0, dailyStreak: 0, lastDaily: "", wrongStreak: 0, firstTime: true,
  };
  db.data.detektif.users[m.sender] = u;
  return u;
}
function saveDb() { try { getDatabase().save(); } catch {} }

const tierFor = (solvedTotal) => solvedTotal < 3 ? 1 : solvedTotal < 6 ? 2 : 3;
const rebirthBonus = (r) => 1 + (r || 0) * 0.1;
function rankFor(solvedTotal) {
  if (solvedTotal >= 20) return "🪙 Legenda Kriminal (Mitos)";
  if (solvedTotal >= 15) return "👑 Komisaris (Legendary)";
  if (solvedTotal >= 10) return "🥇 Detektif Senior (Epic)";
  if (solvedTotal >= 5) return "🎖️ Inspektur (Rare)";
  return "🕵️ Magang (Common)";
}

function pickCase(u) {
  const bank = loadCases();
  const tier = tierFor(u.solvedTotal);
  const used = new Set([...(u.usedCases[String(tier)] || []), ...(u.active?.caseId ? [u.active.caseId] : [])]);
  let pool = bank.filter((c) => c.tier === tier && !used.has(c.id));
  if (!pool.length) { u.usedCases[String(tier)] = []; pool = bank.filter((c) => c.tier === tier); }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── helper kasus aktif ──
const caseOf = (u) => (u.active ? loadCases().find((c) => c.id === u.active.caseId) : null);
const evIn = (c, id) => c.evidence.find((e) => e.id === id);

function fuzzySus(c, q) {
  const n = normalizeAnswer(q);
  if (/^\d+$/.test(n)) { const i = Number(n) - 1; return c.suspects[i] || null; }
  return c.suspects.find((s) => normalizeAnswer(s.name).includes(n)) || null;
}
function fuzzyLoc(c, q) {
  const n = normalizeAnswer(q);
  if (/^\d+$/.test(n)) { const i = Number(n) - 1; return c.locations[i] || null; }
  return c.locations.find((l) => normalizeAnswer(l.name).includes(n)) || null;
}

function spendEnergi(u, n) {
  if ((u.energi || 0) < n) return false;
  u.energi -= n;
  u.energiAt = Math.floor(Date.now() / 1000);
  return true;
}

function fileText(u, c) {
  const a = u.active;
  const locs = c.locations.map((l, i) => `${l.emoji} ${i + 1}. ${l.name}${a.visited.includes(l.id) ? " ✓" : ""}`).join("\n");
  const suss = c.suspects.map((s, i) => `${s.emoji} ${i + 1}. ${s.name} — ${s.role}`).join("\n");
  return [
    `📁 Kasus: ${c.title}`,
    "",
    `🗺️ LOKASI (${a.visited.length}/${c.locations.length} dikunjungi):`,
    locs,
    "",
    `👤 TERSANGKA:`,
    suss,
    "",
    `🔎 Bukti terkumpul: ${a.evidence.length}${c.evidence.length ? "/" + c.evidence.length : ""} · ❌ Salah tuduh: ${a.wrongAccuse}`,
    `⚡ Energi: ${u.energi}/${ENERGI_MAX} · ☕ Kopi: ${u.kopi}`,
    "",
    `Aksi: .sangdetektif pergi <no/lokasi> · .sangdetektif cari · .sangdetektif interogasi <no/nama> · .sangdetektif bukti · .sangdetektif tuduh <no/nama>`,
  ].join("\n");
}

// ── handler ──

// ── 🎬 ANIMASI KHAS DETEKTIF: SIRAM LOKASI ──
// Mode "cari": kaca pembesar 🔍 menyisir sektor objek, jejak ✨ terungkap satu per satu.
// Mode "pergi": detektif 🚶 melintas kota menuju lokasi, jejak 👣 bekas langkah.
// KHUSUS detektif (aturan "beda game beda animasi") — beda dari crosshair berburu & selam palung.
// ── 🎬 ANIMASI dimuat dari lib libmasterdetectiverpg.js (siram lokasi 🚶/🔍) ──
async function playDetektifAnim(m, sock, opts) {
  await playSiramAnim(sock, m.chat, opts, ANIM_FRAME_MS);
}

async function handler(m, { sock, config }) {
  const sub = (m.args?.[0] || "").toLowerCase();
  const rest = (m.args || []).slice(1).join(" ");
  let u = ensureUser(m);

  // ── daily ──
  if (sub === "daily") {
    if (!u) return m.reply(raraGameBox({ title: "detektif", icon: "🕵️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Mulai kariermu dulu: ketik .sangdetektif" }));
    const now = getLocalDateObject ? getLocalDateObject() : new Date();
    const today = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
    if (u.lastDaily === today) return m.reply(raraGameBox({ title: "detektif", icon: "📅", flavor: "📅 *SUDAH DIKLAIM!*", body: "Bonus harian detektif hari ini sudah diambil. Kembali besok!" }));
    const y = getLocalDateObject ? getLocalDateObject() : new Date();
    y.setDate(y.getDate() - 1);
    u.dailyStreak = u.lastDaily === `${y.getDate()}-${y.getMonth() + 1}-${y.getFullYear()}` ? (u.dailyStreak || 0) + 1 : 1;
    u.lastDaily = today;
    u.kopi += 1;
    const gold = 20 + (u.dailyStreak - 1) * 5;
    try { addGold(m, gold); } catch {}
    saveDb();
    return m.reply(raraGameBox({ title: "detektif", icon: "📅", flavor: "📅 *BONUS HARIAN DETEKTIF!*", body: `☕ +1 kopi · 🪙 +${gold} gold\n🔥 Streak: ${u.dailyStreak} hari (bonus +${(u.dailyStreak - 1) * 5} gold)\n\nKopi bisa buat beli hint (1 kopi) atau diminum buat +5 energi.` }));
  }

  // ── status ──
  if (sub === "status") {
    if (!u) return m.reply(raraGameBox({ title: "detektif", icon: "🕵️", flavor: "🕵️ *RARA DETEKTIF*", body: "Kamu belum punya lisensi detektif! Ketik .sangdetektif untuk mulai — pemain baru dapat starter pack 100 gold + 2 kopi." }));
    const c = caseOf(u);
    return m.reply(raraGameBox({
      title: "detektif", icon: "🕵️",
      flavor: "🕵️ *LISENSI DETEKTIF*",
      body: [
        `🏅 Rank: ${rankFor(u.solvedTotal)}`,
        `📁 Kasus selesai: ${u.solvedTotal}`,
        ...(c ? ["", `🔎 Kasus aktif: ${c.title} (.sangdetektif kasus)`] : ["", "📭 Belum ada kasus aktif — ketik .sangdetektif"]),
        `⚡ Energi: ${u.energi}/${ENERGI_MAX} (+1 tiap 5 menit) · ☕ Kopi: ${u.kopi}`,
        `♻️ Rebirth: ${u.rebirths} (+${(u.rebirths || 0) * 10}% EXP permanen)`,
        `📅 Daily streak: ${u.dailyStreak} hari`,
      ].join("\n"),
    }));
  }

  // ── rank ──
  if (sub === "rank" || sub === "top") {
    const db = getDatabase();
    const all = Object.entries(db.data?.sangdetektif?.users || {})
      .map(([jid, x]) => ({ jid, ...x }))
      .sort((a, b) => b.solvedTotal - a.solvedTotal || b.kopi - a.kopi)
      .slice(0, 10);
    const body = all.length
      ? all.map((r, i) => `${i + 1}. @${r.jid.split("@")[0]}\n   ${rankFor(r.solvedTotal)} · 📁 ${r.solvedTotal} kasus · ♻️ ${r.rebirths}`).join("\n\n")
      : "Belum ada detektif tercatat! Ketik .sangdetektif";
    return m.reply(raraGameBox({ title: "detektif", icon: "🏆", flavor: "🏆 *PAPAN KANTOR DETEKTIF*", body }));
  }

  // ── kopi (minum +5 energi) ──
  if (sub === "kopi") {
    if (!u) return m.reply(raraGameBox({ title: "detektif", icon: "☕", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .sangdetektif dulu." }));
    if ((u.kopi || 0) < 1) return m.reply(raraGameBox({ title: "detektif", icon: "☕", flavor: "☕ *STOK HABIS!*", body: "Kamu gak punya kopi. Dapatkan dari .sangdetektif daily atau perfect solve (semua bukti kunci + tanpa salah tuduh)." }));
    u.kopi -= 1;
    u.energi = Math.min(ENERGI_MAX, (u.energi || 0) + 5);
    u.energiAt = Math.floor(Date.now() / 1000);
    saveDb();
    return m.reply(raraGameBox({ title: "detektif", icon: "☕", flavor: "☕ *NGOPI SELESAI!*", body: `Energi pulih +5 → ${u.energi}/${ENERGI_MAX}. Sisa kopi: ${u.kopi}. Mata kembali tajam, detektif.` }));
  }

  // ── rebirth ──
  if (sub === "rebirth") {
    if (!u) return m.reply(raraGameBox({ title: "detektif", icon: "♻️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .sangdetektif dulu." }));
    if (u.solvedTotal < REBIRTH_AT) return m.reply(raraGameBox({ title: "detektif", icon: "♻️", flavor: "🔒 *BELUM SIAP!*", body: `Rebirth terbuka setelah ${REBIRTH_AT} kasus selesai. Kamu baru ${u.solvedTotal}.` }));
    u.rebirths += 1;
    u.casesSolved = 0;
    u.usedCases = { "1": [], "2": [], "3": [] };
    u.active = null;
    saveDb();
    return m.reply(raraGameBox({ title: "detektif", icon: "♻️", flavor: "♻️ *LISENSI EMAS!*", body: `Rebirth ke-${u.rebirths}: semua EXP +${u.rebirths * 10}% permanen.\n📁 Kasus tier direset dari awal (rank all-time tetap ${rankFor(u.solvedTotal)}).\n\nKetik .sangdetektif untuk kasus baru.` }));
  }

  // ── stop (kasus dilepas tanpa penalti) ──
  if (sub === "stop" && !["kasus"].includes(rest)) {
    if (!u || !u.active) return m.reply(raraGameBox({ title: "detektif", icon: "🤔", flavor: "❓ *GAK ADA KASUS!*", body: "Belum ada kasus aktif yang bisa dilepas." }));
    const c = caseOf(u);
    u.active = null;
    saveDb();
    return m.reply(raraGameBox({ title: "detektif", icon: "🗂️", flavor: "🗂️ *BERKAS DITUTUP!*", body: `Kasus "${c.title}" dikembalikan ke rak arsip — pelaku menguap, tapi kamu bisa mengejarnya lagi nanti (.sangdetektif akan pilih kasus baru).` }));
  }

  // ══ aksi dalam kasus — butuh kasus aktif ══
  const needCase = ["kasus", "pergi", "cari", "interogasi", "tanya", "bukti", "jawab", "hint", "tuduh"];
  if (needCase.includes(sub)) {
    if (!u || !u.active) {
      return m.reply(raraGameBox({ title: "detektif", icon: "📂", flavor: "📂 *RAK ARSIP KOSONG!*", body: "Belum ada kasus aktif. Ketik .sangdetektif untuk ambil berkas pertama." }));
    }
    const c = caseOf(u);
    const a = u.active;

    if (sub === "kasus") return m.reply(raraGameBox({ title: "detektif", icon: "📁", flavor: `📁 *${c.title.toUpperCase()}*`, body: c.briefing + "\n\n" + fileText(u, c) }));

    if (sub === "pergi") {
      const loc = fuzzyLoc(c, rest);
      if (!loc) return m.reply(raraGameBox({ title: "detektif", icon: "🗺️", flavor: "❓ *LOKASI GAK DITEMUKAN!*", body: "Lokasi sah:\n" + c.locations.map((l, i) => `${i + 1}. ${l.name}`).join("\n") + "\n\nContoh: .sangdetektif pergi 1" }));
      if (!spendEnergi(u, COST_PERGI)) return m.reply(raraGameBox({ title: "detektif", icon: "⚡", flavor: "⚡ *ENERGI HABIS!*", body: `Butuh ${COST_PERGI} energi buat pindah lokasi. Kamu punya ${u.energi}. Regen +1 tiap 5 menit atau minum .sangdetektif kopi (+5).` }));
      if (!a.visited.includes(loc.id)) a.visited.push(loc.id);
      a.curLoc = loc.id;
      a.puzzlePending = null;
      a.curSus = null;
      saveDb();
      await playDetektifAnim(m, sock, { mode: "pergi", locName: loc.name, locEmoji: loc.emoji, tier: tierFor(u.solvedTotal) });
      return m.reply(raraGameBox({
        title: "detektif", icon: loc.emoji,
        flavor: `${loc.emoji} *${loc.name.toUpperCase()}*`,
        body: [
          loc.desc,
          "",
          loc.evidence.length ? "🔎 Ada jejak yang bisa digali — ketik .sangdetektif cari" : "🤷 Gak ada jejak khusus di sini.",
          ...(loc.puzzle && !a.puzzleSolved.includes(loc.id) ? ["🔒 Ada PETI/BRANKAS terkunci — ketik .sangdetektif cari buat periksa"] : []),
        ].join("\n"),
      }));
    }

    if (sub === "cari") {
      const cur = a.curLoc ? c.locations.find((l) => l.id === a.curLoc) : null;
      if (!cur) return m.reply(raraGameBox({ title: "detektif", icon: "🗺️", flavor: "❓ *BELUM ADA LOKASI!*", body: "Pergi dulu: .sangdetektif pergi <no/lokasi>" }));
      if (!spendEnergi(u, COST_CARI)) return m.reply(raraGameBox({ title: "detektif", icon: "⚡", flavor: "⚡ *ENERGI HABIS!*", body: `Butuh ${COST_CARI} energi. Regen +1 tiap 5 menit atau .sangdetektif kopi (+5).` }));
      a.searched = a.searched || [];
      let found = [];
      // puzzle lockbox
      if (cur.puzzle && !a.puzzleSolved.includes(cur.id)) {
        if (!a.puzzlePending) {
          a.puzzlePending = cur.id;
          saveDb();
          await playDetektifAnim(m, sock, { mode: "cari", locName: cur.name, locEmoji: cur.emoji, hasil: "lockbox", tier: tierFor(u.solvedTotal) });
          return m.reply(raraGameBox({ title: "detektif", icon: "🔒", flavor: "🔒 *LOCKBOX DITEMUKAN!*", body: cur.puzzle.q + "\n\n💡 .sangdetektif hint (30 gold / 1 kopi) bantuan kurator\n✍️ Jawab: .sangdetektif jawab <jawabanmu>" }));
        }
        // puzzle masih pending (belum dijawab benar) → bukti dalam tetap terkunci
        saveDb();
        await playDetektifAnim(m, sock, { mode: "cari", locName: cur.name, locEmoji: cur.emoji, hasil: "pending", tier: tierFor(u.solvedTotal) });
        return m.reply(raraGameBox({ title: "detektif", icon: "🔒", flavor: "🔒 *BRANKAS MASIH TERKUNCI!*", body: "Bukti di dalam belum bisa diambil. Pecahkan teka-tekinya dulu: .sangdetektif jawab <jawabanmu>\n\n" + cur.puzzle.q }));
      }
      for (const evId of (cur.evidence || [])) {
        if (!a.evidence.includes(evId)) { a.evidence.push(evId); found.push(evIn(c, evId)); }
      }
      saveDb();
      if (!found.length) {
        await playDetektifAnim(m, sock, { mode: "cari", locName: cur.name, locEmoji: cur.emoji, hasil: "bersih", tier: tierFor(u.solvedTotal) });
        return m.reply(raraGameBox({ title: "detektif", icon: "🔍", flavor: "🔍 *SUDAH BERSIH!*", body: `Gak ada bukti baru di ${cur.name}. Coba lokasi lain.` }));
      }
      // crit Intuisi Detektif
      let critNote = "";
      if (Math.random() < CRIT_CHANCE) {
        const missingKey = c.keyEvidence.filter((k) => !a.evidence.includes(k));
        if (missingKey.length) {
          const loc2 = c.locations.find((l) => (l.evidence || []).includes(missingKey[0]) || (l.puzzle && missingKey[0] === null));
          critNote = `\n\n✨ INTUISI DETEKTIF: instingmu berdesir — bukti kunci kasus ini tersembunyi di sektor "${loc2 ? loc2.name : "yang belum kamu datangi"}".`;
        }
      }
      await playDetektifAnim(m, sock, { mode: "cari", locName: cur.name, locEmoji: cur.emoji, hasil: "temu", tier: tierFor(u.solvedTotal) });
      return m.reply(raraGameBox({
        title: "detektif", icon: "🔍",
        flavor: "🔍 *JEJAK DITEMUKAN!*",
        body: [
          `Di ${cur.name} kamu menemukan:`,
          "",
          ...found.map((e) => `📌 ${e.name}\n   ${e.desc}`),
          critNote,
          "",
          "Lihat semua: .sangdetektif bukti",
        ].filter((x) => x !== "").join("\n"),
      }));
    }

    if (sub === "jawab") {
      if (!a.puzzlePending) return m.reply(raraGameBox({ title: "detektif", icon: "❓", flavor: "❓ *GAK ADA TEKA-TEKI!*", body: "Belum ada lockbox yang sedang kamu pahami. Cari dulu di lokasi yang punya peti terkunci." }));
      const loc = c.locations.find((l) => l.id === a.puzzlePending);
      if (!rest) return m.reply(raraGameBox({ title: "detektif", icon: "✍️", flavor: "✍️ *FORMAT!*", body: ".sangdetektif jawab <jawabanmu>" }));
      if (normalizeAnswer(rest) === normalizeAnswer(loc.puzzle.a)) {
        const puzzleEv = (loc.evidence || []);
        let found = [];
        for (const evId of puzzleEv) { if (!a.evidence.includes(evId)) { a.evidence.push(evId); found.push(evIn(c, evId)); } }
        a.puzzleSolved.push(loc.id);
        a.puzzlePending = null;
        saveDb();
        return m.reply(raraGameBox({ title: "detektif", icon: "🔓", flavor: "🔓 *LOCKBOX TERBUKA!*", body: [...(found.length ? found.map((e) => `📌 ${e.name}\n   ${e.desc}`) : ["Peti kosong — tapi kamu yakin pelakunya pernah ke sini."]), "", "Keren, detektif!"].join("\n") }));
      }
      return m.reply(raraGameBox({ title: "detektif", icon: "❌", flavor: "❌ *KUNCI DITOLAK!*", body: "Brankas masih terkunci. Baca ulang teka-tekinya — atau ketik .sangdetektif hint" }));
    }

    if (sub === "interogasi") {
      const sus = fuzzySus(c, rest);
      if (!sus) return m.reply(raraGameBox({ title: "detektif", icon: "👤", flavor: "❓ *TERSANGKA GAK DITEMUKAN!*", body: "Tersangka:\n" + c.suspects.map((s, i) => `${i + 1}. ${s.name} — ${s.role}`).join("\n") + "\n\nContoh: .sangdetektif interogasi 1" }));
      if (!spendEnergi(u, COST_TANYA_SUS)) return m.reply(raraGameBox({ title: "detektif", icon: "⚡", flavor: "⚡ *ENERGI HABIS!*", body: `Interogasi butuh ${COST_TANYA_SUS} energi. Regen +1 tiap 5 menit atau .sangdetektif kopi (+5).` }));
      a.curSus = sus.id;
      a.asked = a.asked || {};
      saveDb();
      const asked = a.asked[sus.id] || [];
      return m.reply(raraGameBox({
        title: "detektif", icon: sus.emoji,
        flavor: `${sus.emoji} *INTEROGASI: ${sus.name.toUpperCase()} (${sus.role.toUpperCase()})*`,
        body: [
          sus.topics.map((tp, i) => `${asked.includes(i) ? "✅" : "❔"} ${i + 1}. ${tp.t}${asked.includes(i) ? " — sudah ditanyakan" : ""}`).join("\n"),
          "",
          "Tanya topik: .sangdetektif tanya <nomor>",
        ].join("\n"),
      }));
    }

    if (sub === "tanya") {
      const sus = c.suspects.find((s) => s.id === a.curSus);
      if (!sus) return m.reply(raraGameBox({ title: "detektif", icon: "👤", flavor: "❓ *BELUM ADA TERSANGKA!*", body: "Mulai interogasi dulu: .sangdetektif interogasi <no/nama>" }));
      const idx = Number(rest) - 1;
      if (!(idx >= 0 && idx < sus.topics.length)) return m.reply(raraGameBox({ title: "detektif", icon: "❔", flavor: "❔ *TOPIK GAK VALID!*", body: `Topik sah: ${sus.topics.map((tp, i) => (i + 1) + ". " + tp.t).join(", ")}` }));
      a.asked = a.asked || {};
      a.asked[sus.id] = [...new Set([...(a.asked[sus.id] || []), idx])];
      saveDb();
      const tp = sus.topics[idx];
      let body = `❓ ${tp.t}\n💬 "${sus.name}: ${tp.text}"`;
      // kontradiksi otomatis kalau bukti di tangan bantah
      if (sus.contradictedBy && a.evidence.includes(sus.contradictedBy)) {
        const ev = evIn(c, sus.contradictedBy);
        body += `\n\n🚩 KONTRADIKSI! Bukti di tanganmu (${ev.name}) menggugurkan pernyataan itu:\n   ${ev.desc}`;
      }
      return m.reply(raraGameBox({ title: "detektif", icon: "💬", flavor: `💬 *${sus.name.toUpperCase()} MENJAWAB*`, body }));
    }

    if (sub === "bukti") {
      const evs = a.evidence.map((id) => evIn(c, id)).filter(Boolean);
      if (!evs.length) return m.reply(raraGameBox({ title: "detektif", icon: "📌", flavor: "📌 *MAP BUKTI KOSONG!*", body: "Kamu belum punya bukti. Jelajah (.pergi) lalu gali (.cari)." }));
      return m.reply(raraGameBox({ title: "detektif", icon: "📌", flavor: "📌 *MAP BUKTI KAMU*", body: evs.map((e) => `📌 ${e.name}\n   ${e.desc}`).join("\n\n") + `\n\nTotal: ${evs.length}/${c.evidence.length}` }));
    }

    if (sub === "hint") {
      if (a.hintUsed) return m.reply(raraGameBox({ title: "detektif", icon: "💡", flavor: "💡 *HINT SUDAH DIPAKAI!*", body: "Satu kasus cuma satu hint kurator. Gunakan naluri detektifmu!" }));
      let paidWith = null;
      if (removeGold(m, HINT_GOLD)) paidWith = `${HINT_GOLD} gold`;
      else if ((u.kopi || 0) >= 1) { u.kopi -= 1; paidWith = "1 kopi"; }
      else return m.reply(raraGameBox({ title: "detektif", icon: "🪙", flavor: "💸 *KURANG DANA!*", body: `Hint butuh ${HINT_GOLD} gold ATAU 1 kopi. Solve sempurna tanpa hint = EXP ×2, jadi pertimbangkan matang-matang!` }));
      a.hintUsed = true;
      saveDb();
      return m.reply(raraGameBox({ title: "detektif", icon: "💡", flavor: "💡 *HINT KURATOR!*", body: `Dibayar pakai ${paidWith}.\n\n${c.hint}\n\n⚠️ EXP kasus ini jadi normal (tanpa bonus ×2).` }));
    }

    if (sub === "tuduh") {
      if (!rest) return m.reply(raraGameBox({ title: "detektif", icon: "⚖️", flavor: "⚖️ *FORMAT DEDUKSI!*", body: "Tuduh siapa? " + c.suspects.map((s, i) => `${i + 1}. ${s.name}`).join(", ") + "\n\nContoh: .sangdetektif tuduh 2" }));
      const sus = fuzzySus(c, rest);
      if (!sus) return m.reply(raraGameBox({ title: "detektif", icon: "⚖️", flavor: "❓ *TERSANGKA GAK DITEMUKAN!*", body: c.suspects.map((s, i) => `${i + 1}. ${s.name}`).join("\n") }));
      // anti-spam cooldown
      const nowS = Date.now();
      if (nowS - (a.lastAccuseAt || 0) < ANSWER_CD_MS) return;
      a.lastAccuseAt = nowS;

      if (sus.id === c.culprit) {
        const perfect = c.keyEvidence.every((k) => a.evidence.includes(k)) && a.wrongAccuse === 0 && !a.hintUsed;
        let exp = ({ 1: 80, 2: 160, 3: 320 })[c.tier];
        const goldBase = ({ 1: 50, 2: 100, 3: 200 })[c.tier];
        const notes = [];
        if (perfect) { notes.push("🎯 PERFECT SOLVE — semua bukti kunci, tanpa salah tuduh, tanpa hint!"); }
        if (!a.hintUsed) { exp *= 2; notes.push("🧠 Tanpa hint — EXP ×2"); }
        exp = Math.floor(exp * rebirthBonus(u.rebirths));
        if (u.rebirths > 0) notes.push(`♻️ Rebirth ×${u.rebirths} — EXP ×${rebirthBonus(u.rebirths).toFixed(1)}`);
        if (perfect) { u.kopi += 1; }
        const gold = goldBase * (perfect ? 2 : 1);
        const cash = addGameCash(m, gold);
        let lvlUp = null;
        try { lvlUp = addExpWithLevelCheck(m, exp); } catch {}
        // tutup kasus
        u.casesSolved += 1;
        u.solvedTotal += 1;
        u.usedCases[String(c.tier)] = [...(u.usedCases[String(c.tier)] || []), c.id].slice(-4);
        u.active = null;
        u.wrongStreak = 0;
        saveDb();
        return m.reply(raraGameBox({
          title: "detektif", icon: "⚖️",
          flavor: "⚖️ *KASUS SELESAI — PELAKU TERTANGKAP!*",
          body: [
            `👣 ${sus.emoji} ${sus.name} melenggang di bawah tapol — bukti kamu kokoh, dia gak bisa ngelindur.`,
            "",
            "📖 KRONOLOGI:",
            c.solution,
            "",
            `🎁 +${exp} EXP · +${cash?.gain || gold} uang${perfect ? " · ☕ +1 kopi" : ""}${lvlUp ? " · 🎊 LEVEL UP!" : ""}`,
            ...(notes.length ? ["", ...notes] : []),
            "",
            `📁 Kasus selesai: ${u.solvedTotal} · Rank: ${rankFor(u.solvedTotal)}`,
            "",
            "Ketik .sangdetektif untuk berkas berikutnya!",
          ].join("\n"),
        }));
      }

      // salah tuduh
      a.wrongAccuse = (a.wrongAccuse || 0) + 1;
      u.wrongStreak = (u.wrongStreak || 0) + 1;
      const paid = removeGold(m, WRONG_ACCUSE_GOLD);
      saveDb();
      let pityNote = "";
      if (u.wrongStreak >= 3) pityNote = `\n\n🤝 REPUTASI: salah tuduh ${u.wrongStreak}x berturut-turut — kantor kasih keringanan: kasus BERIKUTNYA otomatis dapat clue kurator gratis.`;
      return m.reply(raraGameBox({
        title: "detektif", icon: "❌",
        flavor: "❌ *TUDUHAN GAGAL!*",
        body: [
          `${sus.emoji} ${sus.name} punya alibi kokoh — kamu salah tuduh!`,
          `💰 Denda reputasi: -${WRONG_ACCUSE_GOLD} gold${paid ? "" : " (dibayar sebagian — nama kamu tetap panas di koran)"}`,
          `⚠️ Salah tuduh kasus ini: ${a.wrongAccuse}x`,
          "",
          `Kasus masih terbuka. Kumpulkan bukti lagi (.sangdetektif cari) atau lihat map: .sangdetektif bukti`,
          pityNote,
        ].filter(Boolean).join("\n"),
      }));
    }
  }

  // ══ MULAI KASUS BARU / LANJUT ══
  if (u?.active) {
    const c = caseOf(u);
    return m.reply(raraGameBox({ title: "detektif", icon: "📁", flavor: "📁 *KASUS MASIH TERBUKA!*", body: `Kamu masih pegang berkas "${c.title}".\n\n${fileText(u, c)}` }));
  }

  let isNew = false;
  if (!u) { u = newUser(m); isNew = true; }

  if ((u.energi || 0) < COST_PERGI) {
    return m.reply(raraGameBox({ title: "detektif", icon: "⚡", flavor: "⚡ *ENERGI HABIS!*", body: `Energi ${u.energi}/${ENERGI_MAX}. Regen +1 tiap 5 menit. Sambil nunggu: .sangdetektif daily atau minum kopi (.sangdetektif kopi).` }));
  }

  const c = pickCase(u);
  u.active = { caseId: c.id, visited: [], searched: [], evidence: [], puzzleSolved: [], puzzlePending: null, curSus: null, asked: {}, wrongAccuse: 0, hintUsed: false, lastAccuseAt: 0 };
  // pity: 3 salah berturut → clue gratis
  let pityLine = "";
  if (u.wrongStreak >= 3) { u.active.hintUsed = true; u.wrongStreak = 0; pityLine = `\n\n🤝 KERINGANAN KANTOR (3 salah tuduh berturut):\n💡 ${c.hint}`; }
  saveDb();
  if (m.react) { try { await m.react("🧠"); } catch {} }

  if (isNew) {
    try { addGold(m, 100); } catch {}
    u.kopi += 2;
    saveDb();
    return m.reply(raraGameBox({
      title: "detektif", icon: "🕵️",
      flavor: "🕵️ *SELAMAT DATANG DI RARA DETEKTIF!*",
      body: [
        `Kota ini penuh kasus kotor yang polisi gak sempat urus. Kamu detektif swasta — reputasimu mulai dari nol, berkas pertama sudah menanti.`,
        "",
        `🎯 Cara main:`,
        `1. .sangdetektif kasus — baca berkas (lokasi + tersangka)`,
        `2. .sangdetektif pergi <no> — jelajah lokasi (⚡2)`,
        `3. .sangdetektif cari — gali bukti (⚡1), temukan lockbox (.sangdetektif jawab <jawaban>)`,
        `4. .sangdetektif interogasi <no> — dengarkan alibi (⚡1), lalu .sangdetektif tanya <topik>`,
        `5. .sangdetektif tuduh <no> — deduksi final! Salah tuduh = denda 50 gold`,
        "",
        `🎯 PERFECT SOLVE (semua bukti kunci + tanpa salah tuduh + tanpa hint) = EXP ×2 + ☕1 kopi`,
        "",
        `🎁 STARTER PACK: +100 gold · +2 ☕ kopi`,
        `💡 .sangdetektif hint · 📅 .sangdetektif daily · ☕ .sangdetektif kopi (+5 energi) · 📊 .sangdetektif status`,
        pityLine,
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        `📁 KASUS #${c.id}: ${c.title.toUpperCase()}`,
        "",
        c.briefing,
        "",
        "Ketik .sangdetektif kasus buka berkas!",
      ].filter(Boolean).join("\n"),
    }));
  }

  return m.reply(raraGameBox({
    title: "detektif", icon: "📁",
    flavor: "📁 *BERKAS BARU DI MEJAMU!*",
    body: [
      `📁 KASUS #${c.id}: ${c.title.toUpperCase()}`,
      "",
      c.briefing,
      pityLine,
      "",
      "Ketik .sangdetektif kasus buka berkas!",
    ].filter(Boolean).join("\n"),
  }));
}

export { handler, loadCases };
export const pluginConfig = {
  name: ["masterdetective", "sangdetektif", "detektif", "detektifkasus"],
  type: "rpg",
  description: "Sang Detektif — pecahkan kasus kriminal: jelajah lokasi, kumpulkan bukti, interogasi tersangka, tuduh pelaku",
  usage: ".sangdetektif | .sangdetektif kasus | .sangdetektif pergi <no> | .sangdetektif cari | .sangdetektif interogasi <no> | .sangdetektif tanya <no> | .sangdetektif jawab <ans> | .sangdetektif bukti | .sangdetektif tuduh <no> | .sangdetektif hint | .sangdetektif daily | .sangdetektif kopi | .sangdetektif status | .sangdetektif rank | .sangdetektif rebirth | .sangdetektif stop",
  isOwner: false,
  premium: false,
  group: false,
};
export { pluginConfig as config };
