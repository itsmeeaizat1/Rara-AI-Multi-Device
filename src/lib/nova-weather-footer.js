import config from "../../config.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedWeather = null;
let cacheExpiry = 0;

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
  96: "Badai petir + hujan es ringan",
  99: "Badai petir + hujan es lebat",
};

const WEATHER_EMOJI = {
  cerah: "☀️",
  awan: "⛅",
  mendung: "☁️",
  kabut: "🌫️",
  gerimis: "🌦️",
  hujan: "🌧️",
  badai: "⛈️",
  salju: "🌨️",
};

function symbolFor(code) {
  const desc = (WEATHER_CODES[Number(code)] || "").toLowerCase();
  if (desc.includes("badai")) return WEATHER_EMOJI.badai;
  if (desc.includes("hujan")) return WEATHER_EMOJI.hujan;
  if (desc.includes("gerimis")) return WEATHER_EMOJI.gerimis;
  if (desc.includes("kabut")) return WEATHER_EMOJI.kabut;
  if (desc.includes("salju")) return WEATHER_EMOJI.salju;
  if (desc.includes("mendung")) return WEATHER_EMOJI.mendung;
  if (desc.includes("awan")) return WEATHER_EMOJI.awan;
  return WEATHER_EMOJI.cerah;
}

function fmt(value, suffix = "") {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n * 10) / 10}${suffix}` : "-";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function getWeatherConfig() {
  const weatherConfig = config.weather || {};
  const provider = String(weatherConfig.provider || "open-meteo").toLowerCase();
  const apiKey = String(weatherConfig.apiKey || "").trim();
  const location = weatherConfig.location || config.weatherScheduler?.location || {};
  const timezone = String(weatherConfig.timezone || config.weatherScheduler?.timezone || "Asia/Jakarta");

  return {
    provider,
    apiKey,
    location: {
      name: String(location.name || "Lokasi").trim(),
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    },
    timezone,
  };
}

async function fetchOpenMeteo() {
  const { location, timezone } = getWeatherConfig();
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Koordinat lokasi cuaca belum diatur di config");
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,uv_index",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    forecast_days: "1",
    timezone,
  });

  return fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
}

async function fetchAccuWeather() {
  const { location, apiKey } = getWeatherConfig();
  if (!apiKey) throw new Error("AccuWeather API key belum diatur di config");

  const params = new URLSearchParams({
    apikey: apiKey,
    language: "id-id",
    details: "true",
  });

  const locationKey = String(config.weather?.locationKey || "").trim();
  if (locationKey) {
    const current = await fetchJson(
      `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?${params.toString()}`
    );
    return { current: current?.[0] || null };
  }

  const geo = await fetchJson(
    `https://dataservice.accuweather.com/locations/v1/cities/search?${new URLSearchParams({
      ...Object.fromEntries(params),
      q: location.name || "Jakarta",
    }).toString()}`
  );
  const city = geo?.[0];
  if (!city?.Key) throw new Error(`Kota "${location.name}" tidak ditemukan di AccuWeather`);

  const current = await fetchJson(
    `https://dataservice.accuweather.com/currentconditions/v1/${city.Key}?${params.toString()}`
  );
  return { current: current?.[0] || null };
}

function windDirectionText(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n)) return "-";
  const directions = ["Utara", "Timur Laut", "Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut"];
  const index = Math.round(n / 45) % 8;
  return `${directions[index]} (${Math.round(n)}°)`;
}

function uvText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  if (n <= 2) return `${fmt(n)} (Rendah)`;
  if (n <= 5) return `${fmt(n)} (Sedang)`;
  if (n <= 7) return `${fmt(n)} (Tinggi)`;
  if (n <= 10) return `${fmt(n)} (Sangat Tinggi)`;
  return `${fmt(n)} (Ekstrem)`;
}

function normalizeOpenMeteo(data) {
  const current = data?.current || {};
  return {
    description: WEATHER_CODES[Number(current.weather_code)] || "Kondisi tidak diketahui",
    weather_code: current.weather_code,
    temperature_2m: current.temperature_2m,
    apparent_temperature: current.apparent_temperature,
    relative_humidity_2m: current.relative_humidity_2m,
    wind_speed_10m: current.wind_speed_10m,
    wind_direction_10m: current.wind_direction_10m,
    precipitation: current.precipitation,
    cloud_cover: current.cloud_cover,
    uv_index: current.uv_index,
  };
}

function normalizeAccuWeather(data) {
  const current = data?.current || {};
  const weatherText = current.WeatherText || "Kondisi tidak diketahui";
  const metric = current.Temperature?.Metric || {};
  const humidity = current.RelativeHumidity ?? "-";
  const wind = current.Wind?.Speed?.Metric?.Value ?? "-";
  const windDir = current.Wind?.Direction?.Degrees ?? "-";
  const precipitation = current.PrecipitationSummary?.Precipitation?.Metric?.Value ?? 0;
  const uv = current.UVIndex ?? "-";

  return {
    description: weatherText,
    weather_code: null,
    temperature_2m: Number.isFinite(metric.Value) ? metric.Value : "-",
    apparent_temperature: Number.isFinite(metric.Value) ? metric.Value : "-",
    relative_humidity_2m: humidity,
    wind_speed_10m: wind,
    wind_direction_10m: windDir,
    precipitation: precipitation,
    cloud_cover: current.CloudCover ?? "-",
    uv_index: uv,
  };
}

async function fetchWeather() {
  const { provider } = getWeatherConfig();
  const normalizedProvider = String(provider || "open-meteo").toLowerCase();

  let data;
  if (normalizedProvider === "accuweather") {
    data = await fetchAccuWeather();
    return normalizeAccuWeather(data);
  }

  const raw = await fetchOpenMeteo();
  return normalizeOpenMeteo(raw);
}

function buildFooter(normalized) {
  const { location } = getWeatherConfig();
  const emoji = symbolFor(normalized.weather_code);

  const lines = [
    "",
    `${emoji} *Cuaca Realtime*`,
    `📍 ${location.name || "Lokasi"}`,
    `${emoji} ${normalized.description}`,
    "",
    `🌡️ Suhu: ${fmt(normalized.temperature_2m, "°C")}`,
    `🤒 Terasa: ${fmt(normalized.apparent_temperature, "°C")}`,
    `💧 Kelembapan: ${fmt(normalized.relative_humidity_2m, "%")}`,
    `💨 Angin: ${fmt(normalized.wind_speed_10m, " km/jam")}`,
    `🧭 Arah angin: ${windDirectionText(normalized.wind_direction_10m)}`,
    `☁️ Tutupan awan: ${fmt(normalized.cloud_cover, "%")}`,
    `☀️ UV index: ${uvText(normalized.uv_index)}`,
    `🌧️ Curah hujan: ${fmt(normalized.precipitation, " mm")}`,
  ];

  return lines.join("\n");
}

export async function getWeatherFooter(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedWeather && now < cacheExpiry) {
    return buildFooter(cachedWeather);
  }

  try {
    const data = await fetchWeather();
    cachedWeather = data;
    cacheExpiry = now + CACHE_TTL_MS;
    return buildFooter(data);
  } catch {
    return null;
  }
}

export function clearWeatherCache() {
  cachedWeather = null;
  cacheExpiry = 0;
}
