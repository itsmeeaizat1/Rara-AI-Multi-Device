// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// warungtycoon.js — WARUNG TYCOON (request owner 25 Sep 2026, game RPG baru, standar Game Designer)
// Simulasi jualan kuliner: masak menu dari bahan baku → buka warung → pelanggan antre → omzet.
// TIERS: 🛒 Gerobak (lvl 1) → 🏕️ Kios (5) → 🏪 Warung (10) → 🏠 Rumah Makan (15) → 🏛️ Restoran (20).
// EKONOMI: uang RPG + bahan baku (beras/ayam/cabe) + Kupon Emas (kritikus/catering/franchise).
// RATING BINTANG 1-5 ngaruh multiplier omzet (±15%/bintang), pelanggan kabur = rating turun.
// EVENT ACAK 20%: kritikus kuliner (±rating +kupon) · banjir (omzet -40%) · catering (bonus besar butuh stok ≥5)
// · penipu (omzet -150) · supplier murah (+bahan gratis).
// GACHA RESEP RAHASIA 2.000 uang: Common 60% (bahan) / Rare 25% / Epic 10% / Legendary 4% / Mitos 1% jackpot,
// PITY 5 garansi Epic+, EV ~1.040 (house edge jujur, diaudit e2e), refund kalau kirim gagal.
// FRANCHISE (prestasi, butuh Restoran + total omzet 100.000): profit +10% permanen, rank Common→Mitos,
// resep rahasia TETAP MILIK. Renovasi 3 kupon = +1 meja (kapasitas pelanggan, permanen).
// Daily + streak + starter pack + leaderboard + tutorial onboarding. State persist db.data.warung.
// 🎬 ANIMASI KHAS (revisi owner 25 Sep 2026: GAYA CUPLIKAN NINTENDO — cinematic multi-babak ~8-12 dtk):
// SCENE 1 tirai dibuka → SCENE 2 pelanggan antre berdatangan satu per satu → SCENE 3 (stok ada: sajian keluar dapur /
// stok kosong: pelanggan kecewa pergi) → SCENE 4 event khusus (kritikus/banjir/catering/penipu/supplier) →
// SCENE 5 kas berdetak naik Rp sepertiga→dua pertiga→FULL + bintang rating. DURASI OTOMATIS nyesuaikan situasi:
// warung kosong ±8 dtk · ramai penuh ±10 dtk · ada event ±11,5 dtk (via editSceneAnim, fallback senyap).

import { getDatabase } from "../../src/lib/rara-database.js";
import { raraGameBox } from "../../src/lib/rara-games.js";
import { addCash, spendCash, getCash } from "../../src/lib/rara-rpg-service.js";
import { editFramesAnim, editSceneAnim, sceneTotalMs } from "../../src/lib/rara-anim-runner.js";
import { bukaCinematic, masakCinematic } from "../../src/lib/libanimationrpg/libwarungtycoonrpg.js";
import { getLocalDateObject } from "../../src/lib/rara-time.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

// ── knob (pattern: !== undefined biar 0 tetap valid) ──
const STAMINA_MAX = process.env.WARUNG_STAMINA_MAX !== undefined ? Number(process.env.WARUNG_STAMINA_MAX) : 10;
const REGEN_S = process.env.WARUNG_REGEN_S !== undefined ? Number(process.env.WARUNG_REGEN_S) : 300; // +1 / 5 mnt
const BUKA_CD_MS = process.env.WARUNG_BUKA_CD_MS !== undefined ? Number(process.env.WARUNG_BUKA_CD_MS) : 2000;
const MASAK_CD_MS = process.env.WARUNG_MASAK_CD_MS !== undefined ? Number(process.env.WARUNG_MASAK_CD_MS) : 1500;
const GACHA_CD_MS = process.env.WARUNG_GACHA_CD_MS !== undefined ? Number(process.env.WARUNG_GACHA_CD_MS) : 3000;
const ANIM_FRAME_MS = process.env.WARUNG_ANIM_MS !== undefined ? Number(process.env.WARUNG_ANIM_MS) : 700;
const GACHA_HARGA = 2000;
const PITY_AT = 5;
const RENOVASI_KUPON = 3;
const MEJA_CAP = 10;
const FRANCHISE_OMZET_MIN = 100000;
const BAHAN_CAP = 100;
const MASAK_BATCH = 5;

const TIERS = [
  { min: 1, nama: "Gerobak Mie Linting", tile: "🛒" },
  { min: 5, nama: "Kios Pinggir Jalan", tile: "🏕️" },
  { min: 10, nama: "Warung Kebanggaan", tile: "🏪" },
  { min: 15, nama: "Rumah Makan", tile: "🏠" },
  { min: 20, nama: "Restoran Legendaris", tile: "🏛️" },
];
const tierOf = (lvl) => TIERS.reduce((acc, t) => ((lvl || 1) >= t.min ? t : acc), TIERS[0]);
const expNext = (lvl) => 80 * (lvl || 1);

