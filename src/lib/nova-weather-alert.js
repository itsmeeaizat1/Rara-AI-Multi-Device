// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-weather-alert.js — Alert CUACA EKSTREM ala EWS (8 Sep 2026,
// request owner: "tambah supaya ada alert cuaca ekstremnya, tidak
// hanya notif cuaca biasa").
//
// BMKG gak punya endpoint peringatan publik (peringatan-dini-cuaca 404,
// percu.bmkg.go.id gak reachable — verified 8 Sep 2026), jadi alert
// diturunkan dari DATA provider yang sudah ada (Open-Meteo / BMKG /
// MET Norway / WeatherAPI / AGGREGATE) pakai threshold + level ala EWS.
//
// Level: 1 🟡 WASPADA | 2 🟠 SIAGA | 3 🔴 AWAS
// Dedup & pengiriman ditangani scheduler (nova-weather-realtime-scheduler.js).

import { conditionEmoji } from "./nova-weather-notify.js";

export const LEVELS = { 1: { emoji: "🟡", text: "WASPADA" }, 2: { emoji: "🟠", text: "SIAGA" }, 3: { emoji: "🔴", text: "AWAS" } };

// Threshold default (bisa di-override per subscriber via .weathersystemwatch
// threshold set — lihat buildThresholds + THRESHOLD_BASE di bawah)
export const THRESHOLDS = {
  windWaspada: 40, windSiaga: 60, windAwas: 80,      // km/jam
  heatWaspada: 36, heatSiaga: 38, heatAwas: 40,        // °C
  coldWaspada: 10, coldSiaga: 5, coldAwas: 0,          // °C
  precipWaspada: 10, precipSiaga: 20, precipAwas: 50,  // mm/jam
  humidityHigh: 90, humidityLow: 20,                   // %
};

// Basis threshold user-facing (1 knob per pemicu, diturunkan otomatis ke
// 3 level EWS). Ini yang di-set via .weathersystemwatch threshold set.
export const THRESHOLD_BASE = {
  heat: { default: 36, unit: "°C", desc: "Panas ekstrem (Waspada; Siaga +2, Awas +4)", min: 25, max: 50 },
  cold: { default: 10, unit: "°C", desc: "Dingin ekstrem (Waspada; Siaga -3, Awas -6)", min: -30, max: 25 },
  rain: { default: 20, unit: "mm/jam", desc: "Hujan lebat (Siaga; Waspada /2, Awas ×2.5)", min: 1, max: 200 },
  wind: { default: 40, unit: "km/jam", desc: "Angin kencang (Waspada; Siaga +20, Awas +40)", min: 10, max: 150 },
  storm: { default: 60, unit: "km/jam", desc: "Angin badai (Siaga; Waspada -20, Awas +20)", min: 20, max: 150 },
  humidityHigh: { default: 90, unit: "%", desc: "Kelembapan sangat tinggi (Waspada)", min: 60, max: 100 },
  humidityLow: { default: 20, unit: "%", desc: "Udara sangat kering (Waspada)", min: 0, max: 40 },
};

// Turunkan override basis user → threshold penuh 3-level.
// overrides = settings.thresholds ({ heat: 38, wind: 45, ... }).
export function buildThresholds(overrides = {}) {
  const t = { ...THRESHOLDS };
  const o = overrides || {};
  if (o.heat != null) { t.heatWaspada = +o.heat; t.heatSiaga = +o.heat + 2; t.heatAwas = +o.heat + 4; }
  if (o.cold != null) { t.coldWaspada = +o.cold; t.coldSiaga = +o.cold - 3; t.coldAwas = +o.cold - 6; }
  if (o.rain != null) { t.precipSiaga = +o.rain; t.precipWaspada = Math.max(1, Math.round(+o.rain / 2)); t.precipAwas = Math.round(+o.rain * 2.5); }
  if (o.wind != null) { t.windWaspada = +o.wind; t.windSiaga = +o.wind + 20; t.windAwas = +o.wind + 40; }
  if (o.storm != null) { t.windSiaga = +o.storm; t.windWaspada = Math.max(1, +o.storm - 20); t.windAwas = +o.storm + 20; }
  if (o.humidityHigh != null) t.humidityHigh = +o.humidityHigh;
  if (o.humidityLow != null) t.humidityLow = +o.humidityLow;
  return t;
}

const OM_THUNDER_AWAS = [96, 99];
const OM_THUNDER_SIAGA = [95];
const OM_HEAVY_RAIN = [65, 82];
const OM_FOG = [45, 48];

