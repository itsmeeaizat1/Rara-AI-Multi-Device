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

// Threshold default (bisa di-override di evaluateWeatherAlert utk testing)
export const THRESHOLDS = {
  windWaspada: 40, windSiaga: 60, windAwas: 80,   // km/jam
  heatWaspada: 36, heatSiaga: 38, heatAwas: 40,     // °C
  precipWaspada: 10, precipSiaga: 20, precipAwas: 50, // mm/jam
};

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