const HARGA_BAHAN = { beras: 25, ayam: 50, cabe: 20 };

// menu reguler: unlock per level (balance: harga ~2.4× modal bahan)
const MENUS = [
  { id: "mielinting", nama: "Mie Linting", harga: 60, resep: { beras: 1 }, unlock: 1 },
  { id: "nasigoreng", nama: "Nasi Goreng Spesial", harga: 150, resep: { beras: 2, ayam: 1 }, unlock: 5 },
  { id: "ayambakar", nama: "Ayam Bakar Madu", harga: 300, resep: { ayam: 2, cabe: 1 }, unlock: 10 },
  { id: "rendang", nama: "Rendang Premium", harga: 600, resep: { beras: 3, ayam: 2, cabe: 1 }, unlock: 15 },
  { id: "wagyu", nama: "Wagyu Set", harga: 1200, resep: { ayam: 3, cabe: 2, beras: 2 }, unlock: 20 },
];
// resep rahasia (gacha): margin jauh lebih gede, TETAP MILIK walau franchise
const RESEP_RAHASIA = [
  { id: "bakmirebus", nama: "Bakmi Godog Raja", harga: 400, resep: { beras: 2, cabe: 1 }, raritas: "Rare" },
  { id: "satefavorit", nama: "Sate Favorit Warga", harga: 500, resep: { ayam: 2, cabe: 2 }, raritas: "Rare" },
  { id: "nasiliwet", nama: "Nasi Liwet Legendaris", harga: 800, resep: { beras: 3, ayam: 1 }, raritas: "Epic" },
  { id: "warisan", nama: "Resep Warisan Nenek", harga: 2000, resep: { beras: 4, ayam: 3, cabe: 2 }, raritas: "Legendary" },
];
const ALL_MENUS = [...MENUS, ...RESEP_RAHASIA];
const menuById = (id) => ALL_MENUS.find((x) => x.id === id);

const RANKS = ["Common", "Rare", "Epic", "Legendary", "Mitos"];
const rankOf = (f) => RANKS[Math.min(RANKS.length - 1, f || 0)];
const profitMult = (u) => (1 + (u.franchise || 0) * 0.1) * (1 + ((u.rating || 3) - 3) * 0.15);

let _rand = Math.random;
const rand = () => _rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// EV gacha diaudit e2e (nilai utility tiap tier; house edge jujur, EV ~1.037 < harga 2.000)
const GACHA_VALUE = { Common: 720, Rare: 1150, Epic: 1700, Legendary: 2500, Mitos: 4800 };
export function gachaWarungEV() {
  return 0.6 * GACHA_VALUE.Common + 0.25 * GACHA_VALUE.Rare + 0.1 * GACHA_VALUE.Epic + 0.04 * GACHA_VALUE.Legendary + 0.01 * GACHA_VALUE.Mitos;
}

// ── state ──
function loadUser(m) {
  const db = getDatabase();
  if (!db.data.warung) db.data.warung = { users: {} };
  const u = db.data.warung.users[m.sender];
  if (!u) return null;
  regenStamina(u);
  return u;
}
function regenStamina(u) {
  const nowS = Math.floor(Date.now() / 1000);
  const gained = Math.floor((nowS - (u.staminaAt || nowS)) / REGEN_S);
  if (gained > 0 && (u.stamina || 0) < (u.maxStamina || STAMINA_MAX)) {
    u.stamina = Math.min(u.maxStamina || STAMINA_MAX, (u.stamina || 0) + gained);
    u.staminaAt = nowS;
  }
}
function newUser(m) {
  const db = getDatabase();
  const u = {
    level: 1, exp: 0,
    stamina: STAMINA_MAX, maxStamina: STAMINA_MAX, staminaAt: Math.floor(Date.now() / 1000),
    bahan: { beras: 0, ayam: 0, cabe: 0 },
    stok: {}, rating: 3, kupon: 0, meja: 0,
    resep: {}, pity: 0, totalPull: 0,
    franchise: 0, totalOmzet: 0, totalMasak: 0, totalPelanggan: 0, totalBuka: 0,
    lastDaily: "", dailyStreak: 0,
    lastBukaAt: 0, lastMasakAt: 0, lastBelanjaAt: 0, lastGachaAt: 0,
    firstTime: true, mulaiPada: Date.now(),
  };
  db.data.warung.users[m.sender] = u;
  return u;
}
function saveDb() { try { getDatabase().save(); } catch (e) { console.error("[warung] gagal simpan:", e); } }

const box = (icon, flavor, body) => raraGameBox({ title: "warung tycoon", icon, flavor, body });

