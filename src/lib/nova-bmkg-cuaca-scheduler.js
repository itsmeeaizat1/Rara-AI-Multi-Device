// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * nova-bmkg-cuaca-scheduler.js
 * Scheduler cuaca rinci BMKG-style menggunakan Open-Meteo API.
 * Data: temperatur, kelembapan, angin, tekanan, presipitasi, UV, visibility, cloud cover.
 * Format laporan lengkap seperti BMKG, jauh lebih rinci dari wttr.in.
 */

import { CronJob } from "cron";
import { getDatabase } from "./nova-database.js";
import { logger } from "./nova-logger.js";

const TZ = "Asia/Jakarta";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

let sock = null;
let cuacaJobs = [];

// ────────────────────────────────────────────────────────────────────────────
// WMO WEATHER CODES (sama dengan BMKG)
// ────────────────────────────────────────────────────────────────────────────

const WMO_CODES = {
  0: { desc: "Cerah", icon: "☀️", en: "Clear sky" },
  1: { desc: "Sebagian Cerah", icon: "🌤️", en: "Mainly clear" },
  2: { desc: "Berawan Sebagian", icon: "⛅", en: "Partly cloudy" },
  3: { desc: "Berawan", icon: "☁️", en: "Overcast" },
  45: { desc: "Berkabut", icon: "🌫️", en: "Fog" },
  48: { desc: "Kabut Deposit Rime", icon: "🌫️", en: "Depositing rime fog" },
  51: { desc: "Gerimis Ringan", icon: "🌦️", en: "Light drizzle" },
  53: { desc: "Gerimis Sedang", icon: "🌦️", en: "Moderate drizzle" },
  55: { desc: "Gerimis Lebat", icon: "🌧️", en: "Dense drizzle" },
  56: { desc: "Gerimis Beku Ringan", icon: "🌨️", en: "Light freezing drizzle" },
  57: { desc: "Gerimis Beku Lebat", icon: "🌨️", en: "Dense freezing drizzle" },
  61: { desc: "Hujan Ringan", icon: "🌦️", en: "Slight rain" },
  63: { desc: "Hujan Sedang", icon: "🌧️", en: "Moderate rain" },
  65: { desc: "Hujan Lebat", icon: "🌧️", en: "Heavy rain" },
  66: { desc: "Hujan Beku Ringan", icon: "🌨️", en: "Light freezing rain" },
  67: { desc: "Hujan Beku Lebat", icon: "🌨️", en: "Heavy freezing rain" },
  71: { desc: "Salju Ringan", icon: "🌨️", en: "Slight snow fall" },
  73: { desc: "Salju Sedang", icon: "❄️", en: "Moderate snow fall" },
  75: { desc: "Salju Lebat", icon: "❄️", en: "Heavy snow fall" },
  77: { desc: "Butiran Salju", icon: "🌨️", en: "Snow grains" },
  80: { desc: "Hujan Lokal Ringan", icon: "🌦️", en: "Slight rain showers" },
  81: { desc: "Hujan Lokal Sedang", icon: "🌧️", en: "Moderate rain showers" },
  82: { desc: "Hujan Lokal Lebat", icon: "⛈️", en: "Violent rain showers" },
  85: { desc: "Salju Lokal Ringan", icon: "🌨️", en: "Slight snow showers" },
  86: { desc: "Salju Lokal Lebat", icon: "❄️", en: "Heavy snow showers" },
  95: { desc: "Badai Petir Ringan", icon: "⛈️", en: "Thunderstorm" },
  96: { desc: "Badai Petir Hujan Es Ringan", icon: "⛈️", en: "Thunderstorm slight hail" },
  99: { desc: "Badai Petir Hujan Es Lebat", icon: "⛈️", en: "Thunderstorm heavy hail" },
};

const WIND_DIR = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function windDirection(deg) {
  return WIND_DIR[Math.round(deg / 22.5) % 16];
}

function getWmo(code) {
  return WMO_CODES[code] || { desc: "Tidak Diketahui", icon: "❓", en: "Unknown" };
}

// ────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_LOCATIONS = [
  { name: "Jakarta", lat: -6.2088, lon: 106.8456, province: "DKI Jakarta" },
  { name: "Bandung", lat: -6.9175, lon: 107.6191, province: "Jawa Barat" },
  { name: "Surabaya", lat: -7.2575, lon: 112.7521, province: "Jawa Timur" },
  { name: "Medan", lat: 3.5952, lon: 98.6722, province: "Sumatera Utara" },
  { name: "Makassar", lat: -5.1477, lon: 119.4327, province: "Sulawesi Selatan" },
];

