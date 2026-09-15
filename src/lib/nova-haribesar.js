// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-haribesar.js — NOTIFIER HARI BESAR & TANGGAL MERAH INDONESIA
// (request owner 16 Sep 2026): bot kirim pesan otomatis SEKALI per hari
// jam 08:00 WIB ke semua chat yang langganan — "Selamat Hari X" + tanggal
// + badge tanggal merah + pesan inspirasi buatan AI (fallback template).
//
// UPGRADE H-X (request owner 16 Sep 2026 — "tanda besok libur atau xx hari
// lagi libur... deteksi libur panjang"): bukan cuma hari-H —
//   • H-1  : "Besok Tanggal Merah!" (libur nasional besok)
//   • H-3  : "3 Hari Lagi Tanggal Merah"
//   • H-7  : "Minggu Lagi Tanggal Merah"
//   • LIBUR PANJANG: rangkaian libur nasional + weekend berurutan min 3 hari
//     (weekend polos gak dianggap — WAJIB ada libur nasional di dalamnya)
//
// UPGRADE KEDUA (owner 16 Sep 2026 — "jgn pakai api tp pakai dependencies
// aja"): GAK PAKAI API EKSTERNAL — data libur nasional dari PACKAGE
// date-holidays (dependencies package.json, tahan lama, satu titik kegagalan
// lebih sedikit). Libur bergerak (Idulfitri, Nyepi, Imlek, Waisak, dll)
// otomatis dari package per tahun; custom owner tetap jadi
// override/pelengkap (cuti bersama SKB, koreksi tanggal).
//
// SANITASI DATA: date-holidays 'ID' punya entri MAULID dobel per tahun
// (varian kalender salah — mis. 16 Jan 2026 valid + 25 Agu 2026 ngawur):
// entri nama sama yang muncul < 300 hari setelah kemunculan sebelumnya
// DIBUANG otomatis.

import Holidays from "date-holidays";
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
  "10-11": { nama: "Hari Pahlawan", emoji: "🎖️", merah: false }, // peringatan, BUKAN libur nasional
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

