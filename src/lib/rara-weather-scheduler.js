// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { CronJob } from "cron";
// moment-timezone removed — using native Intl.DateTimeFormat instead
import config from "../../config.js";
import { getDatabase } from "./rara-database.js";
import { logger } from "./rara-logger.js";

const DEFAULT_TIMEOUT_MS = 15_000;
let sock = null;
let refreshJob = null;
const weatherJobs = new Map();

const WEATHER_CODES = {
  0: "Cerah",
  1: "Cerah berawan",
  2: "Berawan sebagian",
  3: "Mendung",
  45: "Berkabut",
  48: "Berkabut tebal",
  51: "Gerimis ringan",
  53: "Gerimis",
  55: "Gerimis lebat",
  56: "Gerimis beku ringan",
  57: "Gerimis beku lebat",
  61: "Hujan ringan",
  63: "Hujan sedang",
  65: "Hujan lebat",
  66: "Hujan beku ringan",
  67: "Hujan beku lebat",
  71: "Salju ringan",
  73: "Salju sedang",
  75: "Salju lebat",
  77: "Butiran salju",
  80: "Hujan lokal ringan",
  81: "Hujan lokal sedang",
  82: "Hujan lokal lebat",
  85: "Salju lokal ringan",
  86: "Salju lokal lebat",
  95: "Badai petir",
  96: "Badai petir dengan hujan es ringan",
  99: "Badai petir dengan hujan es lebat",
};

const WEATHER_SYMBOLS = {
  cerah: "☀️",
  awan: "⛅",
  mendung: "☁️",
  kabut: "🌫️",
  gerimis: "🌦️",
  hujan: "🌧️",
  badai: "⛈️",
  salju: "🌨️",
};

function getWeatherSettings(db) {
  const base = config.weatherScheduler || {};
  const stored = db.setting("weatherScheduler") || {};
  const baseLocation = base.location || {};
  const storedLocation = stored.location || {};
  const defaultSchedules = Array.isArray(base.schedules) ? base.schedules : [];
  const schedules = Array.isArray(stored.schedules) && stored.schedules.length
    ? stored.schedules
    : defaultSchedules;

  return {
    enabled: stored.enabled ?? base.enabled ?? false,
    timezone: stored.timezone || base.timezone || "Asia/Jakarta",
    location: {
      name: storedLocation.name || baseLocation.name || "Jakarta",
      latitude: Number(storedLocation.latitude ?? baseLocation.latitude),
      longitude: Number(storedLocation.longitude ?? baseLocation.longitude),
    },
    schedules,
    targets: Array.isArray(stored.targets) ? stored.targets : [],
    lastSent: stored.lastSent && typeof stored.lastSent === "object"
      ? stored.lastSent
      : {},
  };
}

function saveWeatherSettings(db, settings) {
  db.setting("weatherScheduler", {
    enabled: Boolean(settings.enabled),
    timezone: settings.timezone,
    location: settings.location,
    schedules: settings.schedules,
    targets: settings.targets,
    lastSent: settings.lastSent,
  });
}

function normalizeTarget(jid) {
  if (!jid) return "";
  return String(jid).trim();
}

function getToday(timezone) {
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone });
    return formatter.format(new Date());
}

