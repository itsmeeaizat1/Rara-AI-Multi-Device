// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-anonim-engine.js — engine BARU "Chat Anonim & Anonymous" (kategori "anonim").
// BEDA & TERPISAH TOTAL dari src/lib/rara-anonchat.js (owner: "anonchat.js itu beda
// lg jgn diubah atau disatuin") — namespace sendiri (db.data.anonim), command sendiri
// (.anonim <sub>), gak share state/kode sama sekali.
//
// Gaya pesan + fitur ngikut referensi bot Telegram "Chat Anonim | Obrolan Anonymous"
// (screenshot owner 6 Okt 2026): singkat, emoji di depan tiap baris, bold di kata
// kunci, ada Statistik, Premium (filter gender + Badge VIP + ajak teman dapat
// premium gratis via kode referral), rating partner 👍/👎 setelah obrolan.
// Prefix command pakai "." (bukan "/") ngikut prefix bot — WA gak punya reply-keyboard
// kayak Telegram, jadi menu tetap berupa teks perintah.
//
// Terdaftar via .anonim daftar (nama, jenis kelamin, umur, lokasi, kode referral
// opsional) — bisa dari GRUP atau DM. .anonim find/next/stop/report/settings/statistik
// CUMA bisa dari DM bot (privasi). Filter settings & limit find lebih besar = PREMIUM
// ONLY (dikunci kalau bukan premium — permintaan owner); bonus premium 7 hari otomatis
// kalau berhasil ngajak 3 teman daftar pakai kode referral.
//
// PRIORITAS: WA dulu (permintaan owner 6 Okt). Lintas-platform: pengiriman pakai
// sock.sendMessage(jid, ...) ambient apa adanya — kalau partner adalah user Telegram
// (jid "tg_<id>") dan pesan berasal dari sisi WA, bridge Telegram yang sudah ada
// (wrapOutboundSends di connection.js) otomatis neruskan, GRATIS tanpa kode tambahan.
// Arah sebaliknya (Telegram → partner WA) BELUM ditangani di versi ini; lihat TODO
// di relayMessage().
import { getDatabase } from "./rara-database.js";
import { raraWrap } from "./rara-menu-style.js";
import { isPremium } from "./rara-premium-db.js";
import config from "../../config.js";

// ── konstanta ──
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;    // sesi nutup otomatis kalau gak ada balasan > 1 jam
const QUEUE_TIMEOUT_MS = 30 * 60 * 1000;    // nunggu partner > 30 mnt → kedaluwarsa, keluar antrean
const FLOOD_MS = 800;                       // jarak minimal antar pesan diteruskan per user
const MAX_LEN = 1000;                       // cap panjang pesan diteruskan
const REPORT_WINDOW_MS = 10 * 60 * 1000;    // bisa report partner sampai 10 mnt setelah sesi berakhir
const RATING_WINDOW_MS = 2 * 60 * 1000;     // jendela buat jawab rating 👍/👎 setelah sesi berakhir
const FREE_DAILY_FIND = 15;                 // limit .anonim find/hari buat non-premium
const PREMIUM_DAILY_FIND = 200;             // limit buat premium (bukan unlimited literal, tapi gede)
const MIN_AGE = 13, MAX_AGE = 100;
const TEXT_TYPES = new Set(["conversation", "extendedTextMessage"]);
const REG_SESSION_TIMEOUT = 5 * 60 * 1000;  // 5 menit per step daftar

// ── gacha referral (owner 6 Okt, screenshot: "ajak teman & dapat premium gratis")
// TIAP referral valid (bukan tiap kelipatan) nge-roll 1x gacha buat PENGUNDANG —
// hadiah RANDOM: tambahan limit cari hari ini (umum) atau akses Premium 1-3 hari
// (langka), biar kerasa kayak gacha beneran — bukan hadiah pasti.
const REFERRAL_GACHA_POOL = [
  { type: "limit", amount: 3, chance: 40, label: "🎁 +3 limit cari hari ini" },
  { type: "limit", amount: 5, chance: 30, label: "🎁 +5 limit cari hari ini" },
  { type: "limit", amount: 10, chance: 15, label: "🎉 +10 limit cari hari ini" },
  { type: "premium", hours: 24, chance: 10, label: "💎 Premium 1 hari" },
  { type: "premium", hours: 72, chance: 5, label: "💎✨ JACKPOT! Premium 3 hari" },
];

// ── seams buat e2e ──
let _idleMs = IDLE_TIMEOUT_MS, _floodMs = FLOOD_MS, _queueTimeoutMs = QUEUE_TIMEOUT_MS;
export function _setAnonimTimingsForTest(idleMs, floodMs, queueTimeoutMs) {
  if (idleMs != null) _idleMs = idleMs;
  if (floodMs != null) _floodMs = floodMs;
  if (queueTimeoutMs != null) _queueTimeoutMs = queueTimeoutMs;
}
export function _resetAnonimTimingsForTest() {
  _idleMs = IDLE_TIMEOUT_MS; _floodMs = FLOOD_MS; _queueTimeoutMs = QUEUE_TIMEOUT_MS;
}
let _sweeperInterval = null;
export function _stopAnonimSweeperForTest() { if (_sweeperInterval) { clearInterval(_sweeperInterval); _sweeperInterval = null; } }

