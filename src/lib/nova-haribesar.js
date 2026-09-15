// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-haribesar.js — NOTIFIER HARI BESAR & TANGGAL MERAH INDONESIA
// (request owner 16 Sep 2026): bot kirim pesan otomatis SEKALI per hari
// jam 08:00 WIB ke semua chat yang langganan — "Selamat Hari X" + tanggal
// + badge tanggal merah + pesan inspirasi buatan AI (fallback template).
//
// Kalender TETAP (Gregorian): hari besar nasional + tanggal merah libur
// TETAP (1 Jan, 1 Mei, 17 Agu, 10 Nov, 25 Des). Libur bergerak (Idulfitri,
// Nyepi, dll — kalender Hijriah/Candra) TIDAK di-hardcode biar gak pernah
// salah tanggal: owner tinggal `.haribesar tambah DD-MM-YYYY | Nama` untuk
// hari itu, atau `.haribesar tambah DD-MM | Nama` untuk tahunan tetap.

import { getDatabase } from "./nova-database.js";
import { claraWrap } from "./nova-menu-style.js";

const KEY = "haribesarState";
const JAM_KIRIM = "08:00"; // WIB — jam kirim harian (request owner)

const HARI_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// ─── KALENDER TAHUNAN TETAP (MM-DD) ───
// merah: true = tanggal merah (libur nasional tetap)
const HARI_TAHUNAN = {
  "01-01": { nama: "Tahun Baru Masehi", emoji: "🎆", merah: true },
  "25-01": { nama: "Hari Gizi Nasional", emoji: "🥗", merah: false },
  "04-02": { nama: "Hari Kanker Sedunia", emoji: "🎗️", merah: false },
  "09-02": { nama: "Hari Pers Nasional", emoji: "📰", merah: false },
  "14-02": { nama: "Hari Kasih Sayang Sedunia", emoji: "❤️", merah: false },
  "08-03": { nama: "Hari Perempuan Sedunia", emoji: "👩", merah: false },
  "22-03": { nama: "Hari Air Sedunia", emoji: "💧", merah: false },
  "07-04": { nama: "Hari Kesehatan Sedunia", emoji: "🩺", merah: false },
  "21-04": { nama: "Hari Kartini", emoji: "🌸", merah: false },
  "22-04": { nama: "Hari Bumi", emoji: "🌍", merah: false },
  "23-04": { nama: "Hari Buku Sedunia", emoji: "📚", merah: false },
  "01-05": { nama: "Hari Buruh Internasional", emoji: "👷", merah: true },
  "20-05": { nama: "Hari Kebangkitan Nasional", emoji: "⚡", merah: false },
  "01-06": { nama: "Hari Lahir Pancasila", emoji: "🇮🇩", merah: false },
  "05-06": { nama: "Hari Lingkungan Hidup Sedunia", emoji: "🌱", merah: false },
  "26-06": { nama: "Hari Anti Narkoba Internasional", emoji: "🚫", merah: false },
  "22-07": { nama: "Hari Anak Nasional", emoji: "🧒", merah: false },
  "17-08": { nama: "Hari Proklamasi Kemerdekaan RI", emoji: "🇮🇩", merah: true },
  "08-09": { nama: "Hari Literasi Sedunia", emoji: "📖", merah: false },
  "02-10": { nama: "Hari Batik Nasional", emoji: "🧵", merah: false },
  "10-10": { nama: "Hari Kesehatan Jiwa Sedunia", emoji: "🧠", merah: false },
  "16-10": { nama: "Hari Pangan Sedunia", emoji: "🌾", merah: false },
  "24-10": { nama: "Hari Dokter Nasional", emoji: "👨‍⚕️", merah: false },
  "27-10": { nama: "Hari Pustakawan Nasional", emoji: "🏛️", merah: false },
  "28-10": { nama: "Hari Sumpah Pemuda", emoji: "💪", merah: false },
  "10-11": { nama: "Hari Pahlawan", emoji: "🎖️", merah: true },
  "12-11": { nama: "Hari Ayah Nasional", emoji: "👨", merah: false },
  "20-11": { nama: "Hari Anak Sedunia", emoji: "🎈", merah: false },
  "25-11": { nama: "Hari Guru Nasional", emoji: "🎓", merah: false },
  "01-12": { nama: "Hari AIDS Sedunia", emoji: "🎗️", merah: false },
  "03-12": { nama: "Hari Penyandang Disabilitas Internasional", emoji: "♿", merah: false },
  "09-12": { nama: "Hari Anti Korupsi Internasional", emoji: "⚖️", merah: false },
  "10-12": { nama: "Hari Hak Asasi Manusia", emoji: "🕊️", merah: false },
  "22-12": { nama: "Hari Ibu", emoji: "🌷", merah: false },
  "25-12": { nama: "Hari Raya Natal", emoji: "🎄", merah: true },
};

