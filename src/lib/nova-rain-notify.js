// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-rain-notify.js — Notifikasi "akan segera hujan dalam X menit"
// (request owner 15 Sep 2026: "upgrade fitur cuaca klo mau hujan didaerah
// saya mncul notif akan segera hujan dalam x menit mendatang" — konsep ala
// notif cuaca Bing, data curah hujan PER MENIT One Call 3.0 OpenWeatherMap)
//
// RANTAI PROVIDER:
//   1. OpenWeatherMap One Call 3.0 — minutely precipitation per menit
//      (exclude=current,daily,alerts) — UTAMA sesuai spec owner
//   2. Open-Meteo minutely_15 — fallback gratis tanpa key (resolusi 15 mnt
//      di-expand ke per-menit, biar logika 30-menit window tetap jalan)
//
// LOGIKA ANTI-SPAM (kunci, ala spec owner):
//   Setiap interval (default 10 mnt):
//     1. Ambil data hujan per menit
//     2. Hujan dalam 30 menit ke depan? (total > 0.5 mm)
//        TIDAK → skip (diam) / YA ↓
//     3. Sudah notif dalam cooldown (default 2 jam) utk chat ini?
//        YA → skip / BELUM → KIRIM NOTIF
//
// Kalimat saran persiapan (payung/isteduh) dibuat bantuan AI (aiChainChat
// best-effort — AI down → kalimat default, fitur tetap jalan).
//
// Dipakai plugin .hujannotif (plugins/info/hujannotify.js):
//   • .hujannotif on/off/status/cek | set <tempat|lat,lon|reply lokasi WA>
//   • interval <5-60> | cooldown <30-720>
// Lokasi default mewarisi weatherScheduler (biar owner gak set 2x).

import axios from "axios";
import config from "../../config.js";
import { getDatabase } from "./nova-database.js";
import { logger } from "./nova-logger.js";
import { mergeAutoTargets } from "./nova-auto-target.js";

const SETTING_KEY = "rainNotify";
const DEFAULT_INTERVAL_MENIT = 10;   // cek tiap 10 menit (spec owner)
const DEFAULT_COOLDOWN_MENIT = 120;  // anti-spam 2 jam (spec owner)
const WINDOW_MENIT = 30;             // horizon prakiraan 30 menit (spec owner)
const THRESHOLD_MM = 0.5;            // total curah 30 mnt > 0.5 mm (spec owner)
const TZ = "Asia/Jakarta";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  Accept: "application/json",
};

// ───────────────────────────── key & settings ─────────────────────────────

export function getOwmKey() {
  return String(
    config.aiHelp?.openWeatherKey ||
    config.APIkey?.openweather ||
    config.openWeatherKey ||
    process.env.OPENWEATHERMAP_API_KEY ||
    "",
  ).trim();
}

function defaultSettings() {
  return {
    enabled: false,
    targets: [],
    location: null, // { name, lat, lon }
    intervalMenit: DEFAULT_INTERVAL_MENIT,
    cooldownMenit: DEFAULT_COOLDOWN_MENIT,
    lastNotified: {}, // chatId → ISO terakhir kirim (anti-spam per chat)
    lastCheck: null,
    lastSource: null,
    owmError: null, // pesan kalau One Call 3.0 belum subscribe (petunjuk status)
  };
}

function getSettings() {
  const stored = (() => {
    try { return getDatabase().setting(SETTING_KEY) || {}; } catch { return {}; }
  })();
  const st = { ...defaultSettings(), ...stored };
  st.lastNotified = { ...(stored.lastNotified || {}) };
  return st;
}

function saveSettings(st) {
  try {
    getDatabase().setting(SETTING_KEY, st);
  } catch (e) {
    logger.error?.("rain-notify", "saveSettings gagal: " + e.message);
  }
}

// Catat masalah One Call 3.0 (mis. belum subscribe) biar .status kasih petunjuk
function noteOwmError(e) {
  const msg = String(e?.message || e || "");
  try {
    const st = getSettings();
    st.owmError = /subscription|separate subscription/i.test(msg)
      ? "key valid tapi One Call 3.0 belum di-subscribe (buka https://openweathermap.org/price → One Call by Call, gratis 1000 panggilan/hari) — sementara nowcast pakai Open-Meteo 15-menit"
      : msg.slice(0, 160);
    saveSettings(st);
  } catch { /* diam */ }
}
function clearOwmError() {
  try {
    const st = getSettings();
    if (st.owmError) { st.owmError = null; saveSettings(st); }
  } catch { /* diam */ }
}

// ─────────────────── fetcher (injectable buat e2e) ───────────────────

