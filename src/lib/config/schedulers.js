// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// schedulers.js — Konfigurasi cuaca, scheduler notifikasi cuaca & loker

// Konfigurasi Cuaca (untuk info section menu + .weather)
// Provider: open-meteo (gratis, tanpa API key) atau accuweather (butuh key)
// Lokasi default: Jakarta (request owner 8 Sep 2026: zona default jakarta aja pas pairing pertama)
export const weather = {
  provider: "open-meteo",
  apiKey: "", // Via apikey.js jika berbayar
  timezone: "Asia/Jakarta",
  location: {
    name: "Jakarta",
    latitude: -6.2088,
    longitude: 106.8456,
  },
};

// Laporan cuaca otomatis memakai Open-Meteo (gratis, tanpa API key).
// Aktifkan dan tentukan grup tujuan melalui command .weather.
export const weatherScheduler = {
  enabled: false,
  timezone: "Asia/Jakarta",
  location: {
    name: "Jakarta",
    latitude: -6.2088,
    longitude: 106.8456,
  },
  schedules: [
    { key: "pagi", label: "Pagi", hour: 6, minute: 30 },
    { key: "siang", label: "Siang", hour: 12, minute: 0 },
    { key: "sore", label: "Sore", hour: 17, minute: 0 },
    { key: "malam", label: "Malam", hour: 20, minute: 0 },
  ],
};

// Info lowongan kerja otomatis.
// Aktifkan dan tentukan grup tujuan melalui command .loker.
export const lokerScheduler = {
  enabled: false,
  timezone: "Asia/Jakarta",
  keywords: [],
  categories: [],
  maxPerBroadcast: 5,
  schedules: [
    { key: "pagi", label: "Pagi", hour: 8, minute: 0 },
    { key: "siang", label: "Siang", hour: 13, minute: 0 },
    { key: "sore", label: "Sore", hour: 17, minute: 0 },
  ],
  // v24.2.8 — "linkedin" pertama: satu-satunya sumber loker INDONESIA yang
  // masih hidup. JobStreet/Glints/Kalibrr/Indeed memblokir scraping (500/404/403)
  // → kalau cuma mereka, notif isinya loker luar negeri (USA/Jerman).
  sources: ["linkedin", "jobstreet", "glints", "kalibrr", "indeed", "remotive", "arbeitnow"],
};