let _rng = Math.random;
export function _setAnonimRngForTest(fn) { _rng = fn; }
export function _resetAnonimRngForTest() { _rng = Math.random; }

// pilih 1 hadiah dari REFERRAL_GACHA_POOL berdasar bobot "chance" (total 100)
function rollReferralGacha() {
  const roll = _rng() * 100;
  let cum = 0;
  for (const item of REFERRAL_GACHA_POOL) {
    cum += item.chance;
    if (roll < cum) return item;
  }
  return REFERRAL_GACHA_POOL[REFERRAL_GACHA_POOL.length - 1];
}

// terapkan hadiah gacha ke profil PENGUNDANG (referrer)
function applyReferralReward(db, profile, reward) {
  if (reward.type === "limit") {
    const today = todayStr();
    if (!profile.bonusFind || profile.bonusFind.date !== today) profile.bonusFind = { date: today, amount: 0 };
    profile.bonusFind.amount += reward.amount;
  } else if (reward.type === "premium") {
    const base = profile.premiumBonusUntil > Date.now() ? profile.premiumBonusUntil : Date.now();
    profile.premiumBonusUntil = base + reward.hours * 60 * 60 * 1000;
  }
  db.save();
}

function bonusFindToday(profile) {
  return (profile?.bonusFind && profile.bonusFind.date === todayStr()) ? (profile.bonusFind.amount || 0) : 0;
}

if (!global.anonimRegSessions) global.anonimRegSessions = {};
if (!global.anonimRatingPrompts) global.anonimRatingPrompts = {};
export function _resetAnonimRegSessionsForTest() { global.anonimRegSessions = {}; global.anonimRatingPrompts = {}; }

