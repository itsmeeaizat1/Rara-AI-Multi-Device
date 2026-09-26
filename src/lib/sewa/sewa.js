// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/sewa/sewa.js — Sumber tunggal harga & info SEWA BOT + BELI PREMIUM
//
// ✦ UTAK ATIK HARGA CUKUP DI FILE INI — semua fitur auto-update:
//   .sewa, .premium, .payment (carousel), .buysewa, .buyprem, .sc, .addsewa
//
// Dipindah dari: src/lib/rent.js (sewa) + hardcode PREMIUM_PRICES di
// plugins/sewa-premium/premium.js & plugins/sewa-premium/buyprem.js (premium).

// ═══════════════════════════════════════════
// OVERRIDE LIVE VIA .setsewa (persist DB, tanpa edit file)
// ═══════════════════════════════════════════
import { getDatabase } from "../nova-database.js";

const SEWA_FIELDS = ["daily", "weekly", "monthly", "yearly", "lifetime", "custom", "qrisUrl"];

function readOverrides() {
  try {
    return getDatabase().setting("sewaOverrides") || {};
  } catch {
    return {};
  }
}

function writeOverrides(ov) {
  getDatabase().setting("sewaOverrides", ov);
}

/**
 * Terapkan override DB ke objek sewaPrice & premiumPrice.
 * Dipanggil: (1) startup di index.js setelah initDatabase,
 *            (2) tiap set/reset dari .setsewa.
 * Objek dimutasi in-place → semua importer tetap kebaca nilai baru.
 */
export function syncSewaOverrides() {
  const ov = readOverrides();
  for (const f of SEWA_FIELDS) {
    if (ov.sewa && ov.sewa[f] !== undefined) sewaPrice[f] = ov.sewa[f];
    else if (DEFAULT_SEWA[f] !== undefined) sewaPrice[f] = DEFAULT_SEWA[f];
  }
  for (let i = 0; i < premiumPrice.length && i < DEFAULT_PREMIUM.length; i++) {
    const patch = ov.premium?.[premiumPrice[i].duration];
    if (patch) Object.assign(premiumPrice[i], DEFAULT_PREMIUM[i], patch);
    else Object.assign(premiumPrice[i], DEFAULT_PREMIUM[i]);
  }
}

/** Set satu field harga sewa (live + persist). Field valid: daily/weekly/monthly/yearly/lifetime/custom/qrisUrl */
export function setSewaPrice(field, value) {
  if (!SEWA_FIELDS.includes(field)) {
    throw new Error(`Field sewa tidak dikenal: ${field}`);
  }
  const ov = readOverrides();
  ov.sewa = { ...(ov.sewa || {}), [field]: value };
  writeOverrides(ov);
  sewaPrice[field] = value;
  return sewaPrice;
}

/** Set harga/label paket premium by duration (live + persist). Patch: { price?, label? } */
export function setPremiumPrice(duration, patch) {
  const pkg = premiumPrice.find((x) => x.duration.toLowerCase() === String(duration).toLowerCase());
  if (!pkg) {
    throw new Error(`Durasi premium tidak dikenal: ${duration}`);
  }
  const ov = readOverrides();
  ov.premium = { ...(ov.premium || {}) };
  ov.premium[pkg.duration] = { ...(ov.premium[pkg.duration] || {}), ...patch };
  writeOverrides(ov);
  Object.assign(pkg, patch);
  return pkg;
}

/** Reset semua override ke default file (persist). */
export function resetSewaPrices() {
  writeOverrides({});
  Object.assign(sewaPrice, DEFAULT_SEWA);
  premiumPrice.forEach((pkg, i) => Object.assign(pkg, DEFAULT_PREMIUM[i]));
}

// ═══════════════════════════════════════════
// SEWA BOT
// ═══════════════════════════════════════════
const DEFAULT_SEWA = {
  // QRIS KHUSUS SEWA BOT (bisa beda sama payment & donasi)
  qrisUrl: "./assets/image/store/aizat-store-qris.jpg",

  // HARGA SEWA BOT - Default per durasi
  // Owner bisa override via .addsewa <link> <durasi> <harga>
  // atau .approvesewa <nomor> <harga>
  daily: "Rp 5.000",        // per hari (7d, 30d, dll)
  weekly: "Rp 25.000",      // per minggu
  monthly: "Rp 50.000",     // per bulan (1m, 2m, dll)
  yearly: "Rp 300.000",     // per tahun (1y, 2y, dll)
  lifetime: "Rp 500.000",   // permanent / lifetime
  custom: "Nego",           // durasi custom / nego
};

export const sewaPrice = { ...DEFAULT_SEWA };

// ═══════════════════════════════════════════
// BELI PREMIUM
// ═══════════════════════════════════════════
// HARGA PREMIUM per paket durasi
// duration = kode durasi untuk .addprem (wajib konsisten)
// label    = nama paket yang tampil di menu
// desc     = keterangan durasi (opsional, tampil di .premium)
// price    = harga tampil (string bebas, format "Rp x.xxx" atau "Nego")
// days     = jumlah hari (0 = lifetime)
const DEFAULT_PREMIUM = [
  { duration: "7d", label: "Harian", desc: "7 Hari", price: "Rp 10.000", days: 7 },
  { duration: "30d", label: "Bulanan", desc: "30 Hari", price: "Rp 25.000", days: 30 },
  { duration: "90d", label: "Triwulan", desc: "90 Hari", price: "Rp 60.000", days: 90 },
  { duration: "lifetime", label: "Permanent", desc: "Seumur Hidup", price: "Rp 150.000", days: 0 },
];

export const premiumPrice = DEFAULT_PREMIUM.map((p) => ({ ...p }));

// Alias kompatibilitas — import lama (PREMIUM_PRICES) tetap jalan
export const PREMIUM_PRICES = premiumPrice;