// ─── SKB 3 MENTERI RESMI PER TAHUN (override package — bisa geser dari SKB) ───
// Data package date-holidays TERNYATA meleset dari SKB resmi (mis. Idulfitri
// 2026 package=20-21 Mar, SKB=21-22 Mar; 16 Jan 2026 package salah label
// "Maulid" padahal Isra Mikraj). Layer ini menimpa package untuk tahun yang
// SKB-nya sudah terbit; tahun di luar layer → fallback package (dgn sanitasi).
// SUMBER: SKB 3 Menteri No 1497/2/5 Tahun 2025 (thn 2026) & No 1205/3/2
// Tahun 2026 (thn 2027, terbit 15 Sep 2026).
const SKB_TAHUNAN = {
  2026: {
    libur: { // 17 hari libur nasional
      "2026-01-01": "Tahun Baru Masehi 2026",
      "2026-01-16": "Isra Mikraj Nabi Muhammad SAW",
      "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
      "2026-03-19": "Hari Suci Nyepi (Tahun Baru Saka 1948)",
      "2026-03-21": "Hari Raya Idulfitri 1447 H",
      "2026-03-22": "Hari Raya Idulfitri 1447 H",
      "2026-04-03": "Wafat Yesus Kristus",
      "2026-04-05": "Kebangkitan Yesus Kristus (Paskah)",
      "2026-05-01": "Hari Buruh Internasional",
      "2026-05-14": "Kenaikan Yesus Kristus",
      "2026-05-27": "Hari Raya Iduladha 1447 H",
      "2026-05-31": "Hari Raya Waisak 2570 BE",
      "2026-06-01": "Hari Lahir Pancasila",
      "2026-06-16": "Tahun Baru Islam 1448 H",
      "2026-08-25": "Maulid Nabi Muhammad SAW",
      "2026-12-25": "Hari Raya Natal",
    },
    cuti: { // 8 hari cuti bersama
      "2026-02-16": "Cuti Bersama Tahun Baru Imlek",
      "2026-03-18": "Cuti Bersama Hari Suci Nyepi",
      "2026-03-20": "Cuti Bersama Hari Raya Idulfitri",
      "2026-03-23": "Cuti Bersama Hari Raya Idulfitri",
      "2026-03-24": "Cuti Bersama Hari Raya Idulfitri",
      "2026-05-15": "Cuti Bersama Kenaikan Yesus Kristus",
      "2026-05-28": "Cuti Bersama Hari Raya Iduladha",
      "2026-12-24": "Cuti Bersama Menjelang Natal",
    },
  },
  2027: {
    libur: { // 17 hari libur nasional
      "2027-01-01": "Tahun Baru Masehi 2027",
      "2027-01-05": "Isra Mikraj Nabi Muhammad SAW",
      "2027-02-06": "Tahun Baru Imlek 2578 Kongzili",
      "2027-03-08": "Hari Suci Nyepi (Tahun Baru Saka 1949)",
      "2027-03-10": "Hari Raya Idulfitri 1448 H",
      "2027-03-11": "Hari Raya Idulfitri 1448 H",
      "2027-03-26": "Wafat Yesus Kristus",
      "2027-03-28": "Kebangkitan Yesus Kristus (Paskah)",
      "2027-05-01": "Hari Buruh Internasional",
      "2027-05-06": "Kenaikan Yesus Kristus",
      "2027-05-17": "Hari Raya Iduladha 1448 H",
      "2027-05-20": "Hari Raya Waisak 2571 BE",
      "2027-06-01": "Hari Lahir Pancasila",
      "2027-06-06": "Tahun Baru Islam 1449 H",
      "2027-08-15": "Maulid Nabi Muhammad SAW",
      "2027-12-26": "Isra Mikraj Nabi Muhammad SAW",
    },
    cuti: { // 8 hari cuti bersama
      "2027-02-05": "Cuti Bersama Tahun Baru Imlek",
      "2027-03-09": "Cuti Bersama Hari Raya Idulfitri",
      "2027-03-12": "Cuti Bersama Hari Raya Idulfitri",
      "2027-03-15": "Cuti Bersama Hari Raya Idulfitri",
      "2027-03-25": "Cuti Bersama Wafat Yesus Kristus",
      "2027-05-18": "Cuti Bersama Hari Raya Iduladha",
      "2027-05-19": "Cuti Bersama Hari Raya Waisak",
      "2027-12-24": "Cuti Bersama Menjelang Natal",
    },
  },
};
// (17-08 Kemerdekaan & 25-12 Natal ambil dari built-in HARI_TAHUNAN — nama
//  lebih pendek, tetap merah. SKB tetap konsisten.)

// ─── DATE-HOLIDAYS (package — TANPA API eksternal) ───
// map per tahun { "YYYY-MM-DD": "Nama Libur" } — public holiday Indonesia,
// termasuk libur bergerak (Idulfitri, Nyepi, Imlek, Waisak, dll).
let __hd = null;
const __hdCache = {};
function _hd() {
  if (__hd === null) {
    try { __hd = new Holidays("ID"); } catch (e) { console.error("haribesar date-holidays init error:", e.message); __hd = false; }
  }
  return __hd || null;
}
function _hdPublicMap(tahun) {
  const y = Number(tahun);
  if (__hdCache[y]) return __hdCache[y];
  const map = {};
  const hd = _hd();
  if (hd) {
    try {
      const list = (hd.getHolidays(y) || []).filter((h) => h.type === "public");
      const lastSeen = {}; // anti data-rusak: nama dobel < 300 hari dibuang
      for (const h of list) {
        const ymd = String(h.date || "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) continue;
        const nm = String(h.name || "Libur Nasional").trim();
        const ts = Date.parse(ymd);
        const prev = lastSeen[nm];
        if (prev !== undefined && ts - prev < 300 * 86400000) continue;
        lastSeen[nm] = ts;
        if (map[ymd]) map[ymd] += " & " + nm; // 2 libur tanggal sama (mis. Maulid+Natal 25-12-2027)
        else map[ymd] = nm;
      }
    } catch (e) { console.error("haribesar getHolidays error:", e.message); }
  }
  __hdCache[y] = map;
  return map;
}

/** emoji khas per jenis libur package (fallback 🎉) */
function _emojiForNama(nama) {
  const s = String(nama || "").toLowerCase();
  if (/fitri/.test(s)) return "🌙";
  if (/adha|qurban|maulid|islam|mikraj|isra/.test(s)) return "🕌";
  if (/natal|christmas/.test(s)) return "🎄";
  if (/yesus|kristus/.test(s)) return "✝️";
  if (/nyepi/.test(s)) return "🕯️";
  if (/imlek/.test(s)) return "🧧";
  if (/waisak/.test(s)) return "☸️";
  if (/pancasila|kemerdekaan/.test(s)) return "🇮🇩";
  if (/buruh/.test(s)) return "👷";
  if (/tahun baru/.test(s)) return "🎆";
  return "🎉";
}

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
    y, mm: m, dd,
    ddmm: `${pad(dd)}-${pad(m)}`, // DD-MM — konvensi Indonesia, konsisten dgn HARI_TAHUNAN
    hari: NAMA_HARI[dt.getUTCDay()],
    tanggalIndo: `${NAMA_HARI[dt.getUTCDay()]}, ${dd} ${HARI_BULAN[m - 1]} ${y}`,
  };
}

