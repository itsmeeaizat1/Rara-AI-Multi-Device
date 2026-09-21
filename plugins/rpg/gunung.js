// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gunung.js — PENDAKIAN GUNUNG LEGENDA (request owner 21 Sep 2026, game petualangan #5, standar Game Designer)
// Solo progres persist + elemen grup (buff Rombongan & leaderboard). 8 zona per gunung, tema gunung ACAK per run:
// kelola STAMINA (regen 1/5 mnt) & OKSIGEN (zona 6+ wajib), cuaca berubah per daki (cerah/mendung/hujan/badai),
// pilih jalur AMAN vs RISIKO (loot ×2 tapi bisa longsor turun zona), event acak (harta/NPC/serangan/kristal),
// toko (oksigen/jaket/tenda/pemanas), PUNCAK = reward besar + .gunung prestasi (rebirth +10% EXP permanen,
// gunung baru). Daily + streak. State persist db.data.gunung tahan restart.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox } from "../../src/lib/nova-games.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { addCash, spendCash, getCash } from "../../src/lib/nova-rpg-service.js";
import { getLocalDateObject } from "../../src/lib/nova-time.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── knob ──
const STAMINA_MAX = process.env.GUNUNG_STAMINA_MAX !== undefined ? Number(process.env.GUNUNG_STAMINA_MAX) : 10;
const STAMINA_REGEN_S = process.env.GUNUNG_REGEN_S !== undefined ? Number(process.env.GUNUNG_REGEN_S) : 300; // +1 / 5 mnt
const DAKI_CD_MS = process.env.GUNUNG_DAKI_CD_MS !== undefined ? Number(process.env.GUNUNG_DAKI_CD_MS) : 2000;

const ZONA = [
  { n: 1, nama: "🏕️ Basecamp", cost: 1, loot: 40 },
  { n: 2, nama: "🌲 Hutan Kabut", cost: 1, loot: 60 },
  { n: 3, nama: "🪨 Jalur Batu", cost: 2, loot: 90 },
  { n: 4, nama: "💨 Punggungan Angin", cost: 2, loot: 130 },
  { n: 5, nama: "❄️ Zona Salju", cost: 2, loot: 180 },
  { n: 6, nama: "🧊 Jalur Es", cost: 2, loot: 240, oksigen: true },
  { n: 7, nama: "☠️ Zona Maut", cost: 3, loot: 320, oksigen: true },
  { n: 8, nama: "🏔️ Puncak Legenda", cost: 3, loot: 400, oksigen: true },
];
// ── OPEN WORLD: negara bertingkat, buka dengan PUNCAK (total summit) ──
// DATA GUNUNG DI src/data/gunung-mountains.json — tambah gunung/jalur baru cukup edit JSON, tanpa kode.
const MOUNTAINS_PATH = path.join(__dirname, "..", "..", "src", "data", "gunung-mountains.json");
function loadCountries() {
  try {
    const data = JSON.parse(fs.readFileSync(MOUNTAINS_PATH, "utf-8"));
    if (Array.isArray(data.countries) && data.countries.length) return data.countries;
    console.error("[gunung] data countries kosong/invalid di JSON — pakai default bawaan");
  } catch (e) {
    console.error("[gunung] gagal baca gunung-mountains.json — pakai default bawaan:", e);
  }
  return FALLBACK_COUNTRIES;
}
const COUNTRIES = loadCountries();
const FALLBACK_COUNTRIES = [
  { id: "indonesia", nama: "Indonesia", emoji: "🇮🇩", butuh: 0, pool: [
    "Gunung Merapi (2.930 mdpl)", "Gunung Merbabu (3.145 mdpl)", "Gunung Semeru (3.676 mdpl)",
    "Gunung Rinjani (3.726 mdpl)", "Gunung Kerinci (3.805 mdpl)", "Gunung Cartenz (4.884 mdpl)",
  ] },
  { id: "jepang", nama: "Jepang", emoji: "🇯🇵", butuh: 3, pool: [
    "Gunung Fuji (3.776 mdpl)", "Gunung Kita-dake (3.193 mdpl)", "Gunung Hotaka (3.190 mdpl)",
    "Gunung Yari-gatake (3.180 mdpl)", "Gunung Tateyama (3.015 mdpl)",
  ] },
  { id: "jerman", nama: "Jerman", emoji: "🇩🇪", butuh: 6, pool: [
    "Gunung Zugspitze (2.962 mdpl)", "Gunung Watzmann (2.713 mdpl)", "Gunung Hochkalter (2.607 mdpl)",
    "Gunung Feldberg (1.493 mdpl)", "Gunung Brocken (1.141 mdpl)",
  ] },
  { id: "china", nama: "China", emoji: "🇨🇳", butuh: 9, pool: [
    "Gunung Everest — Sisi Utara (8.849 mdpl)", "Gunung Minya Konka (7.556 mdpl)", "Gunung Muztagh Ata (7.546 mdpl)",
    "Gunung Siguniang (6.250 mdpl)", "Gunung Emei (3.099 mdpl)",
  ] },
  { id: "dunia", nama: "Dunia (7 Puncak)", emoji: "🌍", butuh: 12, pool: [
    "Gunung Everest (8.849 mdpl)", "Gunung Aconcagua (6.961 mdpl)", "Gunung Denali (6.190 mdpl)",
    "Gunung Kilimanjaro (5.895 mdpl)", "Gunung Elbrus (5.642 mdpl)", "Gunung Mont Blanc (4.808 mdpl)",
    "Gunung Vinson (4.892 mdpl)",
  ] },
];
const negaraById = (id) => COUNTRIES.find((x) => x.id === id) || COUNTRIES[0];
const pickMountain = (negaraId) => pick(negaraById(negaraId).pool);
const negaraTerbuka = (negaraId, puncak) => (puncak || 0) >= negaraById(negaraId).butuh;
const TOKO = {
  oksigen: { nama: "🫁 Botol Oksigen", harga: 100, desc: "Wajib zona 6-8. 1 botol = 1 daki." },
  jaket: { nama: "🧥 Jaket Tebal", harga: 250, desc: "Biaya stamina daki -1 (min 1). Sekali beli, permanen per gunung." },
  tenda: { nama: "⛺ Tenda Darurat", harga: 400, desc: "Checkpoint: longsor cuma turun ke zona tenda, bukan zona awal." },
  pemanas: { nama: "🔥 Pemanas Portable", harga: 150, desc: "Badai jadi hujan biasa (stamina aman)." },
  portir: { nama: "🧑‍🌾 Portir Kenanga", harga: 500, desc: "Sekali per gunung: menyelamatkanmu dari 1 longsor (tetap di zona, stamina aman)." },
};
const GUA_ZONE = [3, 4, 5]; // zona di mana gua samping bisa muncul
const LOMBA_STAKE = 100;   // taruhan duel pendaki
const ISTIRAHAT_GOLD = 40; // +3 stamina

