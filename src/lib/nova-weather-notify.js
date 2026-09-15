// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-weather-notify.js — Engine notifikasi cuaca ala script standalone owner
// UPGRADE MULTI-PROVIDER 8 Sep 2026: Open-Meteo + BMKG + MET Norway +
// WeatherAPI (butuh key, auto-skip kalau gak ada) + mode AGGREGATE
// (rata-rata semua sumber + kondisi dominan + konfidensi)
// (8 Sep 2026, request: "upgrade fitur cuaca dan auto cuaca otomatis pakai kode ini")
//
// Provider:
//   - OPENMETEO : global, gratis tanpa key (current_weather + hourly + daily)
//   - BMKG      : api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<kode> (khusus Indonesia)
//                 URL VERIFIED LIVE 8 Sep 2026 — parsing script owner salah
//                 (data[0].t padahal nested data[0].cuaca[hari][jam]) — dibenerin di sini.
//
// Dipakai scheduler notifikasi cuaca (interval 2 jam ala script + dedup kondisi)
// dan command .autoweatherrealtime test/notification on.

import config from "../../config.js";

const DEFAULT_TIMEOUT_MS = 10_000;

// Kondisi cuaca WMO (Open-Meteo weather code) — bahasa Indonesia ala script
export const WEATHER_CONDITIONS = {
  0: "Cerah",
  1: "Sebagian Cerah",
  2: "Berawan Sebagian",
  3: "Mendung",
  45: "Kabut",
  48: "Kabut Berembun",
  51: "Gerimis Ringan",
  53: "Gerimis Sedang",
  55: "Gerimis Lebat",
  56: "Gerimis Beku Ringan",
  57: "Gerimis Beku Lebat",
  61: "Hujan Ringan",
  63: "Hujan Sedang",
  65: "Hujan Lebat",
  66: "Hujan Beku Ringan",
  67: "Hujan Beku Lebat",
  71: "Salju Ringan",
  73: "Salju Sedang",
  75: "Salju Lebat",
  77: "Butiran Salju",
  80: "Hujan Lokal Ringan",
  81: "Hujan Lokal Sedang",
  82: "Hujan Lokal Lebat",
  85: "Salju Lokal Ringan",
  86: "Salju Lokal Lebat",
  95: "Badai Petir",
  96: "Badai Petir + Hujan Es",
  99: "Badai Petir + Hujan Es Lebat",
};

export function getWeatherCondition(code) {
  return WEATHER_CONDITIONS[Number(code)] || "Tidak Diketahui";
}

// Emoji sesuai kondisi (dipakai header pesan)
export function conditionEmoji(condition) {
  const c = String(condition || "").toLowerCase();
  if (c.includes("badai")) return "⛈️";
  if (c.includes("hujan")) return "🌧️";
  if (c.includes("gerimis")) return "🌦️";
  if (c.includes("salju")) return "🌨️";
  if (c.includes("kabut")) return "🌫️";
  if (c.includes("mendung") || c.includes("awan")) return "☁️";
  return "🌤️";
}

// Arah angin derajat → mata angin Indonesia
export function windDirectionText(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n)) return "-";
  const dirs = ["Utara", "Timur Laut", "Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut"];
  return dirs[Math.round(n / 45) % 8];
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function fmtNum(v, suffix = "") {
  const n = Number(v);
  return Number.isFinite(n) ? `${Math.round(n * 10) / 10}${suffix}` : "N/A";
}

