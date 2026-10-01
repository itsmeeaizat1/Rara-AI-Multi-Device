// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// features.js — Toggle fitur, energi, registrasi, welcome/goodbye

export const features = {
  // 🔹 DEFAULT false (request owner 18 Sep: "tkutnya keluarga saya yg
  // nlpon jd mngkin hrs ada opsi tolak telepon on off") — panggilan masuk
  // TIDAK ditolak secara default. Atur per bot: .anticall on|info|off
  antiCall: false,
  blockIfCall: false,
  autoTyping: false,
  autoRead: true,
  logMessage: false,
  dailyLimitReset: true,
  smartTriggers: false,
  commandSuggestion: true,
  commandSuggestionCooldown: 5,
  commandSuggestionSmart: false,
};

export const registration = {
  enabled: false,
  rewards: {
    koin: 30000,
    energi: 300,
    exp: 300000,
  },
};

export const energi = {
  enabled: true,
  default: 300,
  premium: 1000,
  owner: -1,
  // HARGA TOPUP LIMIT — dipakai katalog .payment (kartu Topup Limit Fitur).
  // Owner jual manual via .topuplimit @user <jumlah> — ubah harga di sini,
  // katalog .payment auto-update.
  topup: [
    { amount: 500, price: "Rp 5.000" },
    { amount: 1500, price: "Rp 10.000" },
    { amount: 3000, price: "Rp 20.000" },
    { amount: -1, label: "Unlimited", price: "Nego" },
  ],
};

export const welcome = { defaultEnabled: false };
export const goodbye = { defaultEnabled: false };
