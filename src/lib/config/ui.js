// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ui.js — Konfigurasi tampilan UI (menu/reply variants) & dev mode

export const ui = {
  menuVariant: 1,
  menuVideoUrl: "",
  allmenuVideoUrl: "",
  allmenuVariant: 3,
  replyVariant: 1,
};

// Dev mode settings (auto-enabled jika NODE_ENV=development)
export const dev = {
  enabled: process.env.NODE_ENV === "development",
  watchPlugins: true, // Hot reload plugins (SAFE)
  watchSrc: false, // DISABLED - src reload causes connection conflict 440
  debugLog: false, // Show stack traces
};
