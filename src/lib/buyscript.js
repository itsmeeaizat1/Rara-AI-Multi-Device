// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buyscript.js — Konfigurasi harga beli script, sewa bot, jasa install
// Dipakai di: plugins/main/sc.js, plugins/info/sewa.js
// Ubah harga di sini → sc.js & sewa.js auto-update

export const scriptPrice = {
  // Harga utama
  beliScript: "Rp 150.000",    // Full source code + dokumentasi + update bulanan
  sewaBot: "Rp 50.000",       // Per bulan (samakan dengan config.sewaPrice.monthly)
  jasaInstall: "Rp 50.000",   // Sekali install di Pterodactyl / VPS

  // Detail paket beli script
  beliScriptIncludes: [
    "Full source code + dokumentasi",
    "Free update 1x bulan",
    "Bisa rename, rebrand, jual ulang",
    "Support install via Pterodactyl / VPS",
    "Garansi 30 hari (bug fix)",
  ],

  // Detail paket sewa bot
  sewaBotIncludes: [
    "Bot jadiin admin di grup kamu",
    "Semua fitur aktif (sesuai mode)",
    "Free setting welcome, anti-link, dll",
    "Support 24/7 (selama server online)",
  ],

  // Detail jasa install
  jasaInstallIncludes: [
    "Install di Pterodactyl / VPS kamu",
    "Setting session, config, database",
    "Garansi install 7 hari",
  ],
};


// Helper: ambil scriptPrice
export function getScriptPrice() {
  return scriptPrice;
}