// ─────────────────────────────────────────────────────────────
// OPEN-METEO (global, gratis, tanpa key)
// ─────────────────────────────────────────────────────────────
export async function fetchOpenMeteoNow(lat, lon, timezone = "Asia/Jakarta") {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current_weather: "true",
    timezone,
    hourly: "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
    forecast_days: "1",
  });
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  const current = data.current_weather || {};
  const hourly = data.hourly || {};
  const daily = data.daily || {};

  // Cari indeks jam terdekat dengan sekarang — script owner pakai
  // `getHours() % 24` (salah begitu lintas zona / response mulai bukan 00:00).
  // Cara benar: cari di hourly.time yang paling dekat dengan waktu sekarang.
  let hourIndex = -1;
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  if (times.length) {
    const nowMs = Date.now();
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const tMs = new Date(times[i]).getTime();
      const diff = Math.abs(tMs - nowMs);
      if (diff < bestDiff) { bestDiff = diff; hourIndex = i; }
    }
  }

  return {
    provider: "Open-Meteo",
    temperature: current.temperature ?? "N/A",
    humidity: hourIndex >= 0 ? (hourly.relative_humidity_2m?.[hourIndex] ?? "N/A") : "N/A",
    condition: getWeatherCondition(current.weathercode ?? 0),
    weather_code: current.weathercode ?? 0,
    wind_speed: current.windspeed ?? "N/A",
    wind_direction: current.winddirection ?? "N/A",
    wind_direction_text: windDirectionText(current.winddirection),
    precipitation: hourIndex >= 0 ? (hourly.precipitation?.[hourIndex] ?? 0) : 0,
    max_temp: daily.temperature_2m_max?.[0] ?? "N/A",
    min_temp: daily.temperature_2m_min?.[0] ?? "N/A",
    time: current.time || new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// BMKG (khusus Indonesia — kode wilayah adm4)
// Endpoint: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<kode>
// VERIFIED LIVE 8 Sep 2026. Struktur: { lokasi, data:[{ lokasi, cuaca:[[jam...],[jam...],[jam...]] }] }
// cuaca = 3 hari, tiap hari = array entry per-jam.
// ─────────────────────────────────────────────────────────────
export async function fetchBmkgNow(adm4) {
  const code = String(adm4 || "").trim();
  if (!code) throw new Error("Kode wilayah BMKG (adm4) belum diset");
  const data = await fetchJson(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(code)}`);
  if (!data || !Array.isArray(data.data) || !data.data.length) throw new Error("BMKG tidak mengembalikan data");

  // PILIH ENTRY TERDEKAT DENGAN SEKARANG dari semua hari
  const nowMs = Date.now();
  let best = null;
  let bestDiff = Infinity;
  for (const item of data.data) {
    for (const day of (Array.isArray(item.cuaca) ? item.cuaca : [])) {
      for (const entry of (Array.isArray(day) ? day : [])) {
        const tMs = new Date(entry.utc_datetime || entry.datetime || entry.local_datetime).getTime();
        if (!Number.isFinite(tMs)) continue;
        const diff = Math.abs(tMs - nowMs);
        if (diff < bestDiff) { bestDiff = diff; best = entry; }
      }
    }
  }
  if (!best) throw new Error("Tidak ada entry cuaca BMKG yang valid");

  return {
    provider: "BMKG",
    temperature: best.t ?? "N/A",
    humidity: best.hu ?? "N/A",
    condition: best.weather_desc || "N/A",
    condition_en: best.weather_desc_en || "N/A",
    wind_speed: best.ws ?? "N/A",
    wind_direction: windDirectionText(best.wd_deg),
    wind_direction_code: best.wd || "",
    cloud_cover: best.tcc ?? "N/A",
    visibility: best.vs_text || "N/A",
    time: best.local_datetime || new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// MET NORWAY (global, gratis, no key — api.met.no)
// Wajib User-Agent (termasuk kontak) kalau tidak 403.
// wind_speed di API = m/s → konversi km/jam (script salah satuan).
// ─────────────────────────────────────────────────────────────
const MET_SYMBOLS = {
  clearsky: "Cerah",
  fair: "Sebagian Cerah",
  partlycloudy: "Berawan Sebagian",
  cloudy: "Mendung",
  fog: "Kabut",
  lightrain: "Hujan Ringan",
  lightrainshowers: "Hujan Lokal Ringan",
  lightrainandthunder: "Hujan Ringan + Petir",
  rain: "Hujan Sedang",
  rainshowers: "Hujan Lokal Sedang",
  rainandthunder: "Hujan Lebat + Petir",
  heavyrain: "Hujan Lebat",
  heavyrainshowers: "Hujan Lokal Lebat",
  heavyrainandthunder: "Hujan Lebat + Petir",
  lightsnow: "Salju Ringan",
  lightsnowshowers: "Salju Lokal Ringan",
  snow: "Salju Sedang",
  snowshowers: "Salju Lokal",
  heavysnow: "Salju Lebat",
  lightsleet: "Campuran Salju Ringan",
  sleet: "Campuran Salju",
  sleetshowers: "Campuran Salju Lokal",
  lightsleetandthunder: "Campuran Salju + Petir",
  sleetandthunder: "Campuran Salju Lebat + Petir",
  thunder: "Badai Petir",
  thunderstorm: "Badai Petir",
  snowandthunder: "Salju + Petir",
  heavysnowandthunder: "Salju Lebat + Petir",
};

function metCondition(symbolCode) {
  const base = String(symbolCode || "").replace(/_(day|night|polartwilight)$/, "");
  return MET_SYMBOLS[base] || "Tidak Diketahui";
}

export async function fetchMetNorway(lat, lon) {
  const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "NovaAIWhatsappBot/1.0 github.com/itsmeeaizat/Nova-AI-Whatsapp-Bot-Multi-Device" },
  });
  if (!res.ok) throw new Error(`MET Norway HTTP ${res.status}`);
  const data = await res.json();
  const series = data?.properties?.timeseries || [];
  if (!series.length) throw new Error("MET Norway tidak mengembalikan timeseries");

  // Pilih entry terdekat dengan sekarang (timeseries[0] script bisa stale)
  const nowMs = Date.now();
  let best = null, bestDiff = Infinity;
  for (const e of series) {
    const tMs = new Date(e.time).getTime();
    const diff = Math.abs(tMs - nowMs);
    if (diff < bestDiff) { bestDiff = diff; best = e; }
  }
  const det = best?.data?.instant?.details || {};
  const next = best?.data?.next_6_hours || best?.data?.next_1_hours || {};
  const symbol = next?.summary?.symbol_code || "";

  return {
    provider: "MET Norway",
    temperature: det.air_temperature ?? "N/A",
    humidity: det.relative_humidity ?? "N/A",
    condition: symbol ? metCondition(symbol) : "Tidak Diketahui",
    wind_speed: Number.isFinite(Number(det.wind_speed)) ? Number(det.wind_speed) * 3.6 : "N/A", // m/s → km/jam
    wind_direction_text: windDirectionText(det.wind_from_direction),
    cloud_cover: det.cloud_area_fraction ?? "N/A",
    time: best.time || new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// WEATHERAPI (internasional, 1jt call/bulan gratis — butuh key)
// Key dari config.weather.weatherApiKey / env WEATHERAPI_KEY.
// Gak ada key → throw (caller skip ala script: "SKIP - tidak ada API key").
// ─────────────────────────────────────────────────────────────
export function getWeatherApiKey() {
  return String(config?.weather?.weatherApiKey || process.env.WEATHERAPI_KEY || "").trim();
}

export async function fetchWeatherApiNow(lat, lon) {
  const key = getWeatherApiKey();
  if (!key) throw new Error("WeatherAPI butuh key (daftar gratis di weatherapi.com, set config.weather.weatherApiKey)");
  const res = await fetch(
    `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${lat},${lon}&days=1&aqi=no`,
    { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS), headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`WeatherAPI HTTP ${res.status}`);
  const data = await res.json();
  const current = data.current || {};
  const day = data.forecast?.forecastday?.[0]?.day || {};
  return {
    provider: "WeatherAPI",
    temperature: current.temp_c ?? "N/A",
    humidity: current.humidity ?? "N/A",
    condition: current.condition?.text || "N/A",
    wind_speed: current.wind_kph ?? "N/A",
    wind_direction_text: current.wind_dir || "-",
    max_temp: day.maxtemp_c ?? "N/A",
    min_temp: day.mintemp_c ?? "N/A",
    time: current.last_updated || new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// AGGREGATOR — gabungan semua provider ala script MODE=AGGREGATE:
// rata-rata suhu/kelembapan/angin + kondisi dominan + konfidensi.
// (FIX bug script: avgHumidity tadinya dihitung dari array TEMPS.)
// ─────────────────────────────────────────────────────────────
function avgOf(values) {
  const nums = values.map(Number).filter((v) => Number.isFinite(v));
  if (!nums.length) return "N/A";
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export async function aggregateWeather(settings) {
  const loc = settings.location || {};
  const lat = Number(loc.latitude);
  const lon = Number(loc.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  // Provider kandidat: O-M + MET Norway (butuh koordinat), BMKG (butuh adm4),
  // WeatherAPI (butuh koordinat + key). Total maksimal 4.
  const jobs = [];
  const totalPossible = 4;
  if (hasCoords) {
    jobs.push({ name: "Open-Meteo", p: fetchOpenMeteoNow(lat, lon) });
    jobs.push({ name: "MET Norway", p: fetchMetNorway(lat, lon) });
    if (getWeatherApiKey()) jobs.push({ name: "WeatherAPI", p: fetchWeatherApiNow(lat, lon) });
  }
  if (settings.adm4) jobs.push({ name: "BMKG", p: fetchBmkgNow(settings.adm4) });

  const settled = await Promise.allSettled(jobs.map((j) => j.p));
  const results = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled" && s.value) results.push(s.value);
    else if (s.status === "rejected") console.error(`[weather-aggregate] ${jobs[i].name}:`, s.reason?.message || s.reason);
  });

  if (!results.length) throw new Error("Semua provider cuaca gagal / belum dikonfigurasi");

  // Rata-rata angka + kondisi dominan (vote)
  const temperature = avgOf(results.map((r) => r.temperature));
  const humidity = avgOf(results.map((r) => r.humidity));
  const wind_speed = avgOf(results.map((r) => r.wind_speed));
  const votes = {};
  for (const r of results) {
    const cond = r.condition;
    if (cond && cond !== "N/A" && cond !== "Tidak Diketahui") votes[cond] = (votes[cond] || 0) + 1;
  }
  let condition = "N/A", maxVotes = 0;
  for (const [cond, n] of Object.entries(votes)) {
    if (n > maxVotes) { maxVotes = n; condition = cond; }
  }
  if (condition === "N/A" && results[0]) condition = results[0].condition;

  // Prakiraan max/min: preferensi Open-Meteo (daily terverifikasi), lalu WeatherAPI
  const om = results.find((r) => r.provider === "Open-Meteo");
  const wa = results.find((r) => r.provider === "WeatherAPI");
  const srcMax = om || wa || null;

  return {
    provider: "AGGREGATOR",
    sources: results.map((r) => r.provider).join(", "),
    temperature,
    humidity,
    wind_speed,
    condition,
    max_temp: srcMax?.max_temp ?? "N/A",
    min_temp: srcMax?.min_temp ?? "N/A",
    time: new Date().toISOString(),
    confidence: `${Math.round((results.length / totalPossible) * 100)}%`,
    activeSources: results.length,
    totalPossible,
    details: results,
  };
}

// ─────────────────────────────────────────────────────────────
// FETCH SESUAI SETTING (openmeteo | bmkg | metno | weatherapi | aggregate)
// ─────────────────────────────────────────────────────────────
export async function fetchWeatherForSettings(settings) {
  const provider = String(settings?.provider || "openmeteo").toLowerCase();
  const loc = settings.location || {};
  const lat = Number(loc.latitude);
  const lon = Number(loc.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  if (provider === "aggregate" || provider === "multi") {
    return aggregateWeather(settings);
  }
  if (provider === "bmkg") {
    return fetchBmkgNow(settings.adm4);
  }
  if (provider === "metno" || provider === "met" || provider === "norway") {
    if (!hasCoords) throw new Error("Koordinat lokasi cuaca belum diatur (.autoweatherrealtime lokasi <kota>)");
    return fetchMetNorway(lat, lon);
  }
  if (provider === "weatherapi" || provider === "wa") {
    if (!hasCoords) throw new Error("Koordinat lokasi cuaca belum diatur (.autoweatherrealtime lokasi <kota>)");
    return fetchWeatherApiNow(lat, lon);
  }
  if (!hasCoords) throw new Error("Koordinat lokasi cuaca belum diatur (.autoweatherrealtime lokasi <kota>)");
  return fetchOpenMeteoNow(lat, lon);
}

// ─────────────────────────────────────────────────────────────
// FORMAT PESAN — persis ala script standalone owner
// ─────────────────────────────────────────────────────────────
export function formatWeatherUpdate(data, locationName, intervalHours = 2, opts = {}) {
  if (!data) return "⚠️ Data cuaca tidak tersedia saat ini.";

  const emoji = conditionEmoji(data.condition);
  const name = locationName || "Lokasi";
  let msg = `${emoji} *UPDATE CUACA - ${name}*\n`;
  if (data.provider === "AGGREGATOR") {
    msg += `📡 *Mode: AGGREGATE | Sumber: ${data.sources}*\n`;
  } else {
    msg += `📡 *Sumber: ${data.provider}*\n`;
  }
  msg += `🕐 *Waktu: ${data.time || new Date().toLocaleString("id-ID")}*\n\n`;

  if (data.provider === "AGGREGATOR") {
    // Gabungan multi-provider: rata-rata + kondisi dominan + konfidensi
    msg += `🌡️ *Suhu: ${fmtNum(data.temperature, "°C")}*\n`;
    if (data.humidity !== "N/A") msg += `💧 Kelembaban: ${data.humidity}%\n`;
    msg += `☁️ Kondisi: ${data.condition}\n`;
    if (data.wind_speed !== "N/A") msg += `🌬️ Angin: ${fmtNum(data.wind_speed, " km/jam")}\n`;
    if (data.max_temp && data.max_temp !== "N/A") {
      msg += `\n📊 *Prakiraan Hari Ini:*\n`;
      msg += `   🔥 Maks: ${fmtNum(data.max_temp, "°C")}\n`;
      msg += `   ❄️ Min: ${fmtNum(data.min_temp, "°C")}\n`;
    }
    msg += `\n📊 *Konfidensi: ${data.confidence}* (${data.activeSources}/${data.totalPossible || data.activeSources} sumber aktif)\n`;
  } else if (data.provider === "MET Norway") {
    msg += `🌡️ *Suhu: ${fmtNum(data.temperature, "°C")}*\n`;
    msg += `💧 Kelembaban: ${data.humidity}%\n`;
    msg += `☁️ Kondisi: ${data.condition}\n`;
    msg += `🌬️ Angin: ${fmtNum(data.wind_speed, " km/jam")} (${data.wind_direction_text})\n`;
    msg += `☁️ Tutupan Awan: ${data.cloud_cover}%\n`;
  } else if (data.provider === "WeatherAPI") {
    msg += `🌡️ *Suhu: ${fmtNum(data.temperature, "°C")}*\n`;
    msg += `💧 Kelembaban: ${data.humidity}%\n`;
    msg += `☁️ Kondisi: ${data.condition}\n`;
    msg += `🌬️ Angin: ${fmtNum(data.wind_speed, " km/jam")} (${data.wind_direction_text})\n`;
    if (data.max_temp && data.max_temp !== "N/A") {
      msg += `\n📊 *Prakiraan Hari Ini:*\n`;
      msg += `   🔥 Maks: ${fmtNum(data.max_temp, "°C")}\n`;
      msg += `   ❄️ Min: ${fmtNum(data.min_temp, "°C")}\n`;
    }
  } else if (data.provider === "BMKG") {
    msg += `🌡️ *Suhu: ${fmtNum(data.temperature, "°C")}*\n`;
    msg += `💧 Kelembaban: ${data.humidity}%\n`;
    msg += `☁️ Kondisi: ${data.condition}\n`;
    msg += `🌬️ Kecepatan Angin: ${fmtNum(data.wind_speed, " km/jam")}\n`;
    msg += `🧭 Arah Angin: ${data.wind_direction}${data.wind_direction_code ? ` (${data.wind_direction_code})` : ""}\n`;
    msg += `☁️ Tutupan Awan: ${data.cloud_cover}%\n`;
    msg += `👁️ Jarak Pandang: ${data.visibility}\n`;
  } else {
    msg += `🌡️ *Suhu: ${fmtNum(data.temperature, "°C")}*\n`;
    msg += `💧 Kelembaban: ${data.humidity}%\n`;
    msg += `☁️ Kondisi: ${data.condition}\n`;
    msg += `🌬️ Angin: ${fmtNum(data.wind_speed, " km/jam")}\n`;
    msg += `🧭 Arah Angin: ${data.wind_direction}° (${data.wind_direction_text})\n`;
    msg += `🌧️ Curah Hujan: ${data.precipitation} mm\n\n`;
    msg += `📊 *Prakiraan Hari Ini:*\n`;
    msg += `   🔥 Maks: ${fmtNum(data.max_temp, "°C")}\n`;
    msg += `   ❄️ Min: ${fmtNum(data.min_temp, "°C")}\n`;
  }

  // Mode otomatis: footer beda — kirim pas cuaca berubah, bukan tiap N jam
  if (opts.autoMinutes) {
    msg += `\n⚡ Mode Otomatis — cek tiap ${opts.autoMinutes} menit, notifikasi terkirim saat cuaca berubah`;
    return msg;
  }
  const h = Number(intervalHours) || 2;
  msg += `\n📌 Update otomatis setiap ${h} jam\n`;
  msg += `🔄 Next update: ${new Date(Date.now() + h * 3600000).toLocaleTimeString("id-ID")}`;
  return msg;
}

// Pesan aktivasi ala script (SISTEM NOTIFIKASI CUACA AKTIF)
export function formatActivationMessage(settings, intervalHours = 2) {
  const h = Number(intervalHours) || 2;
  const pv = String(settings?.provider || "openmeteo").toLowerCase();
  const provider = pv === "bmkg" ? "BMKG"
    : pv === "aggregate" || pv === "multi" ? "AGGREGATE (Open-Meteo, MET Norway, BMKG, WeatherAPI)"
    : pv === "metno" || pv === "met" || pv === "norway" ? "MET Norway"
    : pv === "weatherapi" || pv === "wa" ? "WeatherAPI"
    : "Open-Meteo";
  const locName = settings?.location?.name || "Lokasi terdaftar";
  const mode = settings?.notificationMode === "otomatis"
    ? `⚡ Mode otomatis: cek tiap ${settings?.autoCheckMinutes || 5} menit — kirim pas cuaca berubah`
    : settings?.notificationMode === "interval"
    ? `⏱️ Update otomatis setiap: ${h} jam`
    : `⏱️ Jadwal: ${(settings?.schedules || []).map((s) => String(s.hour).padStart(2, "0") + ":" + String(s.minute || 0).padStart(2, "0")).join(", ") || "-"}`;
  return `🌤️ *SISTEM NOTIFIKASI CUACA AKTIF*\n\n` +
    `📍 Lokasi: ${locName}\n` +
    `📡 Provider: ${provider}\n` +
    mode + `\n\n` +
    `Mulai sekarang update cuaca otomatis masuk ke chat ini.`;
}

// Kondisi key untuk dedup ala script — kalau cuaca gak berubah, gak kirim ulang
export function conditionKey(data) {
  if (!data) return "";
  return `${data.temperature}_${data.condition}_${data.time}`;
}

// 🔹 MODE OTOMATIS (request owner 12 Sep 2026: "klo mode otomatis aktif tiap
// cuaca berubah dia kirim notifikasi — adanya mode jadwal, gak ada mode
// otomatisnya"): key perubahan TANPA time — cuma kondisi + suhu dibulatkan.
// Beda dengan conditionKey (yang ikut keganti tiap slot jam), realtimeKey
// cuma berubah kalau cuacanya BENERAN berubah → mode otomatis kirim
// notifikasi pas kondisi ganti, gak nunggu interval jam.
export function realtimeKey(data) {
  if (!data) return "";
  const temp = Math.round(Number(data.temperature) || 0);
  return `${temp}_${data.condition || ""}`;
}

// 🔹 DETEKSI PER GRUP CUACA (upgrade 15 Sep 2026 — diagnosis owner: notif
// "tiap cuaca berganti" gak pernah kekirim). Kunci dari dokumen diagnosis:
// bandingkan per GRUP (cerah/mendung/hujan/petir), BUKAN per kode/suhu —
// cerah→cerah berawan gak usah notif (spam), hujan ringan→hujan sedang
// masih satu grup (diam), baru cerah→hujan itu notifnya.
export const WEATHER_GROUPS = {
  cerah: { label: "Cerah", emoji: "☀️" },
  mendung: { label: "Berawan/Mendung", emoji: "☁️" },
  hujan: { label: "Hujan", emoji: "🌧️" },
  hujan_petir: { label: "Hujan Petir", emoji: "⛈️" },
  lainnya: { label: "Lainnya", emoji: "🌡️" },
};

// WMO weathercode → grup (persis grupCuaca dokumen diagnosis owner).
// Fallback teks kondisi buat provider tanpa weather_code (BMKG/weatherapi).
export function weatherGroupOf(data) {
  if (!data) return "lainnya";
  const code = Number(data.weather_code ?? data.weathercode);
  if (Number.isFinite(code) && data.weather_code !== undefined) {
    if (code === 0 || code === 1) return "cerah";
    if (code === 2 || code === 3 || code === 45 || code === 48) return "mendung";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "hujan";
    if (code >= 95) return "hujan_petir";
    return "lainnya";
  }
  const c = String(data.condition || "").toLowerCase();
  if (/petir|badai|thunder|storm/.test(c)) return "hujan_petir";
  if (/hujan|gerimis|rain|drizzle|salju|snow/.test(c)) return "hujan";
  if (/kabut|awan|mendung|cloud|fog/.test(c)) return "mendung";
  if (/cerah|clear/.test(c)) return "cerah";
  return "lainnya";
}

// Pesan notifikasi saat GRUP cuaca berubah — format dokumen diagnosis:
// "Cuaca Berubah — <lokasi>" + Dari/Ke + suhu + curah hujan + hati-hati.
export function formatWeatherChange(data, name, prevGroup, prevCondition) {
  const cur = weatherGroupOf(data);
  const grp = WEATHER_GROUPS[cur] || WEATHER_GROUPS.lainnya;
  const prev = WEATHER_GROUPS[prevGroup] || WEATHER_GROUPS.lainnya;
  const dari = prevGroup ? (prevCondition || prev.label) : "-";
  const precip = Number(data.precipitation);
  const hati = cur === "hujan_petir"
    ? "⚡ Hati-hati petir, hindari area terbuka ya!"
    : cur === "hujan"
    ? "☔ Jangan lupa bawa payung, hati-hati di jalan ya!"
    : "Semoga harimu menyenangkan ya! 😊";
  return `${grp.emoji} *CUACA BERUBAH — ${name || "Lokasi"}*

_Dari:_ ${dari}
_Ke:_ *${data.condition || grp.label}* (${grp.label})

🌡️ Suhu: ${data.temperature ?? "N/A"}°C
💧 Curah hujan: ${Number.isFinite(precip) ? precip : 0} mm
💨 Angin: ${data.wind_speed ?? "N/A"} km/j ${data.wind_direction_text || ""}

_${hati}_`;
}