function getCuacaSettings(db) {
  const stored = db.setting("bmkgCuacaScheduler") || {};
  return {
    enabled: stored.enabled ?? false,
    timezone: stored.timezone || TZ,
    schedules: Array.isArray(stored.schedules) && stored.schedules.length
      ? stored.schedules
      : [
          { key: "pagi", label: "Pagi", hour: 6, minute: 0 },
          { key: "siang", label: "Siang", hour: 12, minute: 0 },
          { key: "sore", label: "Sore", hour: 18, minute: 0 },
        ],
    targets: Array.isArray(stored.targets) ? stored.targets : [],
    locations: Array.isArray(stored.locations) && stored.locations.length
      ? stored.locations
      : DEFAULT_LOCATIONS,
    detailLevel: stored.detailLevel || "full",
  };
}

function saveCuacaSettings(db, settings) {
  db.setting("bmkgCuacaScheduler", settings);
  return settings;
}

function updateCuacaSettings(updater) {
  const db = getDatabase();
  const current = getCuacaSettings(db);
  const next = updater(current);
  return saveCuacaSettings(db, next);
}

function getCuacaStatus() {
  const db = getDatabase();
  return getCuacaSettings(db);
}

// ────────────────────────────────────────────────────────────────────────────
// GEOCODE
// ────────────────────────────────────────────────────────────────────────────

async function geocodeCity(name) {
  const url = GEOCODE_URL + "?name=" + encodeURIComponent(name) + "&count=1&language=id&format=json";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocode error: " + res.status);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("Kota tidak ditemukan: " + name);
  const r = data.results[0];
  return { name: r.name, lat: r.latitude, lon: r.longitude, province: r.admin1 || r.country || "" };
}

// ────────────────────────────────────────────────────────────────────────────
// FETCH CUACA RINCI
// ────────────────────────────────────────────────────────────────────────────

async function fetchDetailedWeather(location) {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    timezone: "Asia/Jakarta",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "pressure",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "uv_index",
      "visibility",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "wind_direction_10m_dominant",
    ].join(","),
    forecast_days: "3",
  });

  const res = await fetch(FORECAST_URL + "?" + params.toString());
  if (!res.ok) throw new Error("Weather API error: " + res.status);
  return res.json();
}

// ────────────────────────────────────────────────────────────────────────────
// FORMAT PESAN RINCI BMKG-STYLE
// ────────────────────────────────────────────────────────────────────────────

function formatDetailedWeather(data, location, label) {
  const c = data.current;
  const wmo = getWmo(c.weather_code);
  const windDir = windDirection(c.wind_direction_10m);
  const isDay = c.is_day === 1;

  // Current conditions
  let txt = "╭─「 ✦ CUACA RINCI — BMKG STYLE  │ \n ✦ 」";
  txt += "╰────  •  ────\n";
  txt += "Lokasi: *" + location.name + "*";
  if (location.province) txt += " (" + location.province + ")";
  txt += "\n";
  txt += "Jadwal: " + label + "\n";
  txt += "Update: " + new Date(c.time).toLocaleString("id-ID", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }) + " WIB\n\n";

  txt += "KONDISI SAAT INI\n";
  txt += "Cuaca: *" + wmo.desc + "*\n";
  txt += "Suhu: *" + c.temperature_2m + "°C*\n";
  txt += "Terasa: " + c.apparent_temperature + "°C\n";
  txt += "Lembap: " + c.relative_humidity_2m + "%\n";
  txt += "Tekanan: " + c.pressure + " hPa\n";
  txt += "Tekanan Permukaan: " + c.surface_pressure + " hPa\n";
  txt += "Awan: " + c.cloud_cover + "%\n";
  txt += "Angin: " + c.wind_speed_10m + " km/h (" + windDir + ")\n";
  txt += "Angin Kencang: " + c.wind_gusts_10m + " km/h\n";
  txt += "Hujan: " + (c.rain || 0) + " mm\n";
  txt += "Presipitasi: " + (c.precipitation || 0) + " mm\n";
  txt += "Periode: " + (isDay ? "Siang" : "Malam") + "\n\n";

  // Hourly forecast (next 6 hours)
  txt += "PRAKIRAAN 6 JAM KEDEPAN\n";
  const now = new Date(c.time);
  const hourlyTimes = data.hourly.time;
  let hourCount = 0;

  for (let i = 0; i < hourlyTimes.length && hourCount < 6; i++) {
    const hTime = new Date(hourlyTimes[i]);
    if (hTime <= now) continue;

    const hWmo = getWmo(data.hourly.weather_code[i]);
    const hWindDir = windDirection(data.hourly.wind_direction_10m[i]);

    txt += hTime.toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) + " WIB — ";
    txt += hWmo.desc + ", ";
    txt += data.hourly.temperature_2m[i] + "°C, ";
    txt += "L " + data.hourly.relative_humidity_2m[i] + "%, ";
    txt += "H " + data.hourly.precipitation_probability[i] + "%, ";
    txt += "A " + data.hourly.wind_speed_10m[i] + " km/h (" + hWindDir + ")\n";

    hourCount++;
  }

  txt += "\n";

  // Daily forecast (3 days)
  txt += "PRAKIRAAN 3 HARI\n";
  for (let i = 0; i < Math.min(3, data.daily.time.length); i++) {
    const dWmo = getWmo(data.daily.weather_code[i]);
    const dDate = new Date(data.daily.time[i]).toLocaleDateString("id-ID", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
    const dWindDir = windDirection(data.daily.wind_direction_10m_dominant[i]);

    txt += dDate + ": " + dWmo.desc + "\n";
    txt += "  Suhu: " + data.daily.temperature_2m_min[i] + "°C — " + data.daily.temperature_2m_max[i] + "°C\n";
    txt += "  Hujan: " + (data.daily.precipitation_sum[i] || 0) + " mm (prob " + (data.daily.precipitation_probability_max[i] || 0) + "%)\n";
    txt += "  Angin Max: " + data.daily.wind_speed_10m_max[i] + " km/h (" + dWindDir + ")\n";
    txt += "  Angin Kencang: " + data.daily.wind_gusts_10m_max[i] + " km/h\n";
    txt += "  UV Max: " + data.daily.uv_index_max[i] + "\n";
    txt += "  Terasa: " + data.daily.apparent_temperature_min[i] + "°C — " + data.daily.apparent_temperature_max[i] + "°C\n";
    if (data.daily.sunrise && data.daily.sunrise[i]) {
      const sr = new Date(data.daily.sunrise[i]).toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
      const ss = new Date(data.daily.sunset[i]).toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
      txt += "  Matahari: " + sr + " — " + ss + " WIB\n";
    }
    txt += "\n";
  }

  txt += "Data: Open-Meteo (BMKG-style format)\n";
  txt += "Koordinat: " + location.lat + ", " + location.lon;

  return txt;
}

