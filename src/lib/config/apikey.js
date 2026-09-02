// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// apikey.js — PUSAT SEMUA API KEY & TOKEN
// Single source of truth untuk semua key/sandi/credentials
// Key sensitif di sini, config non-key di file lain
//
// Yang ada di src/lib/apikey/*.json tetap dibaca via env-loader.js
// File ini hanya untuk key yang sebelumnya hardcoded di config.js

import { getApiKeys, getTioKey, getPteroConfig } from "./env-loader.js";

// ═══════════════════════════════════════════
// API KEYS — dipakai oleh berbagai config domain
// ═══════════════════════════════════════════
export const apiKeys = {
  // Tio AI (AIO — support OpenAI/Gemini/Anthropic format)
  tioKey: getTioKey(),

  // Gemini API Key (standalone — untuk .autoai)
  // Ambil di: https://aistudio.google.com/apikey
  geminiStandalone: "Ab8RN6I9akckrF9inEsfCm-I1KyihGlYDNSoZ_b8nNgAIB-aDg",

  // Vercel — https://vercel.com/account/tokens
  vercelToken: "",

  // ClipDrop — https://clipdrop.co/apis (gratis 100 credits)
  clipdropApiKey: "",

  // NewsAPI.org — https://newsapi.org (free 100 req/day)
  newsApiKey: "",

  // NewsData.io — https://newsdata.io (free 200 req/day)
  newsDataKey: "",

  // RAWG.io — https://rawg.io (free game database)
  rawgApiKey: "",

  // OpenWeather — https://openweathermap.org (free 1000 req/day)
  openWeatherKey: "",

  // Binderbyte — https://binderbyte.com (cek resi)
  binderbyteKey: "",

  // Fallback key (kalau per-format kosong, pakai ini)
  fallbackApiKey: "",

  // DigitalOcean — https://cloud.digitalocean.com
  digitalOceanToken: "",

  // Alight Motion Premium — https://api.znn.my.id
  // Dapatkan token dari admin x-znn: wa.me/6285348284121
  // IP server Pterodactyl kamu harus di-whitelist oleh admin
  alightMotionToken: "",

  // Weather API key (untuk provider berbayar)
  weatherApiKey: "",

  // Email OTP (disarankan via env vars)
  emailOtpUser: process.env.EMAILOTP_USER || "",
  emailOtpPass: process.env.EMAILOTP_PASS || "",

  // Pterodactyl config (dari apikeys.json via env-loader)
  pterodactyl: getPteroConfig(),

  // API keys dari JSON files (lolhuman, neoxr, google, groq, dll)
  // Managed via config/apikeys.json -> env-loader.js
  APIkey: getApiKeys(),
};