function formatNumber(value, suffix = "") {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 10) / 10}${suffix}` : "-";
}

function symbolForWeather(description) {
  const text = description.toLowerCase();
  if (text.includes("badai")) return WEATHER_SYMBOLS.badai;
  if (text.includes("hujan")) return WEATHER_SYMBOLS.hujan;
  if (text.includes("gerimis")) return WEATHER_SYMBOLS.gerimis;
  if (text.includes("kabut")) return WEATHER_SYMBOLS.kabut;
  if (text.includes("salju")) return WEATHER_SYMBOLS.salju;
  if (text.includes("mendung")) return WEATHER_SYMBOLS.mendung;
  if (text.includes("awan")) return WEATHER_SYMBOLS.awan;
  return WEATHER_SYMBOLS.cerah;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// WMO weather code map (wttr.in uses different codes, we map them)
const WTTR_WEATHER_CODES = {
  113: "Cerah",
  116: "Cerah berawan",
  119: "Berawan",
  122: "Mendung",
  143: "Berkabut",
  176: "Gerimis ringan",
  179: "Salju ringan",
  182: "Hujan dan salju",
  185: "Hujan beku ringan",
  200: "Badai petir",
  227: "Salju sedang",
  230: "Salju lebat",
  248: "Berkabut",
  260: "Berkabut tebal",
  263: "Gerimis ringan",
  266: "Gerimis",
  281: "Hujan beku ringan",
  284: "Hujan beku lebat",
  293: "Hujan ringan",
  296: "Hujan ringan",
  299: "Hujan sedang",
  302: "Hujan sedang",
  305: "Hujan lebat",
  308: "Hujan sangat lebat",
  311: "Hujan beku ringan",
  314: "Hujan beku lebat",
  317: "Hujan dan salju",
  320: "Salju ringan",
  323: "Salju ringan",
  326: "Salju sedang",
  329: "Salju lebat",
  332: "Salju sangat lebat",
  335: "Salju lebat",
  338: "Salju sangat lebat",
  350: "Hujan es ringan",
  353: "Hujan lokal ringan",
  356: "Hujan lokal sedang",
  359: "Hujan lokal lebat",
  362: "Hujan es ringan",
  365: "Hujan es lebat",
  368: "Salju lokal ringan",
  371: "Salju lokal lebat",
  374: "Hujan beku lokal",
  377: "Hujan beku lokal lebat",
  386: "Badai petir dengan hujan ringan",
  389: "Badai petir dengan hujan lebat",
  392: "Badai petir dengan salju ringan",
  395: "Badai petir dengan salju lebat",
};

async function fetchWeather(location, timezone) {
  const cityName = (location.name || "Jakarta").split(",")[0].trim();
  const url = `https://wttr.in/${encodeURIComponent(cityName)}?format=j1`;

  const data = await fetchJson(url);

  if (!data?.current_condition?.[0] || !data?.weather?.[0]) {
    throw new Error("Respons cuaca tidak lengkap");
  }

  // Transform wttr.in data to match our format
  const current = data.current_condition[0];
  const today = data.weather[0];
  const astronomy = today.astronomy?.[0] || {};
  const code = Number(current.weatherCode);
  const description = WTTR_WEATHER_CODES[code] || current.weatherDesc?.[0]?.value || "Tidak diketahui";

  return {
    current: {
      temperature_2m: Number(current.temp_C),
      apparent_temperature: Number(current.FeelsLikeC),
      relative_humidity_2m: Number(current.humidity),
      precipitation: Number(current.precipMM),
      weather_code: code,
      wind_speed_10m: Number(current.windspeedKmph),
    },
    current_units: {
      temperature_2m: "°C",
    },
    daily: {
      weather_code: [code],
      temperature_2m_max: [Number(today.maxtempC)],
      temperature_2m_min: [Number(today.mintempC)],
      precipitation_probability_max: [Number(today.hourly?.[4]?.chanceofrain || 0)],
      sunrise: [astronomy.sunrise ? parseWttrTime(astronomy.sunrise) : null],
      sunset: [astronomy.sunset ? parseWttrTime(astronomy.sunset) : null],
    },
    _description: description,
  };
}

function parseWttrTime(timeStr) {
  // wttr.in returns "06:01 AM" -> convert to ISO
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (match[3] === "PM" && hours !== 12) hours += 12;
  if (match[3] === "AM" && hours === 12) hours = 0;
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  return today.toISOString();
}