let _randFn = null;
const rnd = () => (_randFn ? _randFn() : Math.random());
export function _setRandForTest(fn) { _randFn = fn; }
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ── state persisten ──
function ensureUser(m) {
  const db = getDatabase();
  if (!db.data.gunung) db.data.gunung = { users: {}, rombongan: {} };
  let u = db.data.gunung.users[m.sender];
  if (!u) return null;
  // migrasi open world: nama lama dipetakan ke negaranya; gunung BERIKUTNYA dari country aktif
  if (u.country === undefined) {
    const asal = COUNTRIES.find((x) => x.pool.includes(u.gunung));
    u.country = asal && negaraTerbuka(asal.id, u.puncak) ? asal.id : "indonesia";
    if (!asal) u.gunung = pickMountain("indonesia"); // nama fiktif purba → gunung Indonesia nyata
    saveDb();
  }
  regenStamina(u);
  return u;
}
function regenStamina(u) {
  const nowS = Math.floor(Date.now() / 1000);
  const gained = Math.floor((nowS - (u.staminaAt || nowS)) / STAMINA_REGEN_S);
  if (gained > 0 && (u.stamina || 0) < STAMINA_MAX) {
    u.stamina = Math.min(STAMINA_MAX, (u.stamina || 0) + gained);
    u.staminaAt = nowS;
  }
}
function newUser(m) {
  const db = getDatabase();
  const u = {
    country: "indonesia", gunung: pickMountain("indonesia"), zona: 1, puncak: 0, prestasi: 0,
    stamina: STAMINA_MAX, staminaAt: Math.floor(Date.now() / 1000),
    oksigen: 1, jaket: false, tenda: 0, pemanas: false, kristal: 0,
    portir: false, portirUsed: false, guaPending: false, lastLombaAt: 0,
    dailyStreak: 0, lastDaily: "", firstTime: true, lastDakiAt: 0,
    rekorZone: 8, mulaiPada: Date.now(),
  };
  db.data.gunung.users[m.sender] = u;
  return u;
}
function saveDb() { try { getDatabase().save(); } catch (e) { console.error("[gunung] gagal simpan:", e); } }

const prestigeBonus = (p) => 1 + (p || 0) * 0.1;
const zDef = (z) => ZONA[Math.min(7, Math.max(0, z - 1))];

// ── cuaca ──
function rollCuaca(u, zona) {
  const r = rnd() * 100;
  let cuaca;
  if (zona >= 6) {
    // zona tinggi: badai es 8% (extreme) — jaket/pemanas meredam sebagian
    cuaca = r < 45 ? "cerah" : r < 65 ? "mendung" : r < 80 ? "hujan" : r < 92 ? "badai" : "badai-es";
    if (cuaca === "badai-es" && u.pemanas) cuaca = "badai";
  } else {
    cuaca = r < 50 ? "cerah" : r < 75 ? "mendung" : r < 90 ? "hujan" : "badai";
  }
  if (cuaca === "badai" && u.pemanas) cuaca = "hujan";
  return cuaca;
}
const CUACA_ICON = { cerah: "☀️", mendung: "☁️", hujan: "🌧️", badai: "⛈️", "badai-es": "🥶" };
const CUACA_EFEK = {
  cerah: { stamina: 0, lootMul: 1 },
  mendung: { stamina: 0, lootMul: 1 },
  hujan: { stamina: 1, lootMul: 1.2 },
  badai: { stamina: 1, lootMul: 1.4 },
  "badai-es": { stamina: 2, lootMul: 1.8 },
};

// ── rombongan (grup): ≥2 pendaki beda orang daki di grup sama ≤24 jam → loot +20% ──
function rombonganBuff(m) {
  if (!m.chat || !m.chat.endsWith("@g.us")) return false;
  const db = getDatabase();
  const r = db.data.gunung.rombongan[m.chat] || {};
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const aktif = Object.entries(r).filter(([jid, ts]) => ts > cutoff && jid !== m.sender);
  return aktif.length >= 1; // kamu + 1 lain = rombongan
}
function catatRombongan(m) {
  if (!m.chat || !m.chat.endsWith("@g.us")) return;
  const db = getDatabase();
  if (!db.data.gunung.rombongan[m.chat]) db.data.gunung.rombongan[m.chat] = {};
  db.data.gunung.rombongan[m.chat][m.sender] = Date.now();
}

