// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-weather-notify.js — Engine notifikasi cuaca ala script standalone owner
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
// FETCH SESUAI SETTING (provider openmeteo | bmkg)
// ─────────────────────────────────────────────────────────────
export async function fetchWeatherForSettings(settings) {
  const provider = String(settings?.provider || "openmeteo").toLowerCase();
  if (provider === "bmkg") {
    return fetchBmkgNow(settings.adm4);
  }
  const loc = settings.location || {};
  if (!Number.isFinite(Number(loc.latitude)) || !Number.isFinite(Number(loc.longitude))) {
    throw new Error("Koordinat lokasi cuaca belum diatur (.autoweatherrealtime lokasi <kota>)");
  }
  return fetchOpenMeteoNow(loc.latitude, loc.longitude);
}

// ─────────────────────────────────────────────────────────────
// FORMAT PESAN — persis ala script standalone owner
// ─────────────────────────────────────────────────────────────
export function formatWeatherUpdate(data, locationName, intervalHours = 2) {
  if (!data) return "⚠️ Data cuaca tidak tersedia saat ini.";

  const emoji = conditionEmoji(data.condition);
  const name = locationName || "Lokasi";
  let msg = `${emoji} *UPDATE CUACA - ${name}*\n`;
  msg += `📡 *Sumber: ${data.provider}*\n`;
  msg += `🕐 *Waktu: ${data.time || new Date().toLocaleString("id-ID")}*\n\n`;

  if (data.provider === "BMKG") {
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

  const h = Number(intervalHours) || 2;
  msg += `\n📌 Update otomatis setiap ${h} jam\n`;
  msg += `🔄 Next update: ${new Date(Date.now() + h * 3600000).toLocaleTimeString("id-ID")}`;
  return msg;
}

// Pesan aktivasi ala script (SISTEM NOTIFIKASI CUACA AKTIF)
export function formatActivationMessage(settings, intervalHours = 2) {
  const h = Number(intervalHours) || 2;
  const provider = String(settings?.provider || "openmeteo").toLowerCase() === "bmkg" ? "BMKG" : "Open-Meteo";
  const locName = settings?.location?.name || "Lokasi terdaftar";
  const mode = settings?.notificationMode === "interval"
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