// Instruksi singkat per pemicu (ala EWS — langsung bisa dieksekusi)
const INSTRUCTIONS = {
  thunder: [
    "Segera berteduh di dalam ruangan",
    "Jauhi pohon, tiang listrik, dan area terbuka",
    "Cabut perangkat elektronik dari colokan",
  ],
  heavyRain: [
    "Waspada banjir & genangan di jalan",
    "Hindari area rawan longsor di jalur perjalanan",
    "Tunda perjalanan yang gak mendesak",
  ],
  wind: [
    "Amankan benda ringan di luar rumah",
    "Hindari papan reklame & pohon yang rawan tumbang",
    "Pengendara roda dua: pelan atau berhenti di tempat aman",
  ],
  heat: [
    "Minum air putih secara rutin",
    "Hindari aktivitas luar jam 11:00-15:00",
    "Pakai topi/sunscreen kalau wajib keluar",
  ],
  fog: [
    "Pelan saat berkendara, jaga jarak",
    "Nyalakan lampu (bukan lampu besar)",
  ],
  cold: [
    "Pakai baju hangat berlapis",
    "Batasi aktivitas di luar ruangan",
    "Pantau anak-anak & lansia terdekat",
  ],
  humidityHigh: [
    "Rasa panas lebih terik — perbanyak minum air",
    "Waspada kelelahan & heat stroke, banyak istirahat",
  ],
  humidityLow: [
    "Perbanyak minum air putih",
    "Gunakan pelembap kulit",
    "Waspada api — udara kering gampang nyala",
  ],
};

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

// Deteksi pemicu dari satu hasil provider
function detectTriggers(data, th) {
  const triggers = [];
  const cond = String(data.condition || "").toLowerCase();
  const code = Number(data.weather_code);

  // ⛈️ Badai petir — kalau ada weather_code (Open-Meteo) pakai code:
  // 95=petir (SIAGA), 96/99=petir+hujan es (AWAS). Teks kondisi gak bisa
  // bedain keduanya ("Badai Petir" vs "Badai Petir + Hujan Es" di map
  // Indonesia pun sama-sama "badai petir"), jadi provider tanpa code
  // cuma naik AWAS kalau teksnya nyebut hujan es / severe thunder.
  const hasCode = Number.isFinite(code);
  const condThunder = /badai petir|thunder/.test(cond);
  const condHail = /hujan es|ice|severe thunder/.test(cond);
  const thunderAw = hasCode ? OM_THUNDER_AWAS.includes(code) : (condThunder && condHail);
  const thunderSi = hasCode ? OM_THUNDER_SIAGA.includes(code) : condThunder;
  if (thunderAw) triggers.push({ type: "thunder", level: 3, label: "⛈️ Badai Petir + Hujan Es" });
  else if (thunderSi) triggers.push({ type: "thunder", level: 2, label: "⛈️ Badai Petir" });

  // 🌧️ Hujan lebat — code OM / kata "hujan lebat|heavy rain"
  if (OM_HEAVY_RAIN.includes(code) || /hujan lebat|heavy rain/.test(cond)) {
    triggers.push({ type: "heavyRain", level: 2, label: "🌧️ Hujan Lebat" });
  }

  // 🌫️ Kabut tebal — code OM / kata kabut / BMKG jarak pandang < 1 km
  if (OM_FOG.includes(code) || /kabut|fog/.test(cond)) {
    triggers.push({ type: "fog", level: 1, label: "🌫️ Kabut Tebal" });
  }
  if (data.visibility && /< 1 km|kurang dari 1/.test(String(data.visibility))) {
    triggers.push({ type: "fog", level: 1, label: "🌫️ Jarak Pandang < 1 km" });
  }

  // 💨 Angin kencang (km/jam — semua provider sudah dikonversi)
  const wind = num(data.wind_speed);
  if (wind !== null) {
    if (wind >= th.windAwas) triggers.push({ type: "wind", level: 3, label: `💨 Angin Ekstrem (${wind} km/jam)` });
    else if (wind >= th.windSiaga) triggers.push({ type: "wind", level: 2, label: `💨 Angin Kencang (${wind} km/jam)` });
    else if (wind >= th.windWaspada) triggers.push({ type: "wind", level: 1, label: `💨 Angin Berangin Kencang (${wind} km/jam)` });
  }

  // 🥵 Panas ekstrem
  const temp = num(data.temperature);
  if (temp !== null) {
    if (temp >= th.heatAwas) triggers.push({ type: "heat", level: 3, label: `🥵 Panas Ekstrem (${temp}°C)` });
    else if (temp >= th.heatSiaga) triggers.push({ type: "heat", level: 2, label: `🥵 Panas Terik (${temp}°C)` });
    else if (temp >= th.heatWaspada) triggers.push({ type: "heat", level: 1, label: `🥵 Panas Tinggi (${temp}°C)` });
  }

  // 🥶 Dingin ekstrem
  if (temp !== null) {
    if (temp <= th.coldAwas) triggers.push({ type: "cold", level: 3, label: `🥶 Dingin Ekstrem (${temp}°C)` });
    else if (temp <= th.coldSiaga) triggers.push({ type: "cold", level: 2, label: `🥶 Dingin Terukur (${temp}°C)` });
    else if (temp <= th.coldWaspada) triggers.push({ type: "cold", level: 1, label: `🥶 Dingin Nyata (${temp}°C)` });
  }

  // 💧 Kelembapan ekstrem (%)
  const hum = num(data.humidity);
  if (hum !== null && hum >= th.humidityHigh) {
    triggers.push({ type: "humidityHigh", level: 1, label: `💧 Kelembapan Sangat Tinggi (${hum}%)` });
  }
  if (hum !== null && hum <= th.humidityLow) {
    triggers.push({ type: "humidityLow", level: 1, label: `🌵 Udara Sangat Kering (${hum}%)` });
  }

  // 🌧️ Curah hujan tinggi (mm/jam — tersedia di Open-Meteo)
  const precip = num(data.precipitation);
  if (precip !== null && precip > 0) {
    if (precip >= th.precipAwas) triggers.push({ type: "heavyRain", level: 3, label: `🌧️ Curah Hujan Ekstrem (${precip} mm/jam)` });
    else if (precip >= th.precipSiaga) triggers.push({ type: "heavyRain", level: 2, label: `🌧️ Curah Hujan Tinggi (${precip} mm/jam)` });
    else if (precip >= th.precipWaspada) triggers.push({ type: "heavyRain", level: 1, label: `🌧️ Curah Hujan Diatas Normal (${precip} mm/jam)` });
  }

  return triggers;
}

