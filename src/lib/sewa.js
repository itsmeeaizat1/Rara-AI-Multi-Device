// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// sewa.js — Konfigurasi harga sewa bot per durasi
// Dipakai di: plugins/info/sewa.js, plugins/main/sc.js, src/lib/nova-sewa-price.js
// Ubah harga sewa di sini → semua plugin auto-update

export const sewaPrice = {
  // QRIS KHUSUS SEWA BOT (bisa beda sama payment & donasi)
  qrisUrl: "./assets/image/store/aizat-store-qris.jpg",

  // HARGA SEWA BOT - Default per durasi
  // Format: Rp format Indonesia
  // Owner bisa override via .addsewa <link> <durasi> <harga>
  // atau .approvesewa <nomor> <harga>
  daily: "Rp 5.000",        // per hari (7d, 30d, dll)
  weekly: "Rp 25.000",      // per minggu
  monthly: "Rp 50.000",     // per bulan (1m, 2m, dll)
  yearly: "Rp 300.000",     // per tahun (1y, 2y, dll)
  lifetime: "Rp 500.000",   // permanent / lifetime
  custom: "Nego",           // durasi custom / nego
};