// ────────────────────────────────────────────────────────────────────────────
// BROADCAST
// ────────────────────────────────────────────────────────────────────────────

async function sendCuacaUpdate(label) {
  if (!sock) return;
  const db = getDatabase();
  const settings = getCuacaSettings(db);

  if (!settings.enabled) return;
  if (!settings.targets || settings.targets.length === 0) return;
  if (!settings.locations || settings.locations.length === 0) return;

  try {
    logger.info("BMKG-CUACA", "Broadcast cuaca [" + label + "] dimulai...");

    for (const location of settings.locations) {
      try {
        const data = await fetchDetailedWeather(location);
        const txt = formatDetailedWeather(data, location, label);

        for (const target of settings.targets) {
          try {
            await sock.sendMessage(target, { text: txt });
            await new Promise((r) => setTimeout(r, 1500));
          } catch (err) {
            logger.warn("BMKG-CUACA", "Gagal kirim ke " + target + ": " + err.message);
          }
        }

        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        logger.warn("BMKG-CUACA", "Gagal fetch cuaca " + location.name + ": " + err.message);
      }
    }

    logger.info("BMKG-CUACA", "Broadcast [" + label + "] selesai");
  } catch (err) {
    logger.error("BMKG-CUACA", "Error broadcast: " + err.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULER
// ────────────────────────────────────────────────────────────────────────────

function stopCuacaJobs() {
  if (Array.isArray(cuacaJobs) && cuacaJobs.length) {
    for (const job of cuacaJobs) {
      try { job.stop(); } catch (err) { logger.warn("BMKG-CUACA", "Gagal stop CronJob: " + err.message); }
    }
    cuacaJobs = [];
  }
}

function startCuacaJobs(settings) {
  stopCuacaJobs();
  if (!settings.enabled || !settings.schedules.length) return;
  for (const schedule of settings.schedules) {
    const cron = "0 " + (schedule.minute ?? 0) + " " + schedule.hour + " * * *";
    const label = schedule.label || schedule.key || (schedule.hour + ":00");
    try {
      const job = new CronJob(cron, () => sendCuacaUpdate(label), null, true, settings.timezone || TZ);
      cuacaJobs.push(job);
      logger.info("BMKG-CUACA", "Jadwal [" + label + "] -> " + cron + " (" + (settings.timezone || TZ) + ")");
    } catch (err) {
      logger.error("BMKG-CUACA", "Gagal membuat CronJob [" + label + "]: " + err.message);
    }
  }
}

function initCuacaScheduler(sockInstance) {
  sock = sockInstance;
  const db = getDatabase();
  const settings = getCuacaSettings(db);
  logger.info("BMKG-CUACA", "Scheduler " + (settings.enabled ? "aktif" : "nonaktif") + " | " + settings.targets.length + " target | " + settings.locations.length + " lokasi | " + settings.schedules.length + " jadwal");
  startCuacaJobs(settings);
}

export {
  initCuacaScheduler,
  getCuacaStatus,
  updateCuacaSettings,
  startCuacaJobs,
  stopCuacaJobs,
  geocodeCity,
  fetchDetailedWeather,
  formatDetailedWeather,
  getWmo,
  windDirection,
  DEFAULT_LOCATIONS,
};