function bahanStr(u) {
  return "🌾 beras ×" + (u.bahan.beras || 0) + " · 🍗 ayam ×" + (u.bahan.ayam || 0) + " · 🌶️ cabe ×" + (u.bahan.cabe || 0);
}
function stokStr(u) {
  const rows = ALL_MENUS.filter((x) => (u.stok?.[x.id] || 0) > 0);
  if (!rows.length) return "kosong — masak dulu!";
  return rows.map((x) => "🍽️ " + x.nama + " ×" + u.stok[x.id]).join("\n");
}
function unlockedMenus(u) {
  return MENUS.filter((x) => (u.level || 1) >= x.unlock);
}
function bisaMasak(u, menu) {
  return Object.entries(menu.resep).every(([b, n]) => (u.bahan[b] || 0) >= n * MASAK_BATCH);
}

async function handler(m, { sock }) {
  const sub = (m.args?.[0] || "").toLowerCase();

  // ── mulai / status ──
  let u = loadUser(m);
  if (!u && sub && !["", "mulai", "start", "status", "buka"].includes(sub)) {
    return m.reply(raraWrap("warungtycoon", box("❓", "❓ *BELUM BUKA USAHA!*", "Ketik .warungtycoon dulu untuk memulai usaha kuliner pertamamu."), "guide"));
  }
  if (!u) {
    u = newUser(m);
    u.bahan = { beras: 10, ayam: 5, cabe: 3 };
    saveDb();
    addCash(m, 2000);
    saveDb();
    return m.reply(box("🍜", "🍜 *SELAMAT DATANG, CALON TAIPAN KULINER!*",
      "Kamu mulai dari " + TIERS[0].tile + " " + TIERS[0].nama + ". Rencananya:\n\n" +
      "🍳 .warungtycoon masak <menu> — masak 5 porsi (butuh bahan)\n" +
      "🛒 .warungtycoon belanja <bahan> <jumlah> — beli bahan\n" +
      "🏪 .warungtycoon buka — buka warung, pelanggan antre!\n" +
      "🎰 .warungtycoon gacha — resep rahasia (2.000 uang, pity 5)\n" +
      "📋 .warungtycoon menu · 📅 .warungtycoon daily · 🏆 .warungtycoon top · ♻️ .warungtycoon franchise\n\n" +
      "🎁 Starter pack: +2.000 uang & bahan (beras 10 · ayam 5 · cabe 3)!\n" +
      "Tujuanmu: 🏛️ Restoran Legendaris… lalu franchise se-Indonesia."));
  }
  if (sub === "status") {
    const t = tierOf(u.level);
    regenStamina(u);
    return m.reply(raraWrap("warungtycoon", box(t.tile, t.tile + " *" + t.nama.toUpperCase() + "*",
      "📊 Level warung: " + u.level + " (" + u.exp + "/" + expNext(u.level) + " EXP)\n" +
      "⚡ Stamina: " + u.stamina + "/" + u.maxStamina + " (+1/5 mnt)\n" +
      "⭐ Rating: " + "★".repeat(u.rating) + "☆".repeat(5 - u.rating) + " (" + u.rating + "/5)\n" +
      "📦 Bahan: " + bahanStr(u) + "\n" +
      "🍽️ Stok:\n" + stokStr(u) + "\n" +
      "🪙 Kupon Emas: " + u.kupon + " · 🪑 Meja: " + u.meja + "\n" +
      "📜 Resep rahasia: " + Object.keys(u.resep || {}).length + "/" + RESEP_RAHASIA.length + " · 🎰 Pity: " + u.pity + "/" + PITY_AT + "\n" +
      "💰 Uang: " + getCash(m) + " · 📈 Total omzet: " + u.totalOmzet + "\n" +
      "♻️ Franchise: " + u.franchise + " (profit +" + u.franchise * 10 + "%) · 🎖️ Rank: " + rankOf(u.franchise) + "\n\n" +
      "Ketik .warungtycoon buka untuk jualan!"), "guide"));
  }

  // ── daftar menu ──
  if (sub === "menu") {
    const rows = MENUS.map((x) => {
      const open = (u.level || 1) >= x.unlock;
      return (open ? "✅ " : "🔒 ") + x.nama + " — Rp" + x.harga + "/porsi · butuh " + Object.entries(x.resep).map(([b, n]) => n + " " + b).join(", ") + (open ? "" : " (lvl " + x.unlock + ")");
    });
    const secret = RESEP_RAHASIA.filter((x) => u.resep?.[x.id]);
    const secretRows = secret.length ? secret.map((x) => "📜 " + x.nama + " — Rp" + x.harga + "/porsi (" + x.raritas + ")").join("\n") : "belum punya — coba .warungtycoon gacha!";
    return m.reply(box("📋", "📋 *MENU & RESEP*", rows.join("\n") + "\n\n📜 *RESEP RAHASIA:*\n" + secretRows + "\n\nMasak: .warungtycoon masak <nama menu>"));
  }

  // ── belanja bahan ──
  if (sub === "belanja") {
    const bahan = (m.args?.[1] || "").toLowerCase();
    const jumlah = Number(m.args?.[2]);
    if (!HARGA_BAHAN[bahan]) return m.reply(raraWrap("warungtycoon", box("🛒", "🛒 *BAHAN TAK ADA*", "Pilihan: beras / ayam / cabe. Contoh: .warungtycoon belanja beras 20"), "guide"));
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 100) return m.reply(raraWrap("warungtycoon", box("🛒", "🛒 *JUMLAH ANEH*", "Masukkan jumlah 1-100. Contoh: .warungtycoon belanja " + bahan + " 20"), "guide"));
    if (u.stamina < 1) return m.reply(box("⚡", "⚡ *KECAPEKAN!*", "Stamina habis (" + u.stamina + "/" + u.maxStamina + "). Istirahat dulu, regen +1 tiap 5 menit."));
    if ((u.bahan[bahan] || 0) + jumlah > BAHAN_CAP) return m.reply(box("📦", "📦 *GUDANG PENUH!*", "Kapasitas " + bahan + " maksimal " + BAHAN_CAP + " (punya " + (u.bahan[bahan] || 0) + ")."));
    const harga = HARGA_BAHAN[bahan] * jumlah;
    if (!spendCash(m, harga)) return m.reply(box("💸", "💸 *KURANG UANG!*", "Belanja " + jumlah + " " + bahan + " butuh " + harga + " uang. Kamu punya " + getCash(m) + ". Coba .warungtycoon daily dulu!"));
    // validasi & pembayaran lolos → baru set state (urutan anti-bug: cooldown setelah validasi)
    u.lastBelanjaAt = Date.now();
    u.stamina -= 1;
    u.bahan[bahan] = (u.bahan[bahan] || 0) + jumlah;
    saveDb();
    return m.reply(box("🛒", "🛒 *BELANJA SUKSES!*", "📦 +" + jumlah + " " + bahan + " (" + harga + " uang)\n" + bahanStr(u) + "\n⚡ Stamina: " + u.stamina + "/" + u.maxStamina));
  }

  // ── masak ──
  if (sub === "masak" || sub === "cook") {
    const namaMenu = (m.args?.[1] || "").toLowerCase();
    const menu = ALL_MENUS.find((x) => x.id === namaMenu) || ALL_MENUS.find((x) => namaMenu.length >= 3 && x.nama.toLowerCase().includes(namaMenu));
    if (!menu) return m.reply(box("🍳", "🍳 *MENU TAK ADA*", "Lihat daftar: .warungtycoon menu"));
    if (menu.raritas && !u.resep?.[menu.id]) return m.reply(box("📜", "📜 *RESEP RAHASIA!*", menu.nama + " cuma bisa dimasak kalau kamu menang resepnya di .warungtycoon gacha."));
    if (MENUS.includes(menu) && (u.level || 1) < menu.unlock) return m.reply(box("🔒", "🔒 *BELUM BUKA MENU!*", menu.nama + " terbuka di level " + menu.unlock + " (kamu " + u.level + ")."));
    if (u.stamina < 1) return m.reply(box("⚡", "⚡ *KECAPEKAN!*", "Stamina habis. Regen +1 tiap 5 menit."));
    if (Date.now() - (u.lastMasakAt || 0) < MASAK_CD_MS) return m.reply(box("⏳", "⏳ *WOK MASIH PANAS!*", "Tunggu sebentar lalu masak lagi."));
    if (!bisaMasak(u, menu)) {
      const kurang = Object.entries(menu.resep).map(([b, n]) => (u.bahan[b] || 0) + "/" + n * MASAK_BATCH + " " + b).join(" · ");
      return m.reply(box("📦", "📦 *BAHAN KURANG!*", "Masak " + MASAK_BATCH + " porsi " + menu.nama + " butuh: " + kurang + "\nBelanja: .warungtycoon belanja <bahan> <jumlah>"));
    }
    // validasi selesai → baru potong state
    u.lastMasakAt = Date.now();
    u.stamina -= 1;
    for (const [b, n] of Object.entries(menu.resep)) u.bahan[b] -= n * MASAK_BATCH;
    u.stok[menu.id] = (u.stok[menu.id] || 0) + MASAK_BATCH;
    u.totalMasak += 1;
    saveDb();
    try { await editSceneAnim(sock, m.chat, masakCinematic(menu, MASAK_BATCH), {}); } catch (e) { console.error("[warung] animasi masak gagal (lanjut):", e); }
    return m.reply(box("🍳", "🍳 *" + MASAK_BATCH + " PORSI " + menu.nama.toUpperCase() + " SIAP!*",
      "🍽️ Stok " + menu.nama + ": ×" + u.stok[menu.id] + "\n" + bahanStr(u) + "\n⚡ Stamina: " + u.stamina + "/" + u.maxStamina + "\n\nSiap dijual — .warungtycoon buka!"));
  }

  // ── buka warung (aksi utama) ──
  if (["buka", "jual", "open", ""].includes(sub)) {
    regenStamina(u);
    if (u.stamina < 2) return m.reply(box("⚡", "⚡ *KECAPEKAN!*", "Buka warung butuh 2 stamina (punya " + u.stamina + "). Regen +1 tiap 5 menit."));
    if (Date.now() - (u.lastBukaAt || 0) < BUKA_CD_MS) return m.reply(box("⏳", "⏳ *TIRAI BARU DITUTUP!*", "Pelanggan pulang dulu. Tunggu sebentar lalu buka lagi."));
    const porsiTersedia = Object.values(u.stok || {}).reduce((a, b) => a + b, 0);
    // validasi selesai → set cooldown & stamina
    u.lastBukaAt = Date.now();
    u.stamina -= 2;
    u.totalBuka += 1;
    saveDb();

    const pelanggan = 4 + (u.level || 1) + (u.meja || 0) + Math.floor(rand() * 3);
    // jual: menu termahal duluan
    const jual = [];
    let sisa = pelanggan;
    for (const menu of [...ALL_MENUS].sort((a, b) => b.harga - a.harga)) {
      if (sisa <= 0) break;
      const ada = u.stok[menu.id] || 0;
      if (ada <= 0) continue;
      const ambil = Math.min(ada, sisa);
      u.stok[menu.id] = ada - ambil;
      jual.push({ menu, jml: ambil });
      sisa -= ambil;
    }
    const terjual = pelanggan - sisa;
    let omzet = jual.reduce((a, x) => a + x.menu.harga * x.jml, 0);
    const omzetDasar = omzet;
    omzet = Math.floor(omzet * profitMult(u));

    // rating dynamics
    let ratingText = "";
    if (porsiTersedia === 0 && pelanggan > 0) {
      u.rating = Math.max(1, u.rating - 1);
      ratingText = "💨 Pelanggan datang… warung kosong! Mereka pergi ke warung sebelah. Rating turun (-1).";
    } else if (sisa === 0 && rand() < 0.25) {
      u.rating = Math.min(5, u.rating + 1);
      ratingText = "🌟 Semua pelanggan terlayani! Gosip masakanmu enak menyebar. Rating naik (+1).";
    }

    // event acak 20% (tipe dicatat buat babak cutscene SCENE 4)
    let eventText = "";
    let evTipe = null, evSukses = false;
    if (rand() < 0.2) {
      const ev = rand();
      if (ev < 0.25) {
        if (rand() < 0.5) {
          evTipe = "kritikus"; evSukses = true;
          u.rating = Math.min(5, u.rating + 1);
          u.kupon = (u.kupon || 0) + 1;
          const tip = 100 * u.rating;
          omzet += tip;
          eventText = "🎩 Kritikus kuliner puas! Tulisannya bikin antrean panjang. Rating +1, +1 🪙 Kupon Emas, tip Rp" + tip + ".";
        } else {
          evTipe = "kritikus";
          u.rating = Math.max(1, u.rating - 1);
          eventText = "🎩 Kritikus kuliner kecewa: \u201Cmiemu… aduh.\u201D Rating -1. Perbaiki menu terbaru untuk membalas dendam!";
        }
      } else if (ev < 0.45) {
        evTipe = "banjir";
        const hilang = Math.floor(omzet * 0.4);
        omzet -= hilang;
        eventText = "🌧️ Hujan deras mengguyur kios! Kas basah, omzetnya ngambek: -Rp" + hilang + ".";
      } else if (ev < 0.65) {
        evTipe = "catering";
        if (porsiTersedia >= 5) {
          evSukses = true;
          const bonus = Math.floor((500 + (u.level || 1) * 25) * profitMult(u));
          omzet += bonus;
          u.kupon = (u.kupon || 0) + 1;
          eventText = "🎉 Pesanan catering dadakan masuk! Dapur kerja ekstra: +Rp" + bonus + ", +1 🪙 Kupon Emas.";
        } else {
          u.rating = Math.max(1, u.rating - 1);
          eventText = "🎉 Pesanan catering dadakan… TAPI STOKMU KURANG (butuh ≥5 porsi)! Kamu nolak sambil gugup. Rating -1.";
        }
      } else if (ev < 0.8) {
        evTipe = "penipu";
        const rugi = Math.min(150, omzet);
        omzet -= rugi;
        eventText = "🤥 Ada yang bayar pakai uang mainan! Rugi Rp" + rugi + ". Hati-hati sama tamu bawa anak.";
      } else {
        evTipe = "supplier";
        u.bahan.beras = Math.min(BAHAN_CAP, (u.bahan.beras || 0) + 5);
        u.bahan.ayam = Math.min(BAHAN_CAP, (u.bahan.ayam || 0) + 3);
        u.bahan.cabe = Math.min(BAHAN_CAP, (u.bahan.cabe || 0) + 2);
        eventText = "📦 Supplier langganan kelehan stok! Bonus bahan gratis: +5 beras, +3 ayam, +2 cabe.";
      }
    }

    // progress EXP & level (level warung internal)
    const expGain = 6 + terjual * 2 + (sisa === 0 ? 4 : 0);
    u.exp += expGain;
    let naikText = "";
    const tLama = tierOf(u.level);
    while (u.exp >= expNext(u.level)) {
      u.exp -= expNext(u.level);
      u.level += 1;
      const baru = MENUS.find((x) => x.unlock === u.level);
      naikText += "\n🎉 LEVEL UP! Warungmu jadi level " + u.level + "!" + (baru ? " Menu baru terbuka: " + baru.nama + "!" : "");
    }
    const tBaru = tierOf(u.level);
    if (tBaru.min > tLama.min) naikText += "\n\n" + tBaru.tile + " NAIK KELAS: sekarang " + tBaru.nama.toUpperCase() + "!";

    if (omzet > 0) addCash(m, omzet);
    u.totalOmzet += Math.max(0, omzet);
    u.totalPelanggan += terjual;
    saveDb();

    // 🎬 cutscene gaya Nintendo multi-babak — durasi nyesuaikan situasi (fallback senyap)
    try {
      await editSceneAnim(sock, m.chat, bukaCinematic({
        tile: tierOf(u.level).tile, rating: u.rating,
        pelanggan, terjual, omzet: Math.max(0, omzet),
        kosong: porsiTersedia === 0 && pelanggan > 0,
        eventTipe: evTipe, eventSukses: evSukses,
      }), {});
    } catch (e) { console.error("[warung] animasi buka gagal (lanjut):", e); }

    const lines = [
      tBaru.tile + " " + tBaru.nama + " buka hari ini:",
      "🙋 Pelanggan: " + pelanggan + " · terlayani: " + terjual + (pelanggan - terjual > 0 ? " · kabur: " + (pelanggan - terjual) : ""),
      jual.length ? "🍽️ Terjual:\n" + jual.map((x) => "· " + x.jml + "× " + x.menu.nama + " (Rp" + x.menu.harga + ")").join("\n") : "🍽️ Tidak ada yang terjual.",
      "💰 Omzet: Rp" + Math.max(0, omzet) + " (dasar Rp" + omzetDasar + " × profit " + Math.round(profitMult(u) * 100) + "%)",
      "⭐ Rating: " + "★".repeat(u.rating) + "☆".repeat(5 - u.rating) + " · ⚡ Stamina: " + u.stamina + "/" + u.maxStamina + " · 📈 +" + expGain + " EXP",
    ];
    if (ratingText) lines.push("", ratingText);
    if (eventText) lines.push("", "🎁 EVENT: " + eventText);
    if (naikText) lines.push(naikText);
    return m.reply(box(tBaru.tile, "🏪 *HASIL JUALAN*", lines.join("\n")));
  }

  // ── gacha resep rahasia ──
  if (sub === "gacha") {
    if (Date.now() - (u.lastGachaAt || 0) < GACHA_CD_MS) return m.reply(box("⏳", "⏳ *MESIN MASIH PANAS!*", "Tunggu sebentar lalu gacha lagi."));
    if (!spendCash(m, GACHA_HARGA)) return m.reply(box("💸", "💸 *KURANG UANG!*", "Gacha resep butuh " + GACHA_HARGA + " uang. Kamu punya " + getCash(m) + "."));
    // validasi & pembayaran lolos → state gacha
    u.lastGachaAt = Date.now();
    u.totalPull += 1;
    saveDb();

    const pityForce = (u.pity || 0) + 1 >= PITY_AT;
    const r = pityForce ? 0.85 + rand() * 0.1 : rand(); // pity → pasti EPIC (zona 0.85-0.95), bukan lebih rendah
    let hasil, rarity;
    if (r < 0.6) { rarity = "Common"; const pack = pick([["beras", 20], ["ayam", 12], ["cabe", 15]]); u.bahan[pack[0]] = Math.min(BAHAN_CAP, (u.bahan[pack[0]] || 0) + pack[1]); hasil = "📦 Bahan bonus: +" + pack[1] + " " + pack[0] + "."; }
    else if (r < 0.85) { rarity = "Rare"; const pool = RESEP_RAHASIA.filter((x) => x.raritas === "Rare" && !u.resep[x.id]); if (pool.length) { const x = pick(pool); u.resep[x.id] = true; hasil = "📜 RESEP RAHASIA: " + x.nama + " (Rp" + x.harga + "/porsi)!"; } else { u.kupon += 1; hasil = "📜 Resep Rare sudah kamu punya semua — diganti +1 🪙 Kupon Emas."; } }
    else if (r < 0.95) { rarity = "Epic"; const pool = RESEP_RAHASIA.filter((x) => x.raritas === "Epic" && !u.resep[x.id]); if (pool.length) { const x = pool[0]; u.resep[x.id] = true; u.kupon += 1; hasil = "📜 RESEP EPIC: " + x.nama + " (Rp" + x.harga + "/porsi)! +1 🪙 Kupon Emas."; } else { u.kupon += 2; hasil = "📜 Resep Epic sudah lengkap — diganti +2 🪙 Kupon Emas."; } }
    else if (r < 0.99) { rarity = "Legendary"; const pool = RESEP_RAHASIA.filter((x) => x.raritas === "Legendary" && !u.resep[x.id]); if (pool.length) { const x = pool[0]; u.resep[x.id] = true; u.kupon += 2; hasil = "🔥 RESEP LEGENDARY: " + x.nama + " (Rp" + x.harga + "/porsi)! +2 🪙 Kupon Emas."; } else { u.kupon += 3; hasil = "🔥 Resep Legendary sudah milikmu — diganti +3 🪙 Kupon Emas."; } }
    else { rarity = "Mitos"; const w = RESEP_RAHASIA.find((x) => x.id === "warisan"); u.resep[w.id] = true; u.kupon += 5; u.rating = Math.min(5, u.rating + 1); hasil = "✨✨✨ JACKPOT MITOS: " + w.nama + "!! Kupon +5, rating +1! Seluruh kompleks kedengaran tepuk tanganmu!"; }

    const before = u.pity || 0;
    u.pity = ["Epic", "Legendary", "Mitos"].includes(rarity) ? 0 : before + 1;
    saveDb();

    const pityInfo = u.pity === 0 ? "Pity reset (dapat Epic+)." : "Pity: " + u.pity + "/" + PITY_AT + (pityForce ? " (garansi terpakai)" : "");
    const text = box("🎰", "🎰 *GACHA RESEP RAHASIA*", hasil + "\n\n" + pityInfo + "\n\nTarik lagi: .warungtycoon gacha");
    try { await m.reply(text); }
    catch (e) { // kirim gagal → refund (transaksi jujur)
      console.error("[warung] gacha reply gagal (refund):", e);
      addCash(m, GACHA_HARGA);
      u.totalPull -= 1;
      u.pity = before;
      saveDb();
    }
    return true;
  }

  // ── renovasi (kupon → meja) ──
  if (sub === "renovasi") {
    if ((u.meja || 0) >= MEJA_CAP) return m.reply(box("🪑", "🪑 *MAXIMAL!*", "Meja warungmu sudah " + MEJA_CAP + " — gedung gak muat lagi."));
    if ((u.kupon || 0) < RENOVASI_KUPON) return m.reply(box("🪙", "🪙 *KUPON KURANG!*", "Renovasi butuh " + RENOVASI_KUPON + " Kupon Emas (punya " + (u.kupon || 0) + "). Kumpulkan dari kritikus, catering, dan gacha."));
    u.kupon -= RENOVASI_KUPON;
    u.meja += 1;
    saveDb();
    return m.reply(box("🪑", "🪑 *RENOVASI SELESAI!*", "+1 meja (total " + u.meja + ") — kapasitas pelanggan bertambah tiap buka warung!\n🪙 Kupon sisa: " + u.kupon));
  }

  // ── daily ──
  if (sub === "daily") {
    const d = getLocalDateObject();
    const today = d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear();
    if (u.lastDaily === today) return m.reply(box("📅", "📅 *SUDAH DIKLAIM!*", "Bonus harian sudah diambil. Kembali besok!"));
    u.dailyStreak = u.lastDaily && isYesterday(u.lastDaily, d) ? (u.dailyStreak || 0) + 1 : 1;
    u.lastDaily = today;
    const gold = 30 + (u.dailyStreak - 1) * 10;
    addCash(m, gold);
    u.bahan.beras = Math.min(BAHAN_CAP, (u.bahan.beras || 0) + 10);
    u.bahan.ayam = Math.min(BAHAN_CAP, (u.bahan.ayam || 0) + 5);
    u.bahan.cabe = Math.min(BAHAN_CAP, (u.bahan.cabe || 0) + 5);
    u.stamina = u.maxStamina;
    u.staminaAt = Math.floor(Date.now() / 1000);
    saveDb();
    return m.reply(box("📅", "📅 *BONUS HARIAN WARUNG!*", "🪙 +" + gold + " uang · 📦 +10 beras, +5 ayam, +5 cabe · ⚡ Stamina penuh\n🔥 Streak: " + u.dailyStreak + " hari (bonus +" + (u.dailyStreak - 1) * 10 + " uang)"));
  }

  // ── leaderboard ──
  if (sub === "top" || sub === "leaderboard") {
    const db = getDatabase();
    const list = Object.entries(db.data.warung?.users || {})
      .map(([jid, x]) => ({ jid, franchise: x.franchise || 0, totalOmzet: x.totalOmzet || 0, level: x.level || 1, rating: x.rating || 3 }))
      .sort((a, b) => (b.franchise - a.franchise) || (b.totalOmzet - a.totalOmzet) || (b.level - a.level))
      .slice(0, 10);
    const body = list.length
      ? list.map((x, i) => (i + 1) + ". " + x.jid.split("@")[0] + " — ♻️" + x.franchise + " · 📈Rp" + x.totalOmzet + " · lvl " + x.level + " · ⭐" + x.rating).join("\n")
      : "Belum ada juragan warung terdaftar.";
    return m.reply(box("🏆", "🏆 *PAPAN TAIPAN KULINER*", body));
  }

  // ── franchise (prestasi) ──
  if (sub === "franchise" || sub === "prestasi") {
    const t = tierOf(u.level);
    if (u.level < TIERS[TIERS.length - 1].min) return m.reply(box("♻️", "♻️ *BELUM LAYAK!*", "Franchise butuh warung level " + TIERS[TIERS.length - 1].min + " (" + TIERS[TIERS.length - 1].nama + "). Kamu masih " + t.nama + " level " + u.level + "."));
    if ((u.totalOmzet || 0) < FRANCHISE_OMZET_MIN) return m.reply(box("♻️", "♻️ *OMZET BELUM CUKUP!*", "Franchise butuh total omzet Rp" + FRANCHISE_OMZET_MIN.toLocaleString("id-ID") + " (kamu Rp" + (u.totalOmzet || 0).toLocaleString("id-ID") + ")."));
    u.franchise = (u.franchise || 0) + 1;
    u.level = 1; u.exp = 0;
    u.stok = {};
    u.bahan = { beras: 10, ayam: 5, cabe: 3 };
    u.rating = 3;
    u.pity = 0;
    u.stamina = u.maxStamina;
    u.staminaAt = Math.floor(Date.now() / 1000);
    u.kupon = (u.kupon || 0) + 5;
    // resep rahasia & meja TETAP milik pemain
    saveDb();
    return m.reply(box("♻️", "♻️ *FRANCHISE KEBANGGAAN BARU!*",
      "Warung legendarismu jadi waralaba! Franchise ke-" + u.franchise + ":\n\n" +
      "📈 Profit permanen +" + u.franchise * 10 + "%\n" +
      "🪙 +5 Kupon Emas · 🪑 Meja: " + u.meja + " (tetap) · 📜 Resep rahasia: TETAP MILIKMU\n" +
      "🎖️ Rank: " + rankOf(u.franchise) + "\n\n" +
      "Warung baru mulai dari " + TIERS[0].tile + " " + TIERS[0].nama + " — dengan pengalaman yang jauh lebih tajam."));
  }

  // ── bantuan ──
  return m.reply(box("🍜", "🍜 *WARUNG TYCOON*",
    "🍳 .warungtycoon masak <menu> — masak 5 porsi\n" +
    "🛒 .warungtycoon belanja <bahan> <jumlah>\n" +
    "🏪 .warungtycoon buka — jualan, pelanggan antre!\n" +
    "📋 .warungtycoon menu · 📊 .warungtycoon status\n" +
    "🎰 .warungtycoon gacha (2.000 uang) · 🪑 .warungtycoon renovasi\n" +
    "📅 .warungtycoon daily · 🏆 .warungtycoon top · ♻️ .warungtycoon franchise"));
}

function isYesterday(last, d) {
  const [dd, mm, yy] = String(last).split("-").map(Number);
  const y = new Date(d.getTime() - 86400000);
  return dd === y.getDate() && mm === y.getMonth() + 1 && yy === y.getFullYear();
}

const _setRandForTest = (fn) => { _rand = fn || Math.random; };
export { handler, MENUS, RESEP_RAHASIA, TIERS, _setRandForTest };
export { _setWarungAnimMsForTest } from "../../src/lib/libanimationrpg/libwarungtycoonrpg.js";
export default {
  name: ["warungtycoon", "warung", "tycoon"],
  category: "rpg",
  desc: "Bangun warung mie linting jadi restoran legendaris: masak, jualan, rating, resep rahasia",
  usage: ".warungtycoon | .warungtycoon masak <menu> | .warungtycoon buka | .warungtycoon gacha | .warungtycoon franchise",
  handler,
};