let owmFetcher = null;
let omFetcher = null;
let aiTipMaker = null;
export function setRainFetcher({ owm, openmeteo, aiTip } = {}) {
  if (owm) owmFetcher = owm;
  if (openmeteo) omFetcher = openmeteo;
  if (aiTip) aiTipMaker = aiTip;
}

// One Call 3.0 — minutely[].precipitation = mm/menit
async function fetchOwmMinutely(lat, lon) {
  if (owmFetcher) return owmFetcher(lat, lon);
  const key = getOwmKey();
  if (!key) throw new Error("apikey openweather belum diset (apikey.js openWeatherKey)");
  let res;
  try {
    res = await axios.get("https://api.openweathermap.org/data/3.0/onecall", {
      params: { lat, lon, appid: key, units: "metric", exclude: "current,daily,alerts" },
      headers: HEADERS,
      timeout: 15000,
    });
  } catch (e) {
    // detail asli dari body OWM (mis. 401 butuh subscribe One Call 3.0) —
    // biar .status nunjukin petunjuk subscribe, bukan cuma "status code 401"
    const detail = e?.response?.data?.message;
    throw new Error(detail ? detail.slice(0, 180) : e.message);
  }
  const minutely = res.data?.minutely || [];
  if (!minutely.length) throw new Error("minutely kosong dari One Call 3.0");
  // Normalisasi: [{ precip }] per menit
  return minutely.map((m) => ({ precip: m.precipitation || 0 }));
}

// Open-Meteo — minutely_15 (gratis): langkah 15 mnt di-expand per menit
async function fetchOmMinutely(lat, lon) {
  if (omFetcher) return omFetcher(lat, lon);
  const res = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: String(lat),
      longitude: String(lon),
      minutely_15: "precipitation",
      forecast_minutely_15: "32", // 8 jam langkah 15 mnt
      timezone: TZ,
    },
    headers: HEADERS,
    timeout: 15000,
  });
  const steps = res.data?.minutely_15?.precipitation || [];
  if (!steps.length) throw new Error("minutely_15 kosong dari Open-Meteo");
  return Array.from({ length: 60 }, (_, i) => ({ precip: steps[Math.floor(i / 15)] || 0 }));
}

// ───────────────────────────── analisis ─────────────────────────────

// Analisis nowcast — murni, gak ada side effect (dipakai e2e + plugin cek)
export function analyzeRain(minutely, windowMenit = WINDOW_MENIT, thresholdMm = THRESHOLD_MM) {
  const win = (minutely || []).slice(0, windowMenit);
  const total = win.reduce((t, m) => t + (m.precip || 0), 0);
  const firstIdx = win.findIndex((m) => (m.precip || 0) > 0);
  const rainingNow = (minutely?.[0]?.precip || 0) > 0;
  // Ambang intensitas dari spec owner: >10 lebat, >3 sedang, sisanya ringan
  const intensity = total > 10 ? "lebat" : total > 3 ? "sedang" : "ringan";
  return {
    willRain: total > thresholdMm && firstIdx > -1,
    total,
    menitTunggu: firstIdx,
    rainingNow,
    intensity,
    windowMenit,
  };
}