function formatWeatherMessage(data, settings, schedule) {
  const current = data.current;
  const currentUnits = data.current_units || {};
  const daily = data.daily;
  const code = Number(current.weather_code);
  const description = data._description || WEATHER_CODES[code] || "Kondisi tidak diketahui";
  const dailyDescription =
    WEATHER_CODES[Number(daily.weather_code?.[0])] || description;
  const locationName = settings.location.name || "Lokasi pilihan";
  const unit = currentUnits.temperature_2m || "°C";
  const currentTemperature = formatNumber(
    current.temperature_2m,
    unit === "°C" ? "°C" : ` ${unit}`,
  );
  const feelsLike = formatNumber(
    current.apparent_temperature,
    unit === "°C" ? "°C" : ` ${unit}`,
  );
  const precipitation = formatNumber(current.precipitation, " mm");
  const rainProbability = formatNumber(
    daily.precipitation_probability_max?.[0],
    "%",
  );
  const now = new Intl.DateTimeFormat('id-ID', {
        timeZone: settings.timezone,
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date());
  const sunrise = daily.sunrise?.[0]
    ? new Intl.DateTimeFormat('id-ID', { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(daily.sunrise[0]))
    : "-";
  const sunset = daily.sunset?.[0]
    ? new Intl.DateTimeFormat('id-ID', { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(daily.sunset[0]))
    : "-";

  return [
    `*Cuaca ${schedule.label}*`,
    `${locationName} - ${now} WIB`,
    "",
    `${symbolForWeather(description)} ${description}`,
    `🌡️ Suhu: ${currentTemperature}`,
    `🤒 Terasa: ${feelsLike}`,
    `💧 Kelembapan: ${formatNumber(current.relative_humidity_2m, "%")}`,
    `💨 Angin: ${formatNumber(current.wind_speed_10m, " km/jam")}`,
    `☔ Peluang hujan: ${rainProbability}`,
    `🌧️ Curah hujan: ${precipitation}`,
    `🌡️ Min/Max: ${formatNumber(daily.temperature_2m_min?.[0], "°C")} / ${formatNumber(daily.temperature_2m_max?.[0], "°C")}`,
    `🌅 Terbit: ${sunrise} WIB`,
    `🌇 Terbenam: ${sunset} WIB`,
    "",
    "_wttr.in · realtime_",
  ].join("\n");
}

async function sendWeatherUpdate(schedule) {
  if (!sock) return;

  const db = getDatabase();
  const settings = getWeatherSettings(db);
  if (!settings.enabled || settings.targets.length === 0) return;

  const date = getToday(settings.timezone);
  const sentKey = `${date}_${schedule.key}`;
  if (settings.lastSent[sentKey]) return;

  try {
    const forecast = await fetchWeather(settings.location, settings.timezone);
    const message = formatWeatherMessage(forecast, settings, schedule);
    let sentCount = 0;

    for (const target of settings.targets) {
      try {
        await sock.sendMessage(target, { text: message });
        sentCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(
          "WeatherScheduler",
          `Gagal mengirim ke ${target}: ${error.message}`,
        );
      }
    }

    if (sentCount > 0) {
      settings.lastSent[sentKey] = new Date().toISOString();
      const oldKeys = Object.keys(settings.lastSent).filter(
        (key) => key.slice(0, 10) < date,
      );
      for (const key of oldKeys) delete settings.lastSent[key];
      saveWeatherSettings(db, settings);
      logger.success(
        "WeatherScheduler",
        `${schedule.label}: laporan cuaca terkirim ke ${sentCount} target`,
      );
    }
  } catch (error) {
    logger.error("WeatherScheduler", `Gagal mengambil cuaca: ${error.message}`);
  }
}

function clearWeatherJobs() {
  for (const job of weatherJobs.values()) job.stop();
  weatherJobs.clear();
}

function buildWeatherJobs() {
  clearWeatherJobs();
  if (!sock) return;

  const db = getDatabase();
  const settings = getWeatherSettings(db);
  if (!settings.enabled || settings.targets.length === 0) {
    logger.info(
      "WeatherScheduler",
      "Menunggu konfigurasi target grup dan aktivasi cuaca",
    );
    return;
  }

  for (const schedule of settings.schedules) {
    const hour = Number(schedule.hour);
    const minute = Number(schedule.minute || 0);
    if (
      !schedule.key ||
      !schedule.label ||
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59
    ) {
      continue;
    }

    const job = new CronJob(
      `${minute} ${hour} * * *`,
      () => sendWeatherUpdate(schedule),
      null,
      true,
      settings.timezone,
    );
    weatherJobs.set(schedule.key, job);
  }

  logger.info(
    "WeatherScheduler",
    `${weatherJobs.size} jadwal cuaca aktif (${settings.timezone})`,
  );
}

function initWeatherScheduler(socketInstance) {
  sock = socketInstance;
  if (refreshJob) refreshJob.stop();
  refreshJob = new CronJob(
    "1 0 * * *",
    () => buildWeatherJobs(),
    null,
    true,
    config.weatherScheduler?.timezone || "Asia/Jakarta",
  );
  buildWeatherJobs();
}

function refreshWeatherScheduler() {
  buildWeatherJobs();
}

function stopWeatherScheduler() {
  clearWeatherJobs();
  if (refreshJob) {
    refreshJob.stop();
    refreshJob = null;
  }
  sock = null;
}

async function resolveWeatherLocation(query) {
  const name = String(query || "").trim();
  if (!name) throw new Error("Nama kota kosong");

  // wttr.in doesn't need geocoding, just use the city name directly
  // Test if city exists by doing a quick fetch
  const url = `https://wttr.in/${encodeURIComponent(name)}?format=j1`;
  try {
    const data = await fetchJson(url);
    const area = data?.nearest_area?.[0];
    const areaName = area?.areaName?.[0]?.value || name;
    const region = area?.region?.[0]?.value || "";
    const country = area?.country?.[0]?.value || "";

    return {
      name: [areaName, region, country].filter(Boolean).join(", "),
      latitude: area?.latitude ? Number(area.latitude) : 0,
      longitude: area?.longitude ? Number(area.longitude) : 0,
    };
  } catch (e) {
    throw new Error(`Kota "${name}" tidak ditemukan`);
  }
}

function getWeatherStatus() {
  const db = getDatabase();
  return getWeatherSettings(db);
}

function updateWeatherSettings(updater) {
  const db = getDatabase();
  const settings = getWeatherSettings(db);
  const updated = updater(settings) || settings;
  saveWeatherSettings(db, updated);
  refreshWeatherScheduler();
  return updated;
}

export {
  initWeatherScheduler,
  stopWeatherScheduler,
  refreshWeatherScheduler,
  resolveWeatherLocation,
  getWeatherStatus,
  updateWeatherSettings,
  fetchWeather,
  formatWeatherMessage,
};