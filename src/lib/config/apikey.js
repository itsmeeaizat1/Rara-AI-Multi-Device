// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// apikey.js — PUSAT SEMUA API KEY & TOKEN
// Single source of truth untuk semua key/sandi/credentials
// Key sensitif di sini, config non-key di file lain
//
// Yang ada di src/lib/apikey/*.json tetap dibaca via env-loader.js
// File ini hanya untuk key yang sebelumnya hardcoded di config.js

import { getApiKeys, getTioKey, getPteroConfig } from "./env-loader.js";

// PUSATISASI 17 Sep 2026 (request owner): SEMUA key sekarang ada di
// src/lib/apikey/apikeys.json (section aiSatuan/aiMultiprovider/novaai/
// scraper/fitur). File ini CUMA mapping — gak ada key hardcoded di sini
// lagi. Ganti key = edit apikeys.json → .reloadkey / restart.

// ═══════════════════════════════════════════
// API KEYS — dipakai oleh berbagai config domain
// ═══════════════════════════════════════════
const keys = getApiKeys(); // flat dari apikeys.json — SATU SUMBER KEY

export const apiKeys = {
  // Tio AI (AIO — support OpenAI/Gemini/Anthropic format)
  tioKey: getTioKey(),

  // Gemini API Key (standalone — untuk .autoai) → apikeys.json fitur.geminiStandalone
  geminiStandalone: keys.geminiStandalone || "",

  // Vercel — https://vercel.com/account/tokens
  vercelToken: keys.vercelToken || "",  // isi di apikeys.json section "fitur"

  // ClipDrop — https://clipdrop.co/apis (gratis 100 credits)
  clipdropApiKey: keys.clipdropApiKey || "",  // isi di apikeys.json section "fitur"

  // NewsAPI.org — https://newsapi.org (free 100 req/day)
  newsApiKey: keys.newsApiKey || "",  // isi di apikeys.json section "fitur"

  // NewsData.io — https://newsdata.io (free 200 req/day)
  newsDataKey: keys.newsDataKey || "",  // isi di apikeys.json section "fitur"

  // RAWG.io — https://rawg.io (free game database)
  rawgApiKey: keys.rawgApiKey || "",  // isi di apikeys.json section "fitur"

  // OpenWeather — https://openweathermap.org (free 1000 req/day)
  // Key ini juga buat One Call 3.0 (nowcast hujan per-menit .hujannotif)
  // → apikeys.json fitur.openWeatherKey
  openWeatherKey: keys.openWeatherKey || "",

  // Binderbyte — https://binderbyte.com (cek resi)
  binderbyteKey: keys.binderbyteKey || "",  // isi di apikeys.json section "fitur"

  // Fallback key (kalau per-format kosong, pakai ini)
  fallbackApiKey: keys.fallbackApiKey || "",  // isi di apikeys.json section "fitur"

  // DigitalOcean — https://cloud.digitalocean.com
  digitalOceanToken: keys.digitalOceanToken || "",  // isi di apikeys.json section "fitur"

  // Alight Motion Premium — https://api.znn.my.id
  // Dapatkan token dari admin x-znn: wa.me/6285348284121
  // IP server Pterodactyl kamu harus di-whitelist oleh admin
  alightMotionToken: keys.alightMotionToken || "",  // isi di apikeys.json section "fitur"

  // Weather API key (untuk provider berbayar)
  weatherApiKey: keys.weatherApiKey || "",  // isi di apikeys.json section "fitur"

  // Email OTP (disarankan via env vars)
  emailOtpUser: process.env.EMAILOTP_USER || "",
  emailOtpPass: process.env.EMAILOTP_PASS || "",

  // Pterodactyl config (dari apikeys.json via env-loader)
  pterodactyl: getPteroConfig(),

  // API keys dari JSON files (lolhuman, neoxr, google, groq, dll)
  // Managed via config/apikeys.json -> env-loader.js
  APIkey: getApiKeys(),
};