// Kalimat saran persiapan — AI best-effort (spec owner: "pesan dri ai pkai
// bantuan ai untuk kalimat ini"), fallback kalimat tetap.
async function makeAiTip(an) {
  const fallback = an.rainingNow
    ? "Tetap waspada, jangan keluar dulu kalau gak perlu ya 😊"
    : "Segera siapkan payung atau cari tempat teduh ya 😊";
  try {
    if (aiTipMaker) return await aiTipMaker(an);
    const { aiChainChat } = await import("./nova-ai-fallback.js");
    const out = await aiChainChat(
      "Buat 1 kalimat singkat dan ramah dalam bahasa Indonesia (maksimal 12 kata, tepat 1 emoji di akhir) untuk mengingatkan seseorang " +
        (an.rainingNow ? "bahwa hujan sedang turun dan akan berlanjut" : "bahwa hujan " + an.intensity + " akan turun dalam " + an.menitTunggu + " menit lagi") +
        ". Balas HANYA kalimatnya, tanpa tanda kutip, tanpa awalan.",
      { timeoutMs: 20000 },
    );
    const tip = String(out || "").trim().replace(/^["'\u201c]+|["'\u201d]+$/g, "");
    return tip && tip.length <= 120 ? tip : fallback;
  } catch {
    return fallback;
  }
}

// ───────────────────────────── kirim ─────────────────────────────

let sock = null;
export function setRainSock(_sock) {
  if (_sock) sock = _sock;
}

function fmtWIB() {
  return new Date().toLocaleString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).replace(".", ":") + " WIB";
}

export async function buildRainMessage(locName, an) {
  const emoji = an.intensity === "lebat" ? "⛈️" : an.intensity === "sedang" ? "🌧️" : "🌦️";
  const head = an.rainingNow
    ? "💦 Hujan *" + an.intensity + "* SEDANG berlangsung & diperkirakan berlanjut!"
    : emoji + " Hujan *" + an.intensity + "* diperkirakan datang dalam *" + an.menitTunggu + " menit*!";
  const tip = await makeAiTip(an);
  return (
    "🌧️ *PERINGATAN HUJAN - " + (locName || "Lokasi Kamu") + "*\n\n" +
    head + "\n\n" +
    "_💬 " + tip + "_\n\n" +
    "💧 Total curah hujan " + an.windowMenit + " menit ke depan: *" + an.total.toFixed(1) + " mm*\n" +
    "🕐 Cek " + fmtWIB() + " • sumber nowcast per-menit"
  );
}

async function sendRain(chatId, text) {
  if (!sock) return false;
  try {
    await sock.sendMessage(chatId, {
      text,
      contextInfo: {
        externalAdReply: {
          title: "AKAN SEGERA HUJAN",
          body: "nova rain notifier • nowcast per-menit",
          sourceUrl: "https://openweathermap.org/",
          mediaType: 1,
          renderLargerThumbnail: true,
          showAdAttribution: false,
        },
      },
    });
    return true;
  } catch (e) {
    logger.error?.("rain-notify", "kirim ke " + chatId + " gagal: " + e.message);
    return false;
  }
}

// ───────────────────────────── run check ─────────────────────────────

let chain = Promise.resolve();
function enqueue(fn) {
  chain = chain.then(fn, fn);
  return chain;
}

export function runRainCheck(opts = {}) {
  return enqueue(() => doRunRainCheck(opts));
}

async function doRunRainCheck({ force = false, chatId = null } = {}) {
  const st = getSettings();
  if (!st.enabled && !force) return { skipped: true };
  // Lokasi: rain-notify dulu, warisi weather scheduler kalau belum diset
  let loc = st.location;
  if (!loc || !(Number.isFinite(loc.lat) && Number.isFinite(loc.lon))) {
    try {
      const ws = getDatabase().setting("weatherScheduler") || {};
      const wsl = ws.location || {};
      if (Number.isFinite(Number(wsl.latitude)) && Number.isFinite(Number(wsl.longitude))) {
        loc = { name: wsl.name || "Lokasi cuaca terdaftar", lat: Number(wsl.latitude), lon: Number(wsl.longitude) };
      }
    } catch { /* warisan gak ada */ }
  }
  if (!loc) return { noLocation: true };
  const targets = chatId
    ? [chatId]
    : await mergeAutoTargets(sock, "autorainnotify", [...st.targets]);
  if (!targets.length) return { noTargets: true };

  // Rantai provider: OWM One Call 3.0 → Open-Meteo minutely_15
  let minutely, source;
  try {
    minutely = await fetchOwmMinutely(loc.lat, loc.lon);
    source = "openweathermap-onecall3";
    if (st.owmError) st.owmError = null;
  } catch (eOwm) {
    noteOwmError(eOwm);
    try {
      minutely = await fetchOmMinutely(loc.lat, loc.lon);
      source = "open-meteo-minutely15";
    } catch (eOm) {
      throw new Error("semua sumber nowcast down: " + eOwm.message + " / " + eOm.message);
    }
  }
  st.lastCheck = new Date().toISOString();
  st.lastSource = source;

  const an = analyzeRain(minutely);
  let sent = 0;
  if (an.willRain) {
    const msg = await buildRainMessage(loc.name, an);
    const now = Date.now();
    const cooldownMs = (Number(st.cooldownMenit) || DEFAULT_COOLDOWN_MENIT) * 60000;
    for (const t of targets) {
      // ANTI-SPAM: per-chat cooldown 2 jam — force+chatId (manual .cek) bypass
      const last = st.lastNotified[t] ? new Date(st.lastNotified[t]).getTime() : 0;
      if (!force && now - last < cooldownMs) continue;
      if (await sendRain(t, msg)) {
        st.lastNotified[t] = new Date().toISOString();
        sent++;
      }
    }
  }
  saveSettings(st);
  return { sent, an, source, targets: targets.length };
}

// Cek manual (.hujannotif cek) — nowcast utk chat ini, bypass cooldown
export async function rainNowCard(loc) {
  let minutely, source;
  try {
    minutely = await fetchOwmMinutely(loc.lat, loc.lon);
    source = "openweathermap-onecall3";
    clearOwmError();
  } catch (eOwm) {
    noteOwmError(eOwm);
    minutely = await fetchOmMinutely(loc.lat, loc.lon);
    source = "open-meteo-minutely15";
  }
  const an = analyzeRain(minutely);
  if (an.willRain) return { an, source, text: await buildRainMessage(loc.name, an) };
  return {
    an,
    source,
    text:
      "☀️ *NOWCAST HUJAN - " + (loc.name || "Lokasi") + "*\n\n" +
      "Aman! Gak ada hujan yang terdeteksi dalam *" + an.windowMenit + " menit* ke depan.\n\n" +
      "💧 Estimasi curah " + an.windowMenit + " menit ke depan: *" + an.total.toFixed(1) + " mm*\n" +
      "🕐 Cek " + fmtWIB() + " • sumber " + (source === "openweathermap-onecall3" ? "per-menit" : "15-menit"),
  };
}

// ───────────────────────────── lokasi ─────────────────────────────

// Geocode nama tempat → koordinat (Nominatim gratis, pola .kiblat)
export async function geocodePlace(query) {
  const res = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: String(query), format: "json", limit: 1 },
    headers: { "User-Agent": "nova-rain-notify/1.0" },
    timeout: 15000,
  });
  const hit = res.data?.[0];
  if (!hit) return null;
  return { name: hit.name || String(query), lat: Number(hit.lat), lon: Number(hit.lon) };
}

