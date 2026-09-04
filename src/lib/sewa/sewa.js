// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/sewa/sewa.js — Sumber tunggal harga & info SEWA BOT + BELI PREMIUM
//
// ✦ UTAK ATIK HARGA CUKUP DI FILE INI — semua fitur auto-update:
//   .sewa, .premium, .payment (carousel), .buysewa, .buyprem, .sc, .addsewa
//
// Dipindah dari: src/lib/sewa.js (sewa) + hardcode PREMIUM_PRICES di
// plugins/info/premium.js & plugins/main/buyprem.js (premium).

// ═══════════════════════════════════════════
// SEWA BOT
// ═══════════════════════════════════════════
export const sewaPrice = {
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

// ═══════════════════════════════════════════
// BELI PREMIUM
// ═══════════════════════════════════════════
// HARGA PREMIUM per paket durasi
// duration = kode durasi untuk .addprem (wajib konsisten)
// label    = nama paket yang tampil di menu
// desc     = keterangan durasi (opsional, tampil di .premium)
// price    = harga tampil (string bebas, format "Rp x.xxx" atau "Nego")
// days     = jumlah hari (0 = lifetime)
export const premiumPrice = [
  { duration: "7d", label: "Harian", desc: "7 Hari", price: "Rp 10.000", days: 7 },
  { duration: "30d", label: "Bulanan", desc: "30 Hari", price: "Rp 25.000", days: 30 },
  { duration: "90d", label: "Triwulan", desc: "90 Hari", price: "Rp 60.000", days: 90 },
  { duration: "lifetime", label: "Permanent", desc: "Seumur Hidup", price: "Rp 150.000", days: 0 },
];

// Alias kompatibilitas — import lama (PREMIUM_PRICES) tetap jalan
export const PREMIUM_PRICES = premiumPrice;