// ─────────────────────────────────────────────────────────────
// evaluateWeatherAlert(data) → null | alert object
// data = hasil fetchWeatherForSettings (single ATAU aggregate).
// Mode AGGREGATOR: evaluasi tiap provider di details — pemicu yang
// disetujui ≥2 sumber naik level +1 (konsensus multi-sumber).
// ─────────────────────────────────────────────────────────────
export function evaluateWeatherAlert(data, thOverride = {}) {
  if (!data) return null;
  const th = { ...THRESHOLDS, ...thOverride };

  let triggers = [];
  let sources = 1;
  if (data.provider === "AGGREGATOR" && Array.isArray(data.details)) {
    sources = data.details.length;
    // hitung pemicu per provider, vote per type+level
    const votes = {}; // type → { count, maxLevel, label }
    for (const d of data.details) {
      for (const t of detectTriggers(d, th)) {
        if (!votes[t.type]) votes[t.type] = { count: 0, maxLevel: 0, label: t.label };
        votes[t.type].count++;
        if (t.level > votes[t.type].maxLevel) { votes[t.type].maxLevel = t.level; votes[t.type].label = t.label; }
      }
    }
    for (const [type, v] of Object.entries(votes)) {
      // ≥2 sumber setuju → naik 1 level (konsensus), 1 sumber → level apa adanya
      const level = Math.min(3, v.maxLevel + (v.count >= 2 && sources >= 2 ? 1 : 0));
      triggers.push({ type, level, label: v.label + (sources > 1 ? ` (${v.count}/${sources} sumber)` : "") });
    }
  } else {
    triggers = detectTriggers(data, th);
  }

  if (!triggers.length) return null;

  // Level akhir = pemicu terburuk
  const level = Math.max(...triggers.map((t) => t.level));
  const types = [...new Set(triggers.map((t) => t.type))];

  return {
    level,
    levelText: LEVELS[level].text,
    levelEmoji: LEVELS[level].emoji,
    triggers,
    types,
    key: types.slice().sort().join("+") + "|" + level,
  };
}

// ─────────────────────────────────────────────────────────────
// FORMAT — ala EWS gempa: urgent, level emoji, instruksi singkat
// ─────────────────────────────────────────────────────────────
export function formatAlertMessage(alert, data, locationName) {
  if (!alert) return null;
  const name = locationName || "Lokasi";
  const src = data?.provider === "AGGREGATOR" ? data.sources : data?.provider || "-";
  const conf = data?.provider === "AGGREGATOR" ? ` • Konfidensi ${data.confidence}` : "";

  let msg = `🚨 *PERINGATAN CUACA EKSTREM* 🚨\n`;
  msg += `📍 Lokasi: ${name}\n`;
  msg += `${alert.levelEmoji} *Level: ${alert.levelText}*\n\n`;
  msg += `*Pemicu:*\n`;
  for (const t of alert.triggers) msg += `• ${t.label}\n`;
  msg += `\n🌡️ Suhu: ${data?.temperature ?? "-"}°C | 💨 Angin: ${data?.wind_speed ?? "-"} km/jam | 💧 Kelembapan: ${data?.humidity ?? "-"}%\n`;
  msg += `📡 Sumber: ${src}${conf}\n`;
  msg += `🕐 Waktu: ${data?.time || "-"}\n\n`;
  msg += `⚠️ *Yang harus dilakukan:*\n`;
  const seen = new Set();
  for (const t of alert.triggers) {
    if (seen.has(t.type)) continue;
    seen.add(t.type);
    for (const line of (INSTRUCTIONS[t.type] || [])) msg += `• ${line}\n`;
  }
  msg += `\n🔔 Pantau terus info cuaca — update otomatis tetap berjalan.`;
  return msg;
}