// template fallback kalau AI inspirasi lambat/down
const INSPIRASI_TEMPLATE = [
  "Semoga hari istimewa ini jadi pengingat bahwa hal-hal kecil yang kita lakukan dengan tulus selalu berarti untuk Indonesia.",
  "Mari jadikan hari ini momentum untuk jadi versi diri yang lebih baik dan bermanfaat bagi sekitar.",
  "Sejarah hari ini mengajarkan kita bahwa semangat dan kerja keras tidak pernah sia-sia.",
  "Rayakan hari ini dengan penuh syukur, dan sebarkan kebaikan ke orang-orang di sekitar kita.",
  "Setiap hari besar adalah cermin: masih banyak hal baik yang bisa kita mulai hari ini juga.",
];

// ─── STATE (persist db — tahan restart) ───
// { subs: [jid...], allGroups: bool, sentYmd: { [chat]: "YYYY-MM-DD" },
//   custom: [{ key: "MM-DD" | "YYYY-MM-DD", nama, emoji, merah }] }
function _load() {
  try {
    const s = getDatabase()?.setting(KEY);
    if (s && typeof s === "object") return s;
  } catch {}
  return { subs: [], allGroups: false, sentYmd: {}, custom: [] };
}
function _save(state) {
  try { getDatabase()?.setting(KEY, state); } catch (e) { console.error("haribesar save error:", e.message); }
}

const pad = (n) => String(n).padStart(2, "0");
function wibNow() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return {
    hm: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    ymd: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
  };
}

/** tanggal "YYYY-MM-DD" → { mmdd, hari, tanggalIndo } */
function parseYmd(ymd) {
  const [y, m, dd] = String(ymd || "").split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !dd) return null;
  const dt = new Date(Date.UTC(y, m - 1, dd));
  return {
    ddmm: `${pad(dd)}-${pad(m)}`, // DD-MM — konvensi Indonesia, konsisten dgn HARI_TAHUNAN
    hari: NAMA_HARI[dt.getUTCDay()],
    tanggalIndo: `${NAMA_HARI[dt.getUTCDay()]}, ${dd} ${HARI_BULAN[m - 1]} ${y}`,
  };
}

/**
 * getHariBesar(ymd) → entry hari ini atau null.
 * Urutan: custom exact (YYYY-MM-DD, sekali pakai tahun itu) → custom tahunan
 * (MM-DD) → kalender built-in (MM-DD).
 */
export function getHariBesar(ymd) {
  const p = parseYmd(ymd);
  if (!p) return null;
  const st = _load();
  const exact = (st.custom || []).find((c) => c.key === ymd);
  if (exact) return { nama: exact.nama, emoji: exact.emoji || "🎉", merah: !!exact.merah, custom: true };
  const yearly = (st.custom || []).find((c) => c.key === p.ddmm);
  if (yearly) return { nama: yearly.nama, emoji: yearly.emoji || "🎉", merah: !!yearly.merah, custom: true };
  const builtin = HARI_TAHUNAN[p.ddmm];
  if (builtin) return { ...builtin, custom: false };
  return null;
}