// ═══ handler ═══
async function handler(m, { sock, config }) {
  const sub = (m.args?.[0] || "").toLowerCase();
  const rest = (m.args || []).slice(1).join(" ");
  let u = ensureUser(m);

  // ── daily ──
  if (sub === "daily") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "🏔️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .gunung untuk mulai ekspedisi pertama." }));
    const now = getLocalDateObject ? getLocalDateObject() : new Date();
    const today = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
    if (u.lastDaily === today) return m.reply(novaGameBox({ title: "gunung", icon: "📅", flavor: "📅 *SUDAH DIKLAIM!*", body: "Bonus pendaki hari ini sudah diambil. Kembali besok!" }));
    const y = getLocalDateObject ? getLocalDateObject() : new Date();
    y.setDate(y.getDate() - 1);
    u.dailyStreak = u.lastDaily === `${y.getDate()}-${y.getMonth() + 1}-${y.getFullYear()}` ? (u.dailyStreak || 0) + 1 : 1;
    u.lastDaily = today;
    u.oksigen += 1;
    const gold = 30 + (u.dailyStreak - 1) * 10;
    addCash(m, gold);
    saveDb();
    return m.reply(novaGameBox({ title: "gunung", icon: "📅", flavor: "📅 *BONUS HARIAN PENDAKI!*", body: `🫁 +1 botol oksigen · 🪙 +${gold} gold\n🔥 Streak: ${u.dailyStreak} hari (bonus +${(u.dailyStreak - 1) * 10} gold)` }));
  }

  // ── top (leaderboard solo+global) ──
  if (sub === "top" || sub === "rank") {
    const db = getDatabase();
    const all = Object.entries(db.data?.gunung?.users || {})
      .map(([jid, x]) => ({ jid, puncak: x.puncak || 0, prestasi: x.prestasi || 0, namaGunung: x.gunung }))
      .filter((x) => x.puncak > 0)
      .sort((a, b) => b.puncak - a.puncak || b.prestasi - a.prestasi)
      .slice(0, 10);
    const body = all.length
      ? all.map((r, i) => `${i + 1}. @${r.jid.split("@")[0]}\n   🏔️ ${r.puncak} puncak · ♻️ ${r.prestasi} prestasi`).join("\n\n")
      : "Belum ada yang mencapai puncak! Jadilah yang pertama 🏔️";
    return m.reply(novaGameBox({ title: "gunung", icon: "🏆", flavor: "🏆 *PAPAN LEGENDA PENDAKIAN*", body }));
  }

  // ── prestasi (rebirth) ──
  if (sub === "prestasi" || sub === "rebirth") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "♻️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .gunung dulu." }));
    if (u.zona < 8) return m.reply(novaGameBox({ title: "gunung", icon: "🔒", flavor: "🔒 *PUNCAK DULU!*", body: `Prestasi hanya bisa diambil setelah menaklukkan ${u.gunung}. Kamu sedang di zona ${u.zona}/8.` }));
    u.prestasi += 1;
    u.puncak += 0; // puncak sudah dihitung saat summit
    u.gunung = pickMountain(u.country || "indonesia");
    u.zona = 1;
    u.stamina = STAMINA_MAX;
    u.staminaAt = Math.floor(Date.now() / 1000);
    u.jaket = false; u.tenda = 0; u.pemanas = false;
    u.portir = false; u.portirUsed = false; u.guaPending = false;
    u.mulaiPada = Date.now();
    saveDb();
    const neg = negaraById(u.country || "indonesia");
    return m.reply(novaGameBox({ title: "gunung", icon: "♻️", flavor: "♻️ *PRESTASI BARU!*", body: `${neg.emoji} Gunung berikutnya dari ${neg.nama}: ${u.gunung}!\nSemua EXP pendakian +${u.prestasi * 10}% permanen.\n🧥 Jaket/tenda/pemanas reset (beli lagi di toko).\n\nKetik .gunung daki untuk mulai!` }));
  }

  // ── istirahat (beli stamina) ──
  if (sub === "istirahat") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "🏕️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .gunung dulu." }));
    if ((u.stamina || 0) >= STAMINA_MAX) return m.reply(novaGameBox({ title: "gunung", icon: "💪", flavor: "💪 *STAMINA PENUH!*", body: `Stamina kamu ${u.stamina}/${STAMINA_MAX} — gak perlu istirahat, langsung .gunung daki!` }));
    if (!spendCash(m, ISTIRAHAT_GOLD)) return m.reply(novaGameBox({ title: "gunung", icon: "💸", flavor: "💸 *KURANG GOLD!*", body: `Istirahat di basecamp butuh ${ISTIRAHAT_GOLD} gold. Kamu punya ${getCash(m)}. Coba .gunung daily dulu!` }));
    regenStamina(u);
    u.stamina = Math.min(STAMINA_MAX, (u.stamina || 0) + 3);
    u.staminaAt = Math.floor(Date.now() / 1000);
    saveDb();
    return m.reply(novaGameBox({ title: "gunung", icon: "🏕️", flavor: "🏕️ *ISTIRAHAT SEJENAK…*", body: `🥤 Teh hangat + roti bakar…\nStamina +3 → ${u.stamina}/${STAMINA_MAX} (-${ISTIRAHAT_GOLD} gold)\n\nRegen gratis tetap jalan: +1 tiap 5 menit.` }));
  }

  // ── toko ──
  if (sub === "toko") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "🛒", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .gunung dulu." }));
    if (!rest) {
      return m.reply(novaGameBox({
        title: "gunung", icon: "🛒",
        flavor: "🛒 *TOKO PENDAKI*",
        body: [
          `💵 Gold kamu: ${getCash(m)}`,
          "",
          ...Object.entries(TOKO).map(([k, it]) => `${it.nama} — ${it.harga} gold\n   ${it.desc}\n   Beli: .gunung toko ${k}`),
        ].join("\n"),
      }));
    }
    const item = TOKO[rest];
    if (!item) return m.reply(novaGameBox({ title: "gunung", icon: "🛒", flavor: "❓ *BARANG GAK ADA!*", body: "Stok toko: oksigen, jaket, tenda, pemanas. Lihat .gunung toko" }));
    if ((rest === "jaket" && u.jaket) || (rest === "pemanas" && u.pemanas)) return m.reply(novaGameBox({ title: "gunung", icon: "🎒", flavor: "🎒 *SUDAH DIPUNYAI!*", body: `Kamu sudah membawa ${item.nama}.` }));
    if (rest === "portir" && u.portir) return m.reply(novaGameBox({ title: "gunung", icon: "🧑‍🌾", flavor: "🧑‍🌾 *PORTIR SUDAH BERSAMA KAMU!*", body: u.portirUsed ? "Kenanga sudah pulang setelah menyelamatkanmu. Rekrut lagi di gunung berikutnya." : "Kenanga masih setia di belakang kamu — 1x penyelamatan siap pakai." }));
    if (!spendCash(m, item.harga)) return m.reply(novaGameBox({ title: "gunung", icon: "💸", flavor: "💸 *GOLD KURANG!*", body: `${item.nama} seharga ${item.harga} gold, kamu punya ${getCash(m)}.` }));
    if (rest === "oksigen") u.oksigen += 1;
    if (rest === "jaket") u.jaket = true;
    if (rest === "tenda") u.tenda = u.zona;
    if (rest === "pemanas") u.pemanas = true;
    if (rest === "portir") { u.portir = true; u.portirUsed = false; }
    saveDb();
    console.log(`[gunung] ${m.sender} beli ${rest} (${item.harga} gold)`);
    return m.reply(novaGameBox({ title: "gunung", icon: "🎒", flavor: "🎒 *PEMBELIAN SUKSES!*", body: `${item.nama} masuk tas! ${rest === "tenda" ? `Tenda dipasang di zona ${u.tenda} sebagai checkpoint.` : ""}\nSisa gold: ${getCash(m)}` }));
  }

  // ── 🗺️ PETA DUNIA — open world bertingkat ──
  if (sub === "dunia" || sub === "peta" || sub === "negara" && (m.args?.[1] || "").toLowerCase() === "list") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "🗺️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .gunung dulu." }));
    const puncak = u.puncak || 0;
    const body = COUNTRIES.map((neg) => {
      const buka = negaraTerbuka(neg.id, puncak);
      const aktif = (u.country || "indonesia") === neg.id;
      const contoh = neg.pool.slice(0, 3).map((g) => g.replace("Gunung ", "")).join(", ");
      return [
        `${neg.emoji} ${neg.nama}${aktif ? " ← sedang aktif" : ""}`,
        buka ? `   ✅ TERBUKA — ${neg.pool.length} gunung (${contoh}…)` : `   🔒 Butuh ${neg.butuh} puncak — kamu baru ${puncak}`,
      ].join("\n");
    }).join("\n\n") + `\n\n🗺️ Ganti negara: .gunung negara <nama> (berlaku untuk gunung BERIKUTNYA)\n🏆 Puncak kamu: ${puncak} — kumpulkan puncak untuk membuka negara baru!`;
    return m.reply(novaGameBox({ title: "gunung", icon: "🗺️", flavor: "🗺️ *PETA DUNIA PENDAKIAN*", body }));
  }

  // ── ganti negara aktif ──
  if (sub === "negara") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "🗺️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .gunung dulu." }));
    const q = (m.args?.[1] || "").toLowerCase();
    if (!q) return m.reply(novaGameBox({ title: "gunung", icon: "🗺️", flavor: "🗺️ *NEGARA MANA?*", body: "Pilih: indonesia · jepang · jerman · china · dunia\nLihat peta: .gunung dunia" }));
    const alias = {
      id: "indonesia", indonesia: "indonesia", indo: "indonesia",
      jp: "jepang", jepang: "jepang", japan: "jepang",
      de: "jerman", jerman: "jerman", germany: "jerman", german: "jerman",
      cn: "china", china: "china", cina: "china",
      world: "dunia", dunia: "dunia", "7puncak": "dunia", seven: "dunia",
    };
    const negId = alias[q];
    if (!negId) return m.reply(novaGameBox({ title: "gunung", icon: "🗺️", flavor: "❓ *NEGARA GAK ADA!*", body: "Pilihan sah: indonesia · jepang · jerman · china · dunia" }));
    const neg = negaraById(negId);
    if (!negaraTerbuka(negId, u.puncak || 0)) {
      return m.reply(novaGameBox({ title: "gunung", icon: "🔒", flavor: "🔒 *BELUM TERBUKA!*", body: `${neg.emoji} ${neg.nama} butuh ${neg.butuh} puncak — kamu baru ${u.puncak || 0}.\nKeep climbing: selesaikan gunung di negara terbuka dulu!` }));
    }
    const lama = negaraById(u.country || "indonesia").nama;
    u.country = negId;
    saveDb();
    return m.reply(novaGameBox({ title: "gunung", icon: "🗺️", flavor: "🗺️ *NEGARA DIGANTI!*", body: `Negara aktif: ${neg.emoji} ${neg.nama} (sebelumnya ${lama}).\nPuncak berikutnya di ${neg.nama} akan diberikan SETELAH kamu menaklukkan gunung sekarang lewat .gunung prestasi.` }));
  }

  // ── 🕳️ GUA SAMPING — masuk / lewat ──
  if (sub === "gua") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "📂", flavor: "📂 *BELUM ADA EKSPEDISI!*", body: "Ketik .gunung dulu." }));
    const pilihan = (m.args?.[1] || "").toLowerCase();
    if (!u.guaPending) return m.reply(novaGameBox({ title: "gunung", icon: "🕳️", flavor: "🕳️ *GAK ADA GUA!*", body: "Belum ada gua samping yang menunggu. Muncul kadang-kadang di zona 3-5." }));
    if (pilihan === "lewat") {
      u.guaPending = false;
      saveDb();
      return m.reply(novaGameBox({ title: "gunung", icon: "🛤️", flavor: "🛤️ *MELEWATI GUA…*", body: "Kamu menutup senter dan melanjutkan jalur utama. Kadang bijaksana itu membosankan — tapi hidup." }));
    }
    if (pilihan !== "masuk") return m.reply(novaGameBox({ title: "gunung", icon: "🕳️", flavor: "🕳️ *PILIH!*", body: ".gunung gua masuk — 60% harta besar (loot zona ×3), 40% jebakan (stamina -2)\n.gunung gua lewat — lanjut jalan biasa" }));
    u.guaPending = false;
    const r = rnd();
    if (r < 0.4) {
      // jebakan
      u.stamina = Math.max(0, (u.stamina || 0) - 2);
      saveDb();
      console.log(`[gunung] ${m.sender} gua jebakan (-2 stamina) zona ${u.zona}`);
      return m.reply(novaGameBox({
        title: "gunung", icon: "🕸️",
        flavor: "🕸️ *JEBAKAN GUA!*",
        body: [
          pick([
            "Lantai gua runtuh setengah meter — kamu tergelincir ke lumpur beku!",
            "Sekawanan kelelawar menyerbu keluar! Kepalamu berdesing sial!",
            "Udara gua tiba-tiba pengap — kamu batuk-batuk mundur ke jalur!",
          ]),
          "",
          `⚡ Stamina -2 → ${u.stamina}/${STAMINA_MAX}`,
          "Gua itu menutup sendiri. Seperti kata orang bijak: harta berbahaya…",
        ].join("\n"),
      }));
    }
    // harta besar
    const loot = zDef(u.zona).loot * 3;
    const dapatKristal = rnd() < 0.25;
    addCash(m, loot);
    if (dapatKristal) u.kristal += 1;
    saveDb();
    console.log(`[gunung] ${m.sender} gua harta +${loot} gold zona ${u.zona}`);
    return m.reply(novaGameBox({
      title: "gunung", icon: "💎",
      flavor: "💎 *HARTA GUA DITEMUKAN!*",
      body: [
        pick([
          "Peti tua berlapis es terbuka — koin-koin kuno berserakan!",
          "Tulisan kuno bercahaya menuntunmu ke persembunyian pendaki terdahulu!",
          "Sekantong permata tergeletak di altar batu yang berdebu!",
        ]),
        "",
        `🪙 +${loot} gold (loot zona ×3)` + (dapatKristal ? "\n💎 Kristal Puncak +1!" : ""),
        "",
        "Keberanianmu dibayar lunas, pendaki!",
      ].join("\n"),
    }));
  }

  // ── ⚔️ LOMBA PENDAKI — duel @user (taruhan 100 gold) ──
  if (sub === "lomba") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "⚔️", flavor: "❓ *BELUM TERDAFTAR!*", body: "Ketik .gunung dulu." }));
    const target = m.mentionedJid?.[0] || (rest ? rest.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "");
    if (!target) return m.reply(novaGameBox({ title: "gunung", icon: "⚔️", flavor: "⚔️ *TANTANG SIAPA?*", body: `Mention lawanmu: .gunung lomba @user (taruhan ${LOMBA_STAKE} gold tiap pendaki, pemenang bawa pulang semua)` }));
    if (target === m.sender) return m.reply(novaGameBox({ title: "gunung", icon: "🪞", flavor: "🪞 *LAWAN DIRI SENDIRI?*", body: "Pendaki sejati gak melawan bayangannya sendiri. Mention orang lain!" }));
    const db = getDatabase();
    const tUser = db.data.gunung.users[target];
    if (!tUser) return m.reply(novaGameBox({ title: "gunung", icon: "❓", flavor: "❓ *LAWAN BELUM PENDAKI!*", body: "Dia belum memulai ekspedisi apa pun. Suruh dia ketik .gunung dulu!" }));
    const nowS = Date.now();
    if (nowS - (u.lastLombaAt || 0) < 60000) return m.reply(novaGameBox({ title: "gunung", icon: "❄️", flavor: "❄️ *TARIK NAPAS DULU!*", body: "Duel terlalu sering bikin malu. Tunggu 1 menit antar lomba." }));
    if (getCash(m) < LOMBA_STAKE || getCash({ sender: target }) < LOMBA_STAKE) {
      return m.reply(novaGameBox({ title: "gunung", icon: "💸", flavor: "💸 *TARUHAN GAK CAKUP!*", body: `Duel butuh ${LOMBA_STAKE} gold di masing-masing pendaki. Kalian berdua harus siap rugi 100 — atau menang 200!` }));
    }
    if (!spendCash(m, LOMBA_STAKE)) return m.reply(novaGameBox({ title: "gunung", icon: "💸", flavor: "💸 *GAGAL POTONG!*", body: "Saldo kamu berubah di tengah jalan — duel dibatalkan." }));
    if (!spendCash({ sender: target, chat: m.chat }, LOMBA_STAKE)) { addCash(m, LOMBA_STAKE); return m.reply(novaGameBox({ title: "gunung", icon: "💸", flavor: "💸 *DUEL DIBATALKAN!*", body: "Saldo lawan berubah — taruhanmu dikembalikan." })); }
    u.lastLombaAt = nowS; // cooldown HANYA jalan kalau duel beneran terjadi
    // duel: dadu 1-100 + zona×3 + puncak×2 (pengalaman pendaki)
    const skorA = Math.floor(rnd() * 100) + 1 + u.zona * 3 + (u.puncak || 0) * 2;
    const skorB = Math.floor(rnd() * 100) + 1 + tUser.zona * 3 + (tUser.puncak || 0) * 2;
    const menang = skorA > skorB ? "A" : skorB > skorA ? "B" : (rnd() < 0.5 ? "A" : "B");
    addCash(menang === "A" ? m : { sender: target }, LOMBA_STAKE * 2);
    saveDb();
    console.log(`[gunung] lomba ${m.sender} (${skorA}) vs ${target} (${skorB}) → pemenang ${menang === "A" ? m.sender : target}`);
    return m.reply(novaGameBox({
      title: "gunung", icon: "⚔️",
      flavor: "⚔️ *DUEL PENDAKI SELESAI!*",
      body: [
        `🧗 Kamu: ${skorA} poin (zona ${u.zona} · 🏔️ ${u.puncak} puncak)`,
        `🧗 Lawan: ${skorB} poin (zona ${tUser.zona} · 🏔️ ${tUser.puncak} puncak)`,
        "",
        menang === "A"
          ? `🎉 KAMU MENANG! Pot ${LOMBA_STAKE * 2} gold masuk kantongmu!`
          : `😤 Kamu kalah — ${LOMBA_STAKE} gold-mu melayang. Daki lebih tinggi, menang lebih mudah!`,
      ].join("\n"),
    }));
  }

  // ═══ DAKI — inti game ═══
  if (sub === "daki") {
    if (!u) return m.reply(novaGameBox({ title: "gunung", icon: "📂", flavor: "📂 *BELUM ADA EKSPEDISI!*", body: "Ketik .gunung untuk mulai." }));
    const jalur = (m.args?.[1] || "").toLowerCase();
    if (jalur && jalur !== "aman" && jalur !== "risiko") {
      return m.reply(novaGameBox({ title: "gunung", icon: "🧭", flavor: "🧭 *PILIH JALUR!*", body: "Jalur sah:\n🛤️ .gunung daki aman — stamina lebih hemat, loot biasa\n⚡ .gunung daki risiko — loot ×2, tapi bisa longsor turun zona" }));
    }
    if (jalur === "risiko" && u.zona === 1) {
      return m.reply(novaGameBox({ title: "gunung", icon: "🧭", flavor: "🧭 *ZONA 1 GAK ADA JALUR RISIKO!*", body: "Basecamp masih aman kok. Naik dulu ke zona 2." }));
    }
    const nowS = Date.now();
    if (nowS - (u.lastDakiAt || 0) < DAKI_CD_MS) return m.reply(novaGameBox({ title: "gunung", icon: "❄️", flavor: "❄️ *CAPEK BENTAR!*", body: "Napaskan dulu 2 detik antar daki ya." }));
    u.lastDakiAt = nowS;

    const z = zDef(u.zona);
    const cuaca = rollCuaca(u, u.zona);
    const ekCuaca = CUACA_EFEK[cuaca];
    let cost = z.cost + ekCuaca.stamina;
    if (u.jaket) cost = Math.max(1, cost - 1);
    if ((u.stamina || 0) < cost) {
      return m.reply(novaGameBox({ title: "gunung", icon: "⚡", flavor: "⚡ *STAMINA HABIS!*", body: `Butuh ${cost} stamina untuk daki ke ${zDef(u.zona + 1).nama} (cuaca ${CUACA_ICON[cuaca]} ${cuaca}).\nStamina kamu: ${u.stamina}/${STAMINA_MAX} — regen +1 tiap 5 menit.\n\n🏕️ .gunung istirahat (+3 stamina, ${ISTIRAHAT_GOLD} gold) kalau gak mau nunggu.` }));
    }
    if (z.oksigen && (u.oksigen || 0) < 1) {
      return m.reply(novaGameBox({ title: "gunung", icon: "🫁", flavor: "🫁 *OKSIGEN HABIS!*", body: `Zona ${u.zona} ke atas tipis udaranya — wajib bawa botol oksigen!\nBeli di .gunung toko oksigen (100 gold) atau klaim .gunung daily (+1 gratis).` }));
    }

    if (m.react) { try { await m.react("🧠"); } catch (e) { console.error("[gunung] react gagal:", e); } }

    // ── rolling daki ──
    u.stamina -= cost;
    u.staminaAt = Math.floor(Date.now() / 1000);
    if (z.oksigen) u.oksigen -= 1;
    catatRombongan(m);
    const rombongan = rombonganBuff(m);

    const risiko = jalur === "risiko";
    let lines = [];
    let longsor = false;

    // longsor: risiko 35% · badai 30% · badai es 40% (jalur aman)
    const longsorChance = risiko ? 0.35 : cuaca === "badai-es" ? 0.4 : cuaca === "badai" ? 0.3 : 0;
    if (longsorChance > 0 && rnd() < longsorChance) longsor = true;

    let lootMul = ekCuaca.lootMul * (risiko ? 2 : 1) * (rombongan ? 1.2 : 1);
    let extraEvents = [];

    // event acak 18% (di luar longsor)
    if (!longsor) {
      const r = rnd();
      if (r < 0.07) extraEvents.push({ t: "harta", gold: z.loot * 2 });
      else if (r < 0.10) extraEvents.push({ t: "kristal" });
      else if (r < 0.13) extraEvents.push({ t: "npc" });
      else if (r < 0.18) extraEvents.push({ t: "serangan", stamina: 1 });
    }

    if (longsor && u.portir && !u.portirUsed) {
      // 🧑‍🌾 PORTIR KENANGA menyelamatkan — tetap di zona, stamina aman
      u.portirUsed = true;
      saveDb();
      console.log(`[gunung] ${m.sender} diselamatkan portir dari longsor zona ${u.zona}`);
      return m.reply(novaGameBox({
        title: "gunung", icon: "🧑‍🌾",
        flavor: "🧑‍🌾 *PORTIR KENANGA KE TITIK PENYELAMATAN!*",
        body: [
          pick([
            "Dua tangan kokoh menahan bahu kamu dari bebatuan yang menggelinding!",
            "Tali portir terkait di pinggang kamu — kamu tersentak berhenti di bibir jurang!",
            "Kenanga menyeret kamu ke balik tebing, napas kamu tercekat tapi SELAMAT!",
          ]),
          "",
          `Longsor terjadi di zona ${u.zona}, tapi kamu TETAP di posisi (tanpa turun, stamina aman).`,
          "🧑‍🌾 Portir pulang setelah ini — sekali jasa per gunung. Terima kasih, Kenanga!",
        ].join("\n"),
      }));
    }
    if (longsor) {
      // turun ke checkpoint tenda atau 1 zona
      const targetZona = u.tende >= 2 && u.zona - u.tenda <= 1 ? u.tenda : Math.max(1, u.zona - 1);
      const dari = u.zona;
      u.zona = targetZona;
      u.stamina = Math.max(0, u.stamina - 1);
      saveDb();
      console.log(`[gunung] ${m.sender} LONSOR zona ${dari} → turun ke ${targetZona}`);
      return m.reply(novaGameBox({
        title: "gunung", icon: "⛰️",
        flavor: `⛈️ *LONSOR! TURUN KE ${zDef(targetZona).nama.toUpperCase()}*`,
        body: [
          pick([
            "Batu-batu menggelinding! Kamu berlindung di balik tebing…",
            "Tanah runtuh di bawah kakimu! Jantung berdebar kencang…",
            "Kabut menutup jalur — kaki terpeleset jauh ke bawah!",
          ]),
          "",
          `${risiko ? "⚡ Jalur risiko menagih janjinya" : `${CUACA_ICON[cuaca]} Badai memaksa penurunan`} — kamu turun dari zona ${dari} ke zona ${targetZona}${u.tenda === targetZona ? " (checkpoint ⛺ tenda)" : ""}.`,
          `⚡ Stamina -1 tambahan → ${u.stamina}/${STAMINA_MAX}`,
          "",
          "Jangan menyerah, pendaki — jalur tetap ada di atas sana!",
        ].join("\n"),
      }));
    }

    // ── sukses naik zona ──
    const naikKe = zDef(u.zona + 1);
    u.zona += 1;
    // 🕳️ gua samping rahasia (8%) hanya di zona 3-5
    const gua = GUA_ZONE.includes(u.zona) && rnd() < 0.08;
    if (gua) u.guaPending = true;
    let expGain = z.loot * 2;
    let goldGain = Math.floor(z.loot * lootMul);
    for (const ev of extraEvents) {
      if (ev.t === "harta") goldGain += ev.gold;
      if (ev.t === "kristal") u.kristal += 1;
      if (ev.t === "serangan") { u.stamina = Math.max(0, u.stamina - ev.stamina); }
    }
    addCash(m, goldGain);
    let lvlUp = null;
    try { lvlUp = addExpWithLevelCheck(m, Math.floor(expGain * prestigeBonus(u.prestasi))); } catch (e) { console.error("[gunung] exp gagal:", e); }
    saveDb();
    console.log(`[gunung] ${m.sender} daki → zona ${u.zona} (${naikKe.nama}) · +${goldGain} gold · cuaca ${cuaca}${rombongan ? " · rombongan" : ""}`);

    // PUNCAK!
    if (u.zona >= 8) {
      u.puncak += 1;
      u.kristal += 3;
      const summitGold = 2500 + u.puncak * 250;
      addCash(m, summitGold);
      saveDb();
      console.log(`[gunung] ${m.sender} PUNCAK! ${u.gunung} (#${u.puncak})`);
      return m.reply(novaGameBox({
        title: "gunung", icon: "🏔️",
        flavor: "🏔️ *PUNCAK LEGENDA TERTAKLUKKAN!*",
        body: [
          pick([
            "Matahari terbit di bawah kakimu. Segalanya kecil, kecuali hatimu.",
            "Bendera tertancap! Angin membawa nama-mu ke seluruh lembah.",
            "Awan berarak memberi jalan. Kamu berdiri di atap dunia.",
          ]),
          "",
          `🎉 ${u.gunung} DAKI PERTAMA kamu selesai!`,
          `🏆 Puncak: ${u.puncak} · 💎 Kristal +3 → ${u.kristal}`,
          `🎁 Hadiah puncak: 🪙 ${summitGold} gold + EXP besar`,
          lvlUp ? "🎊 LEVEL UP!" : "",
          "",
          "♻️ Ketik .gunung prestasi — EXP +10% permanen & gunung baru menanti!",
        ].filter(Boolean).join("\n"),
      }));
    }

    return m.reply(novaGameBox({
      title: "gunung", icon: naikKe.nama.split(" ")[0],
      flavor: `*${naikKe.nama.toUpperCase()} — ZONA ${u.zona}/8 TERCAPAI!*`,
      body: [
        `${CUACA_ICON[cuaca]} Cuaca: ${cuaca}${risiko ? " · ⚡ jalur RISIKO" : ""}${rombongan ? " · 🤝 Rombongan +20%" : ""}`,
        "",
        `🪙 +${goldGain} gold · ⭐ EXP +${Math.floor(expGain * prestigeBonus(u.prestasi))}${lvlUp ? " · 🎊 LEVEL UP!" : ""}`,
        `⚡ Stamina: ${u.stamina}/${STAMINA_MAX}${zDef(u.zona).oksigen ? ` · 🫁 Oksigen sisa ${u.oksigen}` : ""}`,
        ...extraEvents.map((ev) =>
          ev.t === "harta" ? `\n💎 HARTA TERSEMBUNYI! +${ev.gold} gold ekstra!`
          : ev.t === "kristal" ? "\n💎 Kristal Puncak ditemukan! (+1)"
          : ev.t === "npc" ? "\n🧙 NPC penjual keliling muncul — besok toko diskon (katanya)!"
          : ev.t === "serangan" ? "\n🦅 Serangan elang! Stamina -1 tambahan."
          : ""),
        ...(gua ? [
          "",
          "🕳️ GUA SAMPING RAHASIA terlihat di sisi jalur!",
          "   Masuk? .gunung gua masuk (harta besar / jebakan)",
          "   Lewat? .gunung gua lewat (aman)",
        ] : []),
        ...(u.guaPending && !gua ? ["🕳️ Gua samping tadi masih menunggu: .gunung gua masuk / .gunung gua lewat"] : []),
        "",
        `Jalur berikutnya: ${zDef(u.zona + 1).nama} (⚡ ${zDef(u.zona + 1).cost + ekCuaca.stamina}${zDef(u.zona + 1).oksigen ? " · 🫁 wajib oksigen" : ""})`,
        "Ketik .gunung daki aman / .gunung daki risiko",
      ].filter(Boolean).join("\n"),
    }));
  }

  // ═══ STATUS / MULAI ═══
  if (!u) {
    u = newUser(m);
    addCash(m, 50);
    saveDb();
    if (m.react) { try { await m.react("🧠"); } catch (e) { console.error("[gunung] react gagal:", e); } }
    return m.reply(novaGameBox({
      title: "gunung", icon: "🏔️",
      flavor: "🏔️ *SELAMAT DATANG DI PENDAKIAN GUNUNG LEGENDA!*",
      body: [
        `Ekspedisimu dimulai di kaki ${u.gunung} — 8 zona menanti sebelum puncak.`,
        `🗺️ OPEN WORLD: kumpulkan puncak untuk membuka 🇯🇵 Jepang (3), 🇩🇪 Jerman (6), 🇨🇳 China (9), 🌍 Dunia 7 Puncak (12)!`,
        "",
        "🎯 Cara main:",
        "1. .gunung daki aman — naik zona (stamina hemat, loot biasa)",
        "2. .gunung daki risiko — loot ×2, tapi 35% longsor turun zona!",
        "3. Kelola ⚡ stamina (regen 1/5 mnt) & 🫁 oksigen (wajib zona 6+)",
        "4. ☁️ Cuaca berubah tiap daki — badai bahaya, hujan loot +20%",
        "5. Zona 8 = PUNCAK → hadiah besar + .gunung prestasi (+10% EXP permanen)",
        "",
        "🛒 .gunung toko — oksigen/jaket/tenda/pemanas",
        "🏕️ .gunung istirahat (+3 stamina) · 📅 .gunung daily · 🏆 .gunung top",
        "🤝 Main di grup: pendaki lain yang daki di grup sama = buff Rombongan +20%!",
        "",
        `🎁 STARTER PACK: 50 gold + 1 botol oksigen`,
        "",
        `Sekarang kamu di ${zDef(u.zona).nama}. Ketik .gunung daki aman untuk langkah pertama!`,
      ].join("\n"),
    }));
  }

  return m.reply(novaGameBox({
    title: "gunung", icon: "🏔️",
    flavor: `🏔️ *${u.gunung.toUpperCase()} — ZONA ${u.zona}/8*`,
    body: [
      `📍 Posisi: ${zDef(u.zona).nama}`,
      `🗺️ Negara: ${negaraById(u.country || "indonesia").emoji} ${negaraById(u.country || "indonesia").nama} · 🏆 Puncak: ${u.puncak || 0}`,
      `⚡ Stamina: ${u.stamina}/${STAMINA_MAX} (+1 tiap 5 mnt)`,
      `🫁 Oksigen: ${u.oksigen} botol · 💎 Kristal: ${u.kristal}`,
      `🎒 Jaket: ${u.jaket ? "✅" : "❌"} · ⛺ Tenda checkpoint: ${u.tenda || "—"} · 🔥 Pemanas: ${u.pemanas ? "✅" : "❌"}`,
      `♻️ Prestasi: ${u.prestasi} (+${u.prestasi * 10}% EXP) · 🗺️ .gunung dunia (peta negara)`,
      "",
      ...(u.zona >= 8
        ? ["🏔️ Kamu berdiri di PUNCAK! Ketik .gunung prestasi untuk gunung baru (+10% EXP permanen)"]
        : [`Jalur berikutnya: ${zDef(u.zona + 1).nama} — ⚡ ${zDef(u.zona + 1).cost}${zDef(u.zona + 1).oksigen ? " · 🫁 wajib oksigen" : ""}`]),
      "",
      "⚡ .gunung daki risiko (loot ×2) / 🛤️ .gunung daki aman",
      "🛒 .gunung toko · 🏕️ .gunung istirahat · 📅 .gunung daily",
    ].join("\n"),
  }));
}

export { handler, ZONA, COUNTRIES, TOKO };
export const pluginConfig = {
  name: ["gunung", "pendakian", "gununglejenda"],
  type: "rpg",
  description: "Pendakian Gunung Legenda — 8 zona, cuaca dinamis, jalur risiko, oksigen, prestasi",
  usage: ".gunung | .gunung daki [aman|risiko] | .gunung toko [item] | .gunung istirahat | .gunung daily | .gunung top | .gunung prestasi",
  isOwner: false, premium: false, group: false,
};
export { pluginConfig as config };
