// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// File terpisah untuk data payment & donasi
// Bisa di-obfuscate sendiri tanpa ganggu config.js utama
//
// ATURAN:
// - Metode yang nomornya DIISI → otomatis AKTIF (muncul di bot)
// - Metode yang nomornya KOSONG → otomatis NONAKTIF (disembunyikan)
// - Tinggal isi nomor + nama pemilik, simpan, restart bot

export const payment = {
  // QRIS — isi dengan path gambar atau URL, kosongin "" untuk nonaktif
  qrisUrl: "./assets/image/store/aizat-store-qris.jpg",

  // E-Wallet — isi number untuk aktif, kosongin untuk nonaktif
  methods: [
    { name: "Dana", number: "", holder: "" },
    { name: "GoPay", number: "", holder: "" },
    { name: "OVO", number: "", holder: "" },
    { name: "ShopeePay", number: "", holder: "" },
    { name: "LinkAja", number: "", holder: "" },
    { name: "DOKU", number: "", holder: "" },
    { name: "Jenius Pay", number: "", holder: "" },
  ],

  // Bank Transfer — isi number untuk aktif, kosongin untuk nonaktif
  banks: [
    { name: "BCA", number: "", holder: "" },
    { name: "BRI", number: "", holder: "" },
    { name: "BNI", number: "", holder: "" },
    { name: "Mandiri", number: "", holder: "" },
    { name: "CIMB Niaga", number: "", holder: "" },
  ],

  // Cash / COD
  cash: {
    enabled: false,
    info: "",
  },

  customText: "https://imgdrop.web.id/KodpV.webp",
};

export const donasi = {
  // E-Wallet — isi number untuk aktif, kosongin untuk nonaktif
  payment: [
    { name: "Dana", number: "", holder: "" },
    { name: "GoPay", number: "", holder: "" },
    { name: "OVO", number: "", holder: "" },
    { name: "ShopeePay", number: "", holder: "" },
    { name: "LinkAja", number: "", holder: "" },
  ],

  benefits: [
    "Mendukung development",
    "Server lebih stabil",
    "Fitur baru lebih cepat",
    "Priority support",
  ],

  // QRIS untuk donasi — isi path gambar, kosongin "" untuk nonaktif
  qris: "./assets/image/store/aizat-store-qris.jpg",
};