/** daftar custom + built-in yang jatuh 30 hari ke depan (buat status/list) */
export function upcomingHariBesar(days = 30) {
  const out = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(Date.now() + 7 * 3600 * 1000 + i * 86400000);
    const ymd = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const e = getHariBesar(ymd);
    if (e) out.push({ ymd, ...e });
  }
  return out;
}

/** tambah hari custom: date "DD-MM" (tahunan) atau "DD-MM-YYYY" (tahun itu saja) */
export function addCustomDay(dateStr, nama, merah = false) {
  const s = String(dateStr || "").trim();
  const parts = s.split("-");
  if (parts.length !== 2 && parts.length !== 3) return { ok: false, error: "tanggal" };
  const dd = parseInt(parts[0], 10), mm = parseInt(parts[1], 10);
  if (!dd || !mm || dd < 1 || dd > 31 || mm < 1 || mm > 12) return { ok: false, error: "tanggal" };
  let key = `${pad(dd)}-${pad(mm)}`; // tahunan — DD-MM konsisten HARI_TAHUNAN
  if (parts.length === 3) {
    const yyyy = parseInt(parts[2], 10);
    if (!yyyy || yyyy < 2000 || yyyy > 2100) return { ok: false, error: "tahun" };
    key = `${yyyy}-${pad(mm)}-${pad(dd)}`; // exact ISO — nyocok dgn ymd dispatch
  }
  if (!String(nama || "").trim()) return { ok: false, error: "nama" };
  const st = _load();
  st.custom = (st.custom || []).filter((c) => c.key !== key);
  st.custom.push({ key, nama: String(nama).trim().slice(0, 60), emoji: "🎉", merah: !!merah });
  _save(st);
  return { ok: true, key, yearly: parts.length === 2 };
}

export function removeCustomDay(dateStr) {
  const s = String(dateStr || "").trim();
  const parts = s.split("-");
  if (parts.length !== 2 && parts.length !== 3) return { ok: false, removed: 0 };
  const dd = parseInt(parts[0], 10), mm = parseInt(parts[1], 10);
  let key = `${pad(dd)}-${pad(mm)}`;
  if (parts.length === 3) key = `${parseInt(parts[2], 10)}-${pad(mm)}-${pad(dd)}`;
  const st = _load();
  const before = (st.custom || []).length;
  st.custom = (st.custom || []).filter((c) => c.key !== key);
  _save(st);
  return { ok: true, removed: before - (st.custom || []).length };
}

export function listCustomDays() {
  return (_load().custom || []).slice();
}

// ─── langganan ───
export function setSubscribed(chat, on) {
  const st = _load();
  st.subs = st.subs || [];
  if (on) { if (!st.subs.includes(chat)) st.subs.push(chat); }
  else st.subs = st.subs.filter((c) => c !== chat);
  _save(st);
  return st.subs.length;
}
export function isSubscribed(chat) {
  return (_load().subs || []).includes(chat);
}
export function setAllGroups(on) {
  const st = _load();
  st.allGroups = !!on;
  _save(st);
  return st.allGroups;
}
export function getAllGroups() { return !!_load().allGroups; }
export function getSubs() { return (_load().subs || []).slice(); }

// ─── AI inspirasi (SEKALI per hari — cache per ymd biar hemat) ───
let _aiOverride = null;
/** seam test: inject fungsi AI deterministik */
export function _setHariBesarAiForTest(fn) { _aiOverride = fn || null; }
let _aiCache = { ymd: null, text: "" };