/** ymd + n hari → ISO YYYY-MM-DD */
function ymdAdd(ymd, n) {
  const [y, m, dd] = String(ymd).split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1, dd + n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** selisih hari a → b (b - a) */
function diffHari(aYmd, bYmd) {
  const [ay, am, ad] = String(aYmd).split("-").map((x) => parseInt(x, 10));
  const [by, bm, bd] = String(bYmd).split("-").map((x) => parseInt(x, 10));
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** weekend = Sabtu / Minggu */
function isWeekend(ymd) {
  const p2 = parseYmd(ymd);
  return p2?.hari === "Sabtu" || p2?.hari === "Minggu";
}

/** cuti bersama SKB (libur kerja ASN/kantor — BUKAN hari besar, gak digreet) */
export function getCutiOn(ymd) {
  const p2 = parseYmd(ymd);
  if (!p2) return null;
  const nama = SKB_TAHUNAN[p2.y]?.cuti?.[ymd];
  if (!nama) return null;
  return { nama, emoji: "🏖️", merah: true, cuti: true, custom: false, skb: true };
}

/** libur nasional = custom merah → built-in merah → SKB → cuti bersama → package */
export function getLiburOn(ymd) {
  const e = getHariBesar(ymd);
  if (e && e.merah) return e;
  return getCutiOn(ymd); // cuti bersama ikut dihitung LIBUR (H-1/chain/daftar)
}

/** hitung rantai hari "tidak kerja" berurutan mulai startYmd (libur + weekend) */
function hitungRantai(startYmd) {
  let total = 0;
  const namaLibur = [];
  for (let i = 0; i < 60; i++) {
    const y = ymdAdd(startYmd, i);
    const libur = getLiburOn(y);
    if (libur || isWeekend(y)) {
      total++;
      if (libur) namaLibur.push(libur.nama);
    } else break;
  }
  return { total, namaLibur: [...new Set(namaLibur)] }; // dedup nama dobel dalam rantai
}

/**
 * cariLiburPanjang — rangkaian libur nasional + weekend berurutan min 3 hari,
 * mulai dari fromYmd..+horizon. Weekend polos (min 2 hari) gak dianggap:
 * WAJIB ada libur nasional di dalam rantai (pola reference owner).
 */
export function cariLiburPanjang(fromYmd, horizon = 3) {
  for (let i = 0; i <= horizon; i++) {
    const start = ymdAdd(fromYmd, i);
    const r = hitungRantai(start);
    if (r.total >= 3 && r.namaLibur.length > 0) {
      return { mulaiYmd: start, totalHari: r.total, nama: r.namaLibur.join(" & ") };
    }
  }
  return null;
}

/** libur nasional terdekat mulai fromYmd → { ymd, nama } | null */
export function nextLibur(fromYmd, maxDays = 90) {
  for (let i = 0; i <= maxDays; i++) {
    const y = ymdAdd(fromYmd, i);
    const e = getLiburOn(y);
    if (e) return { ymd: y, nama: e.nama };
  }
  return null;
}

/** daftar libur nasional ke depan + label H-X (buat .haribesar libur) */
export function listLiburMendatang(fromYmd = null, days = 90) {
  const base = fromYmd || wibNow().ymd;
  const out = [];
  for (let i = 0; i <= days; i++) {
    const y = ymdAdd(base, i);
    const e = getLiburOn(y);
    if (e) out.push({ ymd: y, nama: e.nama, emoji: e.emoji || "🔴", h: i });
  }
  return out;
}

/** daftar hari PENTING (peringatan — bukan libur nasional) mendatang,
 * sumber: built-in + custom owner (package date-holidays = libur, gak masuk).
 * Dipakai command .haripenting */
export function listHariPentingMendatang(fromYmd = null, days = 90) {
  const base = fromYmd || wibNow().ymd;
  const out = [];
  for (let i = 0; i <= days; i++) {
    const y = ymdAdd(base, i);
    const e = getHariBesar(y);
    if (e && !e.merah) out.push({ ymd: y, nama: e.nama, emoji: e.emoji || "✨", h: i });
  }
  return out;
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
  // SKB 3 Menteri resmi per tahun → menimpa package (tanggal lebih akurat)
  const skbNama = SKB_TAHUNAN[p.y]?.libur?.[ymd];
  if (skbNama) return { nama: skbNama, emoji: _emojiForNama(skbNama), merah: true, custom: false, skb: true };
  // package date-holidays — HANYA fallback tahun di luar SKB
  // (tahun SKB = otoritatif: tanggal package bisa meleset, jangan dipakai)
  if (!SKB_TAHUNAN[p.y]) {
    const hdNama = _hdPublicMap(p.y)[ymd];
    if (hdNama) return { nama: hdNama, emoji: _emojiForNama(hdNama), merah: true, custom: false, paket: true };
  }
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
export async function buildHariBesarText(entry, ymd, extra = null) {
  const p = parseYmd(ymd);
  const inspirasi = await aiInspirasi(entry, p.tanggalIndo);
  const lines = [
    `${entry.emoji} *Selamat ${entry.nama}!*`,
    `📅 ${p.tanggalIndo}`,
  ];
  if (entry.merah) lines.push(`🔴 *Tanggal Merah — Libur Nasional*`);
  if (extra) lines.push(extra);
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

// checkpoint countdown ke libur terdekat (anti spam: gak tiap hari)
const CHECKPOINTS = [7, 3, 1];

/** susun daftar event hari ini → [{ key, text }] (AI dipanggil maks 1x) */
async function _eventsForDay(ymd) {
  const events = [];
  const covered = new Set(); // chain start yang sudah ke-announce → jangan dobel

  // chain libur panjang dihitung SEKALI di awal (hari ini..H-3)
  const chain = cariLiburPanjang(ymd, 3);
  const chainEnd = chain ? ymdAdd(chain.mulaiYmd, chain.totalHari - 1) : null;

  // 1. HARI-H — sapaan hari besar (greeting + inspirasi AI)
  const today = getHariBesar(ymd);
  if (today) {
    let extra = null;
    if (chain && chain.mulaiYmd === ymd) {
      extra = `🏖️ Bagian dari libur panjang: *${chain.totalHari} hari* beruntun`;
      covered.add(chain.mulaiYmd);
    }
    events.push({ key: `h__${ymd}`, kind: "hariH", text: await buildHariBesarText(today, ymd, extra) });
  } else {
    // 1b. HARI CUTI BERSAMA — bukan hari besar, tapi tetap "hari ini libur"
    const cutiIni = getCutiOn(ymd);
    if (cutiIni) {
      const clines = [
        `🏖️ *Hari Ini Cuti Bersama!*`,
        `📅 ${parseYmd(ymd).tanggalIndo}`,
        `🏷️ ${cutiIni.nama}`,
      ];
      if (chain && chain.mulaiYmd === ymd) {
        clines.push(`🏖️ Bagian dari libur panjang: *${chain.totalHari} hari* beruntun`);
        covered.add(chain.mulaiYmd);
      }
      clines.push("", `Semoga cutinya menyenangkan! 😊`);
      events.push({ key: `cuti__${ymd}`, kind: "cuti", text: claraWrap("Hari Besar", clines.join("\n")) });
    }
  }

  // 2. COUNTDOWN — libur nasional terdekat: H-7 / H-3 / H-1
  const besokYmd = ymdAdd(ymd, 1);
  const nxt = nextLibur(besokYmd, 90);
  if (nxt) {
    const diff = diffHari(ymd, nxt.ymd);
    if (CHECKPOINTS.includes(diff)) {
      const np = parseYmd(nxt.ymd);
      const judul = diff === 1 ? "Besok Tanggal Merah!" : diff === 3 ? "3 Hari Lagi Tanggal Merah" : "Minggu Lagi Tanggal Merah";
      const lines = [
        `${diff === 1 ? "🔔" : "⏳"} *${judul}*`,
        `📅 ${np.tanggalIndo}`,
        `🏷️ ${nxt.nama}`,
        "",
        diff === 1 ? `Selesaikan urusan hari ini — besok libur! 😊` : `Catat jadwalnya, libur sebentar lagi! 😊`,
      ];
      // libur ini bagian chain libur panjang → merge info (jangan notif dobel)
      const dalamChain = chain && nxt.ymd >= chain.mulaiYmd && nxt.ymd <= chainEnd;
      if (dalamChain) {
        const awal = chain.mulaiYmd === nxt.ymd ? "awal" : "bagian";
        lines.push("", `🏖️ Sekaligus ${awal} libur panjang: *${chain.totalHari} hari* beruntun${chain.mulaiYmd !== nxt.ymd ? ` (mulai ${parseYmd(chain.mulaiYmd).tanggalIndo})` : ""}`);
        covered.add(chain.mulaiYmd);
      }
      // dedup PER CHECKPOINT (H-7/H-3/H-1 libur sama = 3 pesan beda, tiap satu sekali)
      events.push({ key: `hX_${diff}__${nxt.ymd}`, kind: "H-" + diff, text: claraWrap("Hari Besar", lines.join("\n")) });
    }
  }

  // 3. LIBUR PANJANG mulai hari ini..H-3 yang belum ke-cover pesan lain
  if (chain && !covered.has(chain.mulaiYmd)) {
    const cp = parseYmd(chain.mulaiYmd);
    const cs = parseYmd(ymdAdd(chain.mulaiYmd, chain.totalHari - 1));
    events.push({
      key: `long__${chain.mulaiYmd}`,
      kind: "panjang",
      text: claraWrap("Hari Besar", [
        `🏖️ *Ada Libur Panjang!*`,
        `Mulai : ${cp.tanggalIndo}`,
        `Durasi : *${chain.totalHari} hari* beruntun (sampai ${cs.tanggalIndo})`,
        `🏷️ ${chain.nama}`,
        "",
        `Cocok buat mudik, staycation, atau sekadar rehat 😊`,
      ].join("\n")),
    });
  }

  return events;
}

export async function dispatchHariBesar(sock, ymd) {
  const st = _load();
  const events = await _eventsForDay(ymd);
  if (!events.length) return { sent: 0, day: null, events: [] };
  const day = getHariBesar(ymd)?.nama || null;
  let sent = 0;
  const kinds = [];
  for (const chat of await _targetChats(sock)) {
    st.notified = st.notified || {};
    for (const ev of events) {
      const k = `${ev.key}__${chat}`;
      if (st.notified[k]) continue;
      // kompat data lama (sentYmd) biar gak dobel setelah upgrade
      if (ev.kind === "hariH" && (st.sentYmd || {})[chat] === ymd) continue;
      try {
        await sock.sendMessage(chat, { text: ev.text });
        st.notified[k] = Date.now(); // tandai HANYA setelah kirim sukses
        sent++;
        if (!kinds.includes(ev.kind)) kinds.push(ev.kind);
        _save(st);
      } catch (e) {
        console.error("haribesar send error " + chat + " (" + ev.kind + "):", e.message);
      }
    }
  }
  // bersihkan dedup tua (>120 hari) biar state gak bengkak
  try {
    const batas = Date.now() - 120 * 86400000;
    let n = 0;
    for (const k of Object.keys(st.notified)) {
      if (st.notified[k] < batas) { delete st.notified[k]; n++; }
    }
    if (n) _save(st);
  } catch {}
  return { sent, day, events: kinds };
}

/** scheduler: cek tiap 30 detik, jam 08:00 WIB → dispatch sekali per hari
 * (semua jenis event: hari-H, H-1/H-3/H-7, libur panjang) */
export function initHariBesarScheduler(sock) {
  if (global.__novaHariBesarTimer) return false;
  global.__novaHariBesarTimer = setInterval(async () => {
    try {
      const { hm, ymd } = wibNow();
      if (hm !== JAM_KIRIM) return;
      const r = await dispatchHariBesar(sock, ymd);
      if (r.events.length) console.log(`[HARIBESAR] ${ymd} event ${r.events.join(",")} → terkirim ${r.sent} pesan`);
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