export function setLocation(loc) {
  const st = getSettings();
  st.location = loc;
  saveSettings(st);
  syncRainMonitor();
  return true;
}

export function getLocation() {
  return getSettings().location;
}

// ───────────────────────────── target & status ─────────────────────────────

export function addTarget(chatId) {
  const st = getSettings();
  if (!st.targets.includes(chatId)) st.targets.push(chatId);
  if (!st.enabled) st.enabled = true; // langganan pertama auto-aktifkan polling
  saveSettings(st);
  syncRainMonitor();
  return true;
}

export function removeTarget(chatId) {
  const st = getSettings();
  const i = st.targets.indexOf(chatId);
  if (i > -1) st.targets.splice(i, 1);
  saveSettings(st);
  syncRainMonitor();
  return true;
}

export function isTarget(chatId) {
  return getSettings().targets.includes(chatId);
}

export function setEnabled(on) {
  const st = getSettings();
  st.enabled = !!on;
  saveSettings(st);
  syncRainMonitor();
  return st.enabled;
}

export function isEnabled() {
  return !!getSettings().enabled;
}

export function setIntervalMenit(menit) {
  const v = Number(menit);
  if (!v || v < 5 || v > 60) return null;
  const st = getSettings();
  st.intervalMenit = v;
  saveSettings(st);
  syncRainMonitor();
  return v;
}

export function setCooldownMenit(menit) {
  const v = Number(menit);
  if (!v || v < 30 || v > 720) return null;
  const st = getSettings();
  st.cooldownMenit = v;
  saveSettings(st);
  return v;
}

export function getStatus() {
  const st = getSettings();
  return {
    enabled: st.enabled,
    targets: [...st.targets],
    location: st.location,
    intervalMenit: st.intervalMenit,
    cooldownMenit: st.cooldownMenit,
    windowMenit: WINDOW_MENIT,
    keyOwm: !!getOwmKey(),
    lastCheck: st.lastCheck,
    lastSource: st.lastSource,
    lastNotified: st.lastNotified,
    owmError: st.owmError || null,
    running: !!timer,
  };
}

// ───────────────────────────── monitor ─────────────────────────────

let timer = null;

export function syncRainMonitor() {
  const st = getSettings();
  if (st.enabled && st.targets.length && st.location && !timer) startTimer();
  if ((!st.enabled || !st.targets.length || !st.location) && timer) stopRainMonitor();
  return { started: !!timer };
}

function startTimer() {
  const st = getSettings();
  timer = setInterval(() => {
    runRainCheck().catch((e) => logger.error?.("rain-notify", "runRainCheck: " + e.message));
  }, (Number(st.intervalMenit) || DEFAULT_INTERVAL_MENIT) * 60000);
  if (typeof timer.unref === "function") timer.unref();
  logger.info?.("rain-notify", "monitor JALAN — cek tiap " + st.intervalMenit + " mnt, " + st.targets.length + " subscriber, lokasi " + (st.location?.name || "?"));
}

export function stopRainMonitor() {
  if (timer) { clearInterval(timer); timer = null; }
}

export async function initRainNotifier(_sock) {
  setRainSock(_sock);
  const st = getSettings();
  syncRainMonitor();
  if (st.enabled && timer) {
    // cek langsung pas boot — kalau hujan emang mau turun, owner langsung tau
    runRainCheck().catch((e) => logger.error?.("rain-notify", "init: " + e.message));
  }
  logger.info?.("rain-notify", "monitor " + (timer ? "JALAN" : "idle") + " — interval " + st.intervalMenit + " mnt, " + st.targets.length + " subscriber" + (st.location ? ", lokasi " + st.location.name : ", lokasi BELUM diset"));
  return true;
}
