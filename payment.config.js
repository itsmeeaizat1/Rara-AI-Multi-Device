// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// File terpisah untuk data payment & donasi
// Bisa di-obfuscate sendiri tanpa ganggu config.js utama

export const payment = {
  qrisUrl: "./assets/image/aizat-store-qris.jpg",
  methods: [
    { name: "Dana", number: "", holder: "" },
    { name: "GoPay", number: "", holder: "" },
    { name: "OVO", number: "", holder: "" },
    { name: "ShopeePay", number: "", holder: "" },
  ],
  banks: [],
  customText: "https://imgdrop.web.id/KodpV.webp",
};

export const donasi = {
  payment: [
    { name: "Dana", number: "08xxxxxxxxxx", holder: "Nama Owner" },
    { name: "GoPay", number: "08xxxxxxxxxx", holder: "Nama Owner" },
    { name: "OVO", number: "08xxxxxxxxxx", holder: "Nama Owner" },
  ],
  links: [
    { name: "Saweria", url: "saweria.co/username" },
    { name: "Trakteer", url: "trakteer.id/username" },
  ],
  benefits: [
    "Mendukung development",
    "Server lebih stabil",
    "Fitur baru lebih cepat",
    "Priority support",
  ],
  qris: "./assets/image/aizat-store-qris.jpg",
};