async function aiInspirasi(entry, tanggalIndo) {
  if (typeof _aiOverride === "function") return String(await _aiOverride(entry, tanggalIndo)).slice(0, 300);
  if (_aiCache.ymd === wibNow().ymd && _aiCache.text) return _aiCache.text;
  try {
    const { aiChainChat } = await import("./nova-ai-fallback.js");
    const txt = await Promise.race([
      aiChainChat(
        `Hari ini ${entry.nama} di Indonesia (${tanggalIndo}). ` +
          `Buat pesan inspirasi singkat 2-3 kalimat untuk warga Indonesia menyambut hari ini: hangat, menyemangati, dan relevan dengan makna hari tersebut. ` +
          `Tanpa emoji, tanpa tanda kutip. Balas HANYA isi pesannya.`,
        { persona: "Nova AI" },
      ),
      new Promise((_, rej) => setTimeout(() => rej(new Error("ai slow")), 20000)),
    ]);
    const clean = String(txt || "").split("\n")[0].trim().replace(/["'`]/g, "").slice(0, 280);
    if (clean) { _aiCache = { ymd: wibNow().ymd, text: clean }; return clean; }
  } catch (e) {
    console.error("haribesar ai error:", e.message);
  }
  return INSPIRASI_TEMPLATE[Math.floor(Math.random() * INSPIRASI_TEMPLATE.length)];
}

/** bangun teks pesan hari besar (sekali per dispatch, dipakai semua chat) */
export async function buildHariBesarText(entry, ymd) {
  const p = parseYmd(ymd);
  const inspirasi = await aiInspirasi(entry, p.tanggalIndo);
  const lines = [
    `${entry.emoji} *Selamat ${entry.nama}!*`,
    `📅 ${p.tanggalIndo}`,
  ];
  if (entry.merah) lines.push(`🔴 *Tanggal Merah — Libur Nasional*`);
  lines.push("", `✨ _${inspirasi}_`);
  return claraWrap("Hari Besar", lines);
}

// ─── dispatch: kirim ke semua target yang belum kirim hari ini ───
async function _targetChats(sock) {
  const st = _load();
  const targets = new Set(st.subs || []);
  if (st.allGroups) {
    try {
      const groups = (await sock.groupFetchAllParticipating()) || {};
      for (const gid of Object.keys(groups)) targets.add(gid);
    } catch (e) {
      console.error("haribesar groupFetch error:", e.message);
    }
  }
  return [...targets];
}

export async function dispatchHariBesar(sock, ymd) {
  const entry = getHariBesar(ymd);
  if (!entry) return { sent: 0, day: null };
  const text = await buildHariBesarText(entry, ymd);
  const st = _load();
  let sent = 0;
  for (const chat of await _targetChats(sock)) {
    if ((st.sentYmd || {})[chat] === ymd) continue;
    try {
      await sock.sendMessage(chat, { text });
      st.sentYmd = st.sentYmd || {};
      st.sentYmd[chat] = ymd; // tandai HANYA setelah kirim sukses (persist setelah kirim)
      sent++;
      _save(st);
    } catch (e) {
      console.error("haribesar send error " + chat + ":", e.message);
    }
  }
  return { sent, day: entry.nama };
}

/** scheduler: cek tiap 30 dtk, jam 08:00 WIB → dispatch sekali per hari */
export function initHariBesarScheduler(sock) {
  if (global.__novaHariBesarTimer) return false;
  global.__novaHariBesarTimer = setInterval(async () => {
    try {
      const { hm, ymd } = wibNow();
      if (hm !== JAM_KIRIM) return;
      const r = await dispatchHariBesar(sock, ymd);
      if (r.day) console.log(`[HARIBESAR] ${r.day} → terkirim ke ${r.sent} chat`);
    } catch (e) {
      console.error("haribesar tick error:", e.message);
    }
  }, 30_000);
  if (global.__novaHariBesarTimer.unref) global.__novaHariBesarTimer.unref();
  console.log(`[HARIBESAR] scheduler terdaftar — cek harian jam ${JAM_KIRIM} WIB`);
  return true;
}

/** seam test: jalankan tick sekarang untuk ymd tertentu */
export async function _haribesarRunTickForTest(sock, ymd) {
  return dispatchHariBesar(sock, ymd);
}