// ── state persisten (db.data.anonim) ──
export function getAnonim(db) {
  const d = db || getDatabase();
  if (!d.data.anonim || typeof d.data.anonim !== "object") d.data.anonim = {};
  const a = d.data.anonim;
  if (!a.profiles || typeof a.profiles !== "object") a.profiles = {};
  if (!Array.isArray(a.queue)) a.queue = [];
  a.queue = a.queue.filter((q) => q && q.jid);
  if (!a.sessions || typeof a.sessions !== "object") a.sessions = {};
  if (!Array.isArray(a.reports)) a.reports = [];
  if (!a.dailyFind || typeof a.dailyFind !== "object") a.dailyFind = {};
  return a;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ownerJid() {
  const nums = config.owner?.number || [];
  if (!nums.length) return null;
  const num = String(nums[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

async function dm(sock, jid, text) {
  if (!sock || !jid) return false;
  try { await sock.sendMessage(jid, { text }); return true; } catch { return false; }
}

function makeRefCode(jid) {
  const digits = String(jid || "").replace(/\D/g, "");
  if (digits.length >= 6) return digits.slice(-6);
  return "A" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

// ── profil ──
export function getProfile(db, jid) {
  const a = getAnonim(db);
  return a.profiles[jid] || null;
}

export function isRegistered(db, jid) {
  return !!getProfile(db, jid);
}

export function findProfileByRefCode(a, code, excludeJid) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;
  for (const [jid, p] of Object.entries(a.profiles)) {
    if (jid === excludeJid) continue;
    if (String(p.refCode || "").toUpperCase() === c) return { jid, profile: p };
  }
  return null;
}

export function registerProfile(db, jid, { name, gender, age, location }) {
  const a = getAnonim(db);
  a.profiles[jid] = {
    name: String(name).slice(0, 40),
    gender,
    age,
    location: String(location).slice(0, 40),
    interests: [],
    lang: a.profiles[jid]?.lang || "id",
    registeredAt: Date.now(),
    refCode: makeRefCode(jid),
    settings: { filterGender: null, filterAgeMin: null, filterAgeMax: null, filterLocation: null },
    bonusFind: { date: null, amount: 0 },
    stats: {
      chatCount: 0, messagesSent: 0, reportsMade: 0, reportsReceived: 0,
      ratingUp: 0, ratingDown: 0, ratedCount: 0, invitedCount: 0,
      lastActiveAt: Date.now(),
    },
    premiumBonusUntil: 0,
    banned: false,
  };
  db.save();
  return a.profiles[jid];
}

export async function unregisterProfile(m, sock, db) {
  const a = getAnonim(db);
  const jid = m.sender;
  if (!a.profiles[jid]) {
    return m.reply(raraWrap("Chat Anonim", "🤔 Kamu belum terdaftar di Chat Anonim."));
  }
  // keluar dari antrean/sesi dulu kalau masih aktif
  const qi = a.queue.findIndex((q) => q.jid === jid);
  if (qi >= 0) a.queue.splice(qi, 1);
  if (a.sessions[jid]) await closeSession(sock, db, jid, "Partner kamu berhenti dari Chat Anonim.");
  delete a.profiles[jid];
  db.save();
  return m.reply(raraWrap("Chat Anonim", "✅ Profil Chat Anonim kamu udah dihapus. Daftar lagi kapan aja: *.anonim daftar*"));
}

// ── bahasa & settings ──
export function setLanguage(db, jid, lang) {
  const a = getAnonim(db);
  if (!a.profiles[jid]) return false;
  a.profiles[jid].lang = lang;
  db.save();
  return true;
}

export function updateSettings(db, jid, patch) {
  const a = getAnonim(db);
  const p = a.profiles[jid];
  if (!p) return false;
  p.settings = { ...p.settings, ...patch };
  db.save();
  return true;
}

// ── registrasi: sesi multi-step (ala plugins/user/register.js) ──
export function startRegistration(jid) {
  global.anonimRegSessions[jid] = { step: "name", at: Date.now(), data: {} };
}

export function hasRegistrationSession(jid) {
  const s = global.anonimRegSessions[jid];
  if (!s) return false;
  if (Date.now() - s.at > REG_SESSION_TIMEOUT) { delete global.anonimRegSessions[jid]; return false; }
  return true;
}

function finishRegistration(db, jid, data, refResult) {
  const profile = registerProfile(db, jid, data);
  const lines = [
    "🎉 *Pendaftaran selesai!*",
    "",
    `👤 ${profile.name} · ${profile.gender === "L" ? "Laki-laki" : "Perempuan"} · ${profile.age} th · ${profile.location}`,
  ];
  if (refResult === "ok") lines.push("", "🎁 Kode referral diterima, makasih udah gabung lewat undangan teman!");
  else if (refResult === "invalid") lines.push("", "⚠️ Kode referral gak ketemu — lanjut daftar tanpa referral.");
  lines.push("", "Sekarang kamu bisa cari partner: 🔍 *.anonim find*");
  return raraWrap("Daftar Chat Anonim", lines.join("\n"));
}

// handler non-command buat lanjutin step daftar — dipanggil dari answerHandler plugin
export async function registrationAnswerHandler(m, sock, db) {
  const jid = m.sender;
  if (!hasRegistrationSession(jid)) return false;
  if (String(m.text || "").startsWith(".")) { delete global.anonimRegSessions[jid]; return false; } // user ganti command → batal sesi daftar
  const sess = global.anonimRegSessions[jid];
  const text = String(m.text || "").trim();
  if (!text) return true;

  if (sess.step === "name") {
    if (text.length < 2 || text.length > 40) {
      await m.reply(raraWrap("Daftar Chat Anonim", "⚠️ Nama 2–40 karakter ya. Coba lagi, siapa namamu?"));
      return true;
    }
    sess.data.name = text;
    sess.step = "gender";
    sess.at = Date.now();
    await m.reply(raraWrap("Daftar Chat Anonim", `✅ Oke, *${text}*!\n\nJenis kelamin kamu? Balas: *L* (laki-laki) atau *P* (perempuan)`));
    return true;
  }
  if (sess.step === "gender") {
    const g = text.toUpperCase();
    if (g !== "L" && g !== "P") {
      await m.reply(raraWrap("Daftar Chat Anonim", "⚠️ Balas *L* (laki-laki) atau *P* (perempuan) aja ya."));
      return true;
    }
    sess.data.gender = g;
    sess.step = "age";
    sess.at = Date.now();
    await m.reply(raraWrap("Daftar Chat Anonim", "🎂 Umur kamu berapa? (13–100)"));
    return true;
  }
  if (sess.step === "age") {
    const n = parseInt(text.replace(/\D/g, ""), 10);
    if (!n || n < MIN_AGE || n > MAX_AGE) {
      await m.reply(raraWrap("Daftar Chat Anonim", `⚠️ Masukin umur yang valid (${MIN_AGE}–${MAX_AGE}) ya.`));
      return true;
    }
    sess.data.age = n;
    sess.step = "location";
    sess.at = Date.now();
    await m.reply(raraWrap("Daftar Chat Anonim", "📍 Lokasi kamu? (kota/negara, bebas — misal: Jakarta)"));
    return true;
  }
  if (sess.step === "location") {
    if (text.length < 2 || text.length > 40) {
      await m.reply(raraWrap("Daftar Chat Anonim", "⚠️ Lokasi 2–40 karakter ya. Coba lagi."));
      return true;
    }
    sess.data.location = text;
    sess.step = "referral";
    sess.at = Date.now();
    await m.reply(raraWrap("Daftar Chat Anonim", "🎁 Punya kode referral dari teman? Ketik kodenya, atau ketik *skip*."));
    return true;
  }
  if (sess.step === "referral") {
    const a = getAnonim(db);
    let refResult = "none";
    if (text.toLowerCase() !== "skip") {
      const found = findProfileByRefCode(a, text, jid);
      if (found) {
        found.profile.stats.invitedCount = (found.profile.stats.invitedCount || 0) + 1;
        const reward = rollReferralGacha(); // gacha: TIAP referral valid nge-roll, hadiah random
        applyReferralReward(db, found.profile, reward);
        dm(sock, found.jid, raraWrap("Chat Anonim", [
          "🎰 *Gacha Referral!*",
          "",
          `Temanmu daftar pakai kode kamu — kamu dapat:`,
          reward.label,
          "",
          `Total teman diundang: ${found.profile.stats.invitedCount}`,
        ].join("\n")));
        refResult = "ok";
      } else {
        refResult = "invalid";
      }
    }
    const data = sess.data;
    delete global.anonimRegSessions[jid];
    await m.reply(finishRegistration(db, jid, data, refResult));
    return true;
  }
  return false;
}

// ── premium (termasuk bonus referral) ──
function isPremiumEffective(a, jid) {
  if (isAnonimPremium(jid)) return true;
  const p = a.profiles[jid];
  return !!(p && p.premiumBonusUntil && p.premiumBonusUntil > Date.now());
}

export function isAnonimPremium(jid) {
  try { return isPremium(jid); } catch { return false; }
}

function dailyFindLeft(a, jid) {
  const limit = isPremiumEffective(a, jid) ? PREMIUM_DAILY_FIND : FREE_DAILY_FIND;
  const bonus = bonusFindToday(a.profiles[jid]); // bonus hasil gacha referral, berlaku HARI INI aja
  const rec = a.dailyFind[jid];
  const today = todayStr();
  if (!rec || rec.date !== today) return limit + bonus;
  return Math.max(0, limit + bonus - rec.count);
}

function bumpDailyFind(a, jid) {
  const today = todayStr();
  if (!a.dailyFind[jid] || a.dailyFind[jid].date !== today) a.dailyFind[jid] = { date: today, count: 0 };
  a.dailyFind[jid].count++;
}

// ── rating 👍/👎 setelah sesi berakhir ──
function promptRating(jid, targetJid) {
  global.anonimRatingPrompts[jid] = { target: targetJid, expiresAt: Date.now() + RATING_WINDOW_MS };
}

export async function ratingAnswerHandler(m, sock, db) {
  const jid = m.sender;
  const prompt = global.anonimRatingPrompts[jid];
  if (!prompt) return false;
  if (Date.now() > prompt.expiresAt) { delete global.anonimRatingPrompts[jid]; return false; }
  const text = String(m.text || "").trim();
  const isUp = text === "👍" || /^(bagus|suka|like)$/i.test(text);
  const isDown = text === "👎" || /^(jelek|gak suka|dislike)$/i.test(text);
  if (!isUp && !isDown) { delete global.anonimRatingPrompts[jid]; return false; } // bukan jawaban rating → lanjut normal
  delete global.anonimRatingPrompts[jid];
  const a = getAnonim(db);
  const target = a.profiles[prompt.target];
  if (target) {
    if (isUp) target.stats.ratingUp = (target.stats.ratingUp || 0) + 1;
    else target.stats.ratingDown = (target.stats.ratingDown || 0) + 1;
  }
  if (a.profiles[jid]) a.profiles[jid].stats.ratedCount = (a.profiles[jid].stats.ratedCount || 0) + 1;
  db.save();
  await m.reply(raraWrap("Chat Anonim", "✅ Makasih rating-nya!"));
  return true;
}

// ── tutup sesi dua arah (idempotent) ──
export async function closeSession(sock, db, jid, reasonText) {
  const a = getAnonim(db);
  const me = a.sessions[jid];
  if (!me) return false;
  const partner = me.partner;
  delete a.sessions[jid];
  delete a.sessions[partner];
  db.save();
  promptRating(jid, partner);
  promptRating(partner, jid);
  await dm(sock, jid, raraWrap("Chat Anonim", `🛑 ${reasonText}\n\nKasih rating partner tadi? Balas 👍 atau 👎 (atau abaikan).\n\n🔍 Cari partner baru: *.anonim find*`));
  await dm(sock, partner, raraWrap("Chat Anonim", `🛑 Partner kamu mengakhiri obrolan.\n\nKasih rating partner tadi? Balas 👍 atau 👎 (atau abaikan).\n\n🔍 Cari partner baru: *.anonim find*`));
  return true;
}

function matchesFilter(searcherSettings, candidateProfile) {
  if (!searcherSettings) return true;
  if (searcherSettings.filterGender && candidateProfile.gender !== searcherSettings.filterGender) return false;
  if (searcherSettings.filterAgeMin && candidateProfile.age < searcherSettings.filterAgeMin) return false;
  if (searcherSettings.filterAgeMax && candidateProfile.age > searcherSettings.filterAgeMax) return false;
  if (searcherSettings.filterLocation) {
    const want = searcherSettings.filterLocation.toLowerCase();
    if (!String(candidateProfile.location || "").toLowerCase().includes(want)) return false;
  }
  return true;
}

const FOUND_TEXT = (name) => raraWrap("Chat Anonim", [
  "✅ *Partner ditemukan!* 🎉",
  "",
  "Sapa dia 👋. Semua pesan diteruskan anonim.",
  "⏩ *.anonim next* ganti · 🛑 *.anonim stop* berhenti · 🚩 *.anonim report* lapor",
].join("\n"));

const WAITING_TEXT = (count) => raraWrap("Chat Anonim", [
  "🔍 Kamu masuk daftar tunggu Chat Anonim.",
  "Begitu ada partner cocok, kamu otomatis di-pasangkan — pantau DM ya.",
  "",
  `⏳ Yang nunggu sekarang: ${count} (termasuk kamu).`,
  "Batal cari: *.anonim stop*",
].join("\n"));

// ── find: masuk antrean / langsung match ──
export async function findPartner(m, sock, db) {
  const a = getAnonim(db);
  const jid = m.sender;
  const profile = a.profiles[jid];
  if (!profile) {
    return m.reply(raraWrap("Chat Anonim", "📝 Kamu belum daftar. Isi profil dulu: *.anonim daftar*"));
  }
  if (profile.banned) {
    return m.reply(raraWrap("Chat Anonim", "🚫 Akun kamu lagi diblokir dari Chat Anonim karena laporan pelanggaran."));
  }
  if (a.sessions[jid]) {
    return m.reply(raraWrap("Chat Anonim", "💬 Kamu lagi di sesi chat. Ganti partner: *.anonim next* · keluar: *.anonim stop*"));
  }
  if (a.queue.some((q) => q.jid === jid)) {
    return m.reply(WAITING_TEXT(a.queue.length));
  }
  const left = dailyFindLeft(a, jid);
  if (left <= 0) {
    const premium = isPremiumEffective(a, jid);
    return m.reply(raraWrap("Chat Anonim", [
      `⏳ Limit cari partner hari ini (${premium ? PREMIUM_DAILY_FIND : FREE_DAILY_FIND}x) udah habis.`,
      "Coba lagi besok ya.",
      !premium ? "\n💎 Mau limit lebih gede? *.anonim premium*" : "",
    ].filter(Boolean).join("\n")));
  }

  // cari kandidat di antrean yang cocok filter PENCARI (FIFO di antara yang cocok)
  let matchIdx = -1;
  for (let i = 0; i < a.queue.length; i++) {
    const cand = a.queue[i];
    if (!cand || cand.jid === jid) continue;
    if (Date.now() - (cand.at || 0) > _queueTimeoutMs) continue; // kedaluwarsa, biar sweeper buang
    const candProfile = a.profiles[cand.jid];
    if (!candProfile || candProfile.banned) continue;
    if (!matchesFilter(profile.settings, candProfile)) continue;
    matchIdx = i;
    break;
  }

  if (matchIdx >= 0) {
    const waited = a.queue.splice(matchIdx, 1)[0];
    const now = Date.now();
    a.sessions[jid] = { partner: waited.jid, startedAt: now, lastActive: now, lastRelayAt: 0 };
    a.sessions[waited.jid] = { partner: jid, startedAt: now, lastActive: now, lastRelayAt: 0 };
    bumpDailyFind(a, jid);
    profile.stats.chatCount++;
    if (a.profiles[waited.jid]) a.profiles[waited.jid].stats.chatCount++;
    db.save();
    await m.reply(FOUND_TEXT(profile.name));
    await dm(sock, waited.jid, FOUND_TEXT(a.profiles[waited.jid]?.name));
    try { await m.react("⚡"); } catch {}
    return;
  }

  a.queue.push({ jid, at: Date.now() });
  bumpDailyFind(a, jid);
  db.save();
  try { await m.react("🔍"); } catch {}
  return m.reply(WAITING_TEXT(a.queue.length));
}

// ── next: putus sesi + langsung cari partner baru ──
export async function nextPartner(m, sock, db) {
  const a = getAnonim(db);
  const jid = m.sender;
  if (!a.sessions[jid]) {
    return m.reply(raraWrap("Chat Anonim", "🤔 Kamu lagi gak di sesi chat. Mulai dulu: *.anonim find*"));
  }
  await closeSession(sock, db, jid, "Sesi diganti (next).");
  return findPartner(m, sock, db);
}

// ── stop: keluar sesi ATAU daftar tunggu ──
export async function stopChat(m, sock, db) {
  const a = getAnonim(db);
  const jid = m.sender;
  const qi = a.queue.findIndex((q) => q.jid === jid);
  if (qi >= 0) {
    a.queue.splice(qi, 1);
    db.save();
    return m.reply(raraWrap("Chat Anonim", "✅ Kamu keluar dari daftar tunggu. Cari lagi kapan aja: *.anonim find*"));
  }
  if (a.sessions[jid]) {
    const partner = a.sessions[jid].partner;
    await closeSession(sock, db, jid, "Obrolan dihentikan.");
    // simpan last partner buat jendela report (10 mnt)
    a.profiles[jid] = a.profiles[jid] || {};
    if (a.profiles[jid]) a.profiles[jid]._lastPartner = { jid: partner, at: Date.now() };
    db.save();
    return;
  }
  return m.reply(raraWrap("Chat Anonim", "🛑 Kamu lagi gak di sesi/daftar tunggu Chat Anonim.\n\n🔍 Mulai: *.anonim find*"));
}

// ── report partner (sesi aktif ATAU partner terakhir dalam 10 mnt) ──
export async function reportPartner(m, sock, db, reason) {
  const a = getAnonim(db);
  const jid = m.sender;
  if (!a.profiles[jid]) {
    return m.reply(raraWrap("Chat Anonim", "📝 Kamu belum daftar di Chat Anonim."));
  }
  let targetJid = a.sessions[jid]?.partner;
  if (!targetJid) {
    const lp = a.profiles[jid]._lastPartner;
    if (lp && Date.now() - lp.at <= REPORT_WINDOW_MS) targetJid = lp.jid;
  }
  if (!targetJid) {
    return m.reply(raraWrap("Chat Anonim", "🤔 Gak ada partner buat dilaporkan (sesi harus aktif atau baru berakhir < 10 mnt)."));
  }
  if (!reason || reason.trim().length < 3) {
    return m.reply(raraWrap("Chat Anonim", "🚩 Kasih alasan laporannya ya: *.anonim report <alasan>*"));
  }
  a.reports.push({ reporter: jid, reported: targetJid, reason: reason.trim().slice(0, 300), at: Date.now() });
  if (a.reports.length > 2000) a.reports.splice(0, a.reports.length - 2000); // cap biar gak bengkak
  if (a.profiles[jid]) a.profiles[jid].stats.reportsMade = (a.profiles[jid].stats.reportsMade || 0) + 1;
  const targetProfile = a.profiles[targetJid];
  let autoBanned = false;
  if (targetProfile) {
    targetProfile.stats.reportsReceived = (targetProfile.stats.reportsReceived || 0) + 1;
    if (targetProfile.stats.reportsReceived >= 5 && !targetProfile.banned) {
      targetProfile.banned = true;
      autoBanned = true;
    }
  }
  db.save();
  const oJid = ownerJid();
  if (oJid) {
    await dm(sock, oJid, raraWrap("Report Chat Anonim", [
      `🚩 Laporan baru${autoBanned ? " (AUTO-BAN partner, 5x laporan)" : ""}`,
      `Alasan: ${reason.trim().slice(0, 300)}`,
    ].join("\n")));
  }
  return m.reply(raraWrap("Chat Anonim", "✅ Laporan diterima, makasih udah bantu jaga Chat Anonim tetap aman."));
}

// ── settings (ala referensi Telegram owner: Gender sendiri + Mencari/Umur/Lokasi
// partner [PREMIUM] + Minat + Bahasa — versi "lengkap" tambahan dari permintaan owner) ──
const GENDER_LABEL = (g) => (g === "L" ? "Laki-laki" : g === "P" ? "Perempuan" : "Belum diatur");
const SEARCH_LABEL = (g) => (g === "L" ? "Laki-laki 👦" : g === "P" ? "Perempuan 👧" : "Siapa saja 👥");

export async function showSettings(m, sock, db) {
  const jid = m.sender;
  const a = getAnonim(db);
  const profile = a.profiles[jid];
  if (!profile) return m.reply(raraWrap("Chat Anonim", "📝 Kamu belum daftar. *.anonim daftar* dulu ya."));
  const premium = isPremiumEffective(a, jid);
  const s = profile.settings || {};
  const lock = premium ? "" : " 🔒 (Premium)";
  const interests = (profile.interests || []).length ? profile.interests.join(", ") : "—";
  return m.reply(raraWrap("Pengaturan Chat Anonim", [
    "⚙️ *Pengaturan Kamu*",
    "",
    `• Gender: ${GENDER_LABEL(profile.gender)} — ganti: *.anonim settings gender L/P*`,
    `• Mencari: ${SEARCH_LABEL(s.filterGender)}${lock}`,
    `• Umur partner: ${s.filterAgeMin || s.filterAgeMax ? `${s.filterAgeMin || MIN_AGE}-${s.filterAgeMax || MAX_AGE} th` : "semua"}${lock}`,
    `• Lokasi partner: ${s.filterLocation || "semua"}${lock}`,
    `• Minat: ${interests}`,
    `• Bahasa: ${profile.lang === "en" ? "English" : "Indonesia"}`,
    "",
    "Kirim *.anonim settings minat <tag1, tag2, ...>* buat atur minat (mis: musik, game, film).",
    "Kirim *.anonim language id/en* buat ganti bahasa.",
    premium
      ? "\nAtur filter pencarian: *.anonim settings cari L/P/semua* · *umur <min> <max>* · *lokasi <kota>* · reset: *.anonim settings reset*"
      : "\n💎 Buka filter pencarian (gender/umur/lokasi partner): *.anonim premium*",
  ].join("\n")));
}

export async function applySettings(m, sock, db, args) {
  const jid = m.sender;
  const a = getAnonim(db);
  const profile = a.profiles[jid];
  if (!profile) return m.reply(raraWrap("Chat Anonim", "📝 Kamu belum daftar. *.anonim daftar* dulu ya."));
  const sub = (args[0] || "").toLowerCase();

  // ── FREE: gender sendiri & minat (bukan filter pencarian, jadi gak dikunci premium) ──
  if (sub === "gender") {
    const g = (args[1] || "").toUpperCase();
    if (g !== "L" && g !== "P") return m.reply(raraWrap("Chat Anonim", "⚠️ *.anonim settings gender L/P*"));
    profile.gender = g;
    db.save();
    return m.reply(raraWrap("Chat Anonim", `✅ Gender kamu diubah ke *${GENDER_LABEL(g)}*.`));
  }
  if (sub === "minat") {
    const raw = args.slice(1).join(" ");
    if (!raw.trim()) return m.reply(raraWrap("Chat Anonim", "⚠️ *.anonim settings minat <tag1, tag2, ...>* (mis: musik, game, film)"));
    const tags = raw.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10).map((x) => x.slice(0, 20));
    profile.interests = tags;
    db.save();
    return m.reply(raraWrap("Chat Anonim", `✅ Minat disimpan: ${tags.join(", ")}.`));
  }

  // ── PREMIUM ONLY: filter pencarian partner (cari/umur/lokasi) ──
  if (sub === "cari" || sub === "mencari") {
    if (!isPremiumEffective(a, jid)) return m.reply(raraWrap("Chat Anonim", "🔒 Filter pencarian cuma buat Premium.\n\n💎 Upgrade: *.anonim premium*"));
    const g = (args[1] || "").toUpperCase();
    if (g === "SEMUA" || g === "ALL") updateSettings(db, jid, { filterGender: null });
    else if (g === "L" || g === "P") updateSettings(db, jid, { filterGender: g });
    else return m.reply(raraWrap("Chat Anonim", "⚠️ *.anonim settings cari L/P/semua*"));
    return m.reply(raraWrap("Chat Anonim", "✅ Filter pencarian (gender partner) disimpan."));
  }
  if (sub === "umur") {
    if (!isPremiumEffective(a, jid)) return m.reply(raraWrap("Chat Anonim", "🔒 Filter umur cuma buat Premium.\n\n💎 Upgrade: *.anonim premium*"));
    const min = parseInt(args[1], 10), max = parseInt(args[2], 10);
    if (!min || !max || min < MIN_AGE || max > MAX_AGE || min > max) {
      return m.reply(raraWrap("Chat Anonim", `⚠️ *.anonim settings umur <min> <max>* (${MIN_AGE}-${MAX_AGE})`));
    }
    updateSettings(db, jid, { filterAgeMin: min, filterAgeMax: max });
    return m.reply(raraWrap("Chat Anonim", `✅ Filter umur partner disimpan: ${min}-${max} th.`));
  }
  if (sub === "lokasi") {
    if (!isPremiumEffective(a, jid)) return m.reply(raraWrap("Chat Anonim", "🔒 Filter lokasi cuma buat Premium.\n\n💎 Upgrade: *.anonim premium*"));
    const loc = args.slice(1).join(" ").trim();
    if (!loc) return m.reply(raraWrap("Chat Anonim", "⚠️ *.anonim settings lokasi <kota>*"));
    updateSettings(db, jid, { filterLocation: loc.slice(0, 40) });
    return m.reply(raraWrap("Chat Anonim", `✅ Filter lokasi partner disimpan: ${loc}.`));
  }
  if (sub === "reset") {
    updateSettings(db, jid, { filterGender: null, filterAgeMin: null, filterAgeMax: null, filterLocation: null });
    return m.reply(raraWrap("Chat Anonim", "✅ Semua filter pencarian direset ke semua/default."));
  }
  return showSettings(m, sock, db);
}

// ── statistik (ala Telegram: Total obrolan, Pesan terkirim, Rating, Teman diundang, Status, Dinilai) ──
export async function showStatistik(m, sock, db) {
  const jid = m.sender;
  const a = getAnonim(db);
  const profile = a.profiles[jid];
  if (!profile) return m.reply(raraWrap("Chat Anonim", "📝 Kamu belum daftar. *.anonim daftar* dulu ya."));
  const premium = isPremiumEffective(a, jid);
  const s = profile.stats || {};
  const bonus = bonusFindToday(profile);
  return m.reply(raraWrap("Statistik Chat Anonim", [
    "📊 *Statistik Kamu*",
    "",
    `• Total obrolan: ${s.chatCount || 0}`,
    `• Pesan terkirim: ${s.messagesSent || 0}`,
    `• Rating: 👍 ${s.ratingUp || 0} · 👎 ${s.ratingDown || 0}`,
    `• Teman diundang: ${s.invitedCount || 0}`,
    `• Status: ${premium ? "💎 Premium" : "🆓 Gratis"}`,
    `• Orang yang kamu nilai: ${s.ratedCount || 0}`,
    bonus > 0 ? `• 🎰 Bonus limit cari hari ini: +${bonus}` : "",
  ].filter(Boolean).join("\n")));
}

export async function showPremiumInfo(m, sock, db) {
  const jid = m.sender;
  const a = getAnonim(db);
  const profile = a.profiles[jid];
  const premium = isPremiumEffective(a, jid);
  const lines = [
    `💎 Status: ${premium ? "Premium aktif ✅" : "Belum Premium"}`,
    "",
    "Keuntungan Premium di Chat Anonim:",
    "🔓 Filter gender partner saat cari partner",
    "🔓 Filter umur & lokasi partner",
    `⬆️ Limit cari partner lebih besar (${PREMIUM_DAILY_FIND}x/hari vs ${FREE_DAILY_FIND}x)`,
    "🏅 Badge VIP tampil ke partner tiap chat",
  ];
  if (profile) {
    lines.push(
      "",
      "🎰 *Ajak teman & gacha referral!*",
      `Kode referral kamu: *${profile.refCode}*`,
      "Suruh teman ketik kode ini pas *.anonim daftar* (step kode referral).",
      "Tiap 1 teman daftar pakai kodemu = 1x roll gacha, hadiah RANDOM:",
      "🎁 +3/+5 limit cari hari ini (umum) · 🎉 +10 limit (jarang) · 💎 Premium 1 hari · 💎✨ JACKPOT Premium 3 hari",
      `Teman diundang: ${profile.stats?.invitedCount || 0}`,
    );
  }
  lines.push("", premium ? "Atur filter: *.anonim settings*" : "Upgrade premium bot: *.buyprem*");
  return m.reply(raraWrap("Premium Chat Anonim", lines.join("\n")));
}

export function helpText() {
  return raraWrap("Chat Anonim", [
    "👋 *Chat Anonim* 🕵️",
    "Ngobrol sama orang acak secara anonim. Identitasmu gak pernah dibagikan.",
    "",
    "Perintah:",
    "📝 .anonim daftar — daftar/isi profil",
    "🚫 .anonim bataldaftar — berhenti pakai fitur ini",
    "🔍 .anonim find — cari partner",
    "⏩ .anonim next — ganti partner",
    "🛑 .anonim stop — akhiri obrolan",
    "⚙️ .anonim settings — gender, umur & lokasi (Premium)",
    "🌐 .anonim language — ganti bahasa",
    "💎 .anonim premium — fitur VIP + kode referral",
    "📊 .anonim statistik — statistik kamu",
    "🚩 .anonim report <alasan> — laporkan partner",
    "❓ .anonim help — bantuan ini",
  ].join("\n"));
}

export function welcomeText(profile) {
  if (!profile) {
    return raraWrap("Chat Anonim", [
      "👋 Halo!",
      "",
      "Selamat datang di *Chat Anonim* 🕵️",
      "Ngobrol sama orang acak secara *anonim*. Identitasmu gak pernah dibagikan ke partner.",
      "",
      "Daftar dulu buat mulai: *.anonim daftar*",
      "",
      "Perintah lainnya: *.anonim help*",
    ].join("\n"));
  }
  return raraWrap("Chat Anonim", [
    `👋 Halo, *${profile.name}*!`,
    "",
    "Tekan 🔍 *.anonim find* buat mulai cari partner!",
    "",
    "📊 .anonim statistik · 💎 .anonim premium · ⚙️ .anonim settings",
    "Perintah lainnya: *.anonim help*",
  ].join("\n"));
}

// ── relay pesan (hook non-command di handler.js) ──
// TODO (lintas-platform arah TG→WA): kalau pesan datang dari Telegram (sock = bridgeSock
// TG) dan partner-nya jid WA asli, bridgeSock.sendMessage(waJid,...) BELUM bisa — perlu
// akses main WA sock. Scope saat ini WA-first (permintaan owner 6 Okt); WA→TG(partner)
// otomatis jalan karena ambient sock di WA selalu sock utama yang sudah di-wrap
// wrapOutboundSends (connection.js) — gratis tanpa kode tambahan.
export async function relayMessage(m, sock, db) {
  const a = getAnonim(db);
  const me = a.sessions[m.sender];
  if (!me) return false;
  if (m.chat !== m.sender) return false; // relay cuma di DM
  const now = Date.now();
  if (m.mtype && !TEXT_TYPES.has(m.mtype)) {
    const lastNotice = me._mediaNoticeAt || 0;
    if (now - lastNotice > 5000) {
      me._mediaNoticeAt = now;
      db.save();
      await m.reply(raraWrap("Chat Anonim", "📵 Media (foto/video/stiker/dll) gak bisa diteruskan di Chat Anonim — teks aja ya."));
    }
    return true;
  }
  const text = String(m.text || "").trim();
  if (!text) return true;
  if (text.startsWith(".")) return false; // command → biarin dispatch normal
  if (now - (me.lastRelayAt || 0) < _floodMs) {
    const lastNotice = me._floodNoticeAt || 0;
    if (now - lastNotice > 3000) {
      me._floodNoticeAt = now;
      db.save();
      await m.reply(raraWrap("Chat Anonim", "⏳ Pelan-pelan ya, jangan spam."));
    }
    return true;
  }
  me.lastRelayAt = now;
  me.lastActive = now;
  const partnerRec = a.sessions[me.partner];
  if (partnerRec) partnerRec.lastActive = now;
  const senderProfile = a.profiles[m.sender];
  const badge = isPremiumEffective(a, m.sender) ? "🏅 " : "";
  if (senderProfile) senderProfile.stats.messagesSent = (senderProfile.stats.messagesSent || 0) + 1;
  db.save();
  const sent = await dm(sock, me.partner, raraWrap("Stranger 💬", badge + text.slice(0, MAX_LEN)));
  if (!sent) {
    await closeSession(sock, db, m.sender, "Partner kamu gak bisa dihubungi — sesi ditutup.");
  }
  return true;
}

// ── sweeper: sesi idle & antrean kedaluwarsa ──
export async function initAnonimSweeper(sock, intervalMs = 60 * 1000) {
  if (_sweeperInterval) clearInterval(_sweeperInterval);
  const sweep = async () => {
    try {
      const db = getDatabase();
      const a = getAnonim(db);
      const now = Date.now();
      const seen = new Set();
      for (const [jid, rec] of Object.entries(a.sessions)) {
        if (seen.has(jid)) continue;
        seen.add(jid); seen.add(rec.partner);
        if (now - (rec.lastActive || rec.startedAt || 0) > _idleMs) {
          await closeSession(sock, db, jid, "Sesi ditutup otomatis: gak ada balasan selama 1 jam.");
        }
      }
      const before = a.queue.length;
      a.queue = a.queue.filter((q) => now - (q.at || 0) <= _queueTimeoutMs);
      if (a.queue.length !== before) db.save();
    } catch { /* sabar */ }
  };
  _sweeperInterval = setInterval(sweep, intervalMs);
  return true;
}
