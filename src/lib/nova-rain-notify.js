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

// v24.2.7 — KOTA FALLBACK kalau lokasi belum di-set.
// Owner: "klo blm set lokasi otomatis hanya memberitahu lokasi akan hujan
// contoh di jakarta, di tangerang kyk random" + "dibuat secanggihnya biar gak
// spam lokasi". Jadi: dipakai BERGILIR (round-robin) + COOLDOWN PER KOTA →
// variatif antar kota, tidak menotifikasi kota yang sama terus (anti spam).
export const AUTO_CITIES = [
  { name: "Jakarta",    lat: -6.2088, lon: 106.8456 },
  { name: "Tangerang",  lat: -6.1783, lon: 106.6300 },
  { name: "Bekasi",     lat: -6.2383, lon: 106.9756 },
  { name: "Depok",      lat: -6.4025, lon: 106.7942 },
  { name: "Bogor",      lat: -6.5971, lon: 106.8060 },
  { name: "Serang",     lat: -6.1200, lon: 106.1500 },
  { name: "Bandung",    lat: -6.9175, lon: 107.6191 },
  { name: "Semarang",   lat: -6.9932, lon: 110.4203 },
  { name: "Yogyakarta", lat: -7.7956, lon: 110.3695 },
  { name: "Surabaya",   lat: -7.2575, lon: 112.7521 },
  { name: "Medan",      lat:  3.5952, lon:  98.6722 },
  { name: "Palembang",  lat: -2.9761, lon: 104.7754 },
  { name: "Makassar",   lat: -5.1477, lon: 119.4327 },
  { name: "Denpasar",   lat: -8.6500, lon: 115.2167 },
  { name: "Balikpapan", lat: -1.2379, lon: 116.8529 },
  { name: "Pontianak",  lat: -0.0263, lon: 109.3425 },
];

function defaultSettings() {
  return {
    enabled: false,
    targets: [],
    location: null, // { name, lat, lon }
    autoCityIdx: 0, // v24.2.7 — penunjuk rotasi kota fallback
    autoCitySent: {}, // v24.2.7 — { namaKota: ISO } cooldown per kota (anti spam)
    intervalMenit: DEFAULT_INTERVAL_MENIT,
    cooldownMenit: DEFAULT_COOLDOWN_MENIT,
    lastNotified: {}, // chatId → ISO terakhir kirim (anti-spam per chat)
    lastCheck: null,
    lastSource: null,
    owmError: null, // pesan kalau One Call 3.0 belum subscribe (petunjuk status)
    owmSkipUntil: 0, // v24.2.6 — skip coba One Call 3.0 sampai waktu ini (hemat kuota)
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

// Teks masalah One Call 3.0 — dipakai bareng oleh noteOwmError() & runRainCheck()
// FIX v24.2.5: dulu logikanya cuma di dalam noteOwmError, sementara runRainCheck
// menyimpan objek `st` versi LAMA di akhir fungsi → pesannya selalu ketimpa
// jadi null dan .hujannotif status TIDAK PERNAH bisa nunjukin alasan OWM gagal.
function owmErrorText(e) {
  const msg = String(e?.message || e || "");
  return /subscription|separate subscription/i.test(msg)
    ? "key valid tapi One Call 3.0 belum di-subscribe (buka https://openweathermap.org/pricing → One Call by Call, gratis 1000 panggilan/hari) — sementara nowcast pakai Open-Meteo 15-menit"
    : msg.slice(0, 160);
}

// Catat masalah One Call 3.0 (mis. belum subscribe) biar .status kasih petunjuk
function noteOwmError(e) {
  try {
    const st = getSettings();
    st.owmError = owmErrorText(e);
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
let owmFcFetcher = null;
let aiTipMaker = null;
export function setRainFetcher({ owm, openmeteo, owmForecast, aiTip } = {}) {
  if (owm) owmFetcher = owm;
  if (openmeteo) omFetcher = openmeteo;
  if (owmForecast) owmFcFetcher = owmForecast;
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

// OWM Forecast 2.5 (5 hari / langkah 3 JAM) — INI yang bisa dipakai key free.
// FIX v24.2.6: sebelumnya key OWM cuma dipakai jalur One Call 3.0 yang butuh
// langganan "One Call by Call" (401) → key terasa "gak kepake". Sekarang key
// tetap berguna sebagai sumber CADANGAN kalau One Call & Open-Meteo tumbang.
// Catatan: langkah 3 jam terlalu kasar buat nowcast 30-60 mnt, makanya posisinya
// di belakang Open-Meteo (15 mnt) — bukan karena key-nya salah.
async function fetchOwmForecast(lat, lon) {
  if (owmFcFetcher) return owmFcFetcher(lat, lon);
  const key = getOwmKey();
  if (!key) throw new Error("apikey openweather belum diset (apikeys.json → fitur.openWeatherKey)");
  const res = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
    params: { lat, lon, appid: key, units: "metric" },
    headers: HEADERS,
    timeout: 15000,
  });
  const list = res.data?.list || [];
  if (!list.length) throw new Error("forecast kosong dari OWM 2.5");
  // Slot terdekat → mm/3jam disebar merata: per-menit = mm3h / 180
  const slot = list[0];
  const mm3h = Number(slot?.rain?.["3h"] || slot?.rain?.["1h"] || 0);
  const perMinute = mm3h / 180;
  return Array.from({ length: 60 }, () => ({ precip: Number.isFinite(perMinute) ? perMinute : 0 }));
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
  // v24.2.7 — belum ada lokasi (dan warisan kosong): pakai kota fallback
  // BERGILIR + cooldown per kota. Tujuan: tetap kasih info hujan tanpa spam
  // satu kota terus, dan tanpa mengharuskan owner set lokasi dulu.
  let autoPicked = false;
  if (!loc) {
    const n = AUTO_CITIES.length;
    const cdMs = (Number(st.cooldownMenit) || DEFAULT_COOLDOWN_MENIT) * 60000;
    const startIdx = Number(st.autoCityIdx) || 0;
    let chosen = null;
    for (let i = 0; i < n; i++) {
      const idx = (startIdx + i) % n;
      const c = AUTO_CITIES[idx];
      const lastAt = st.autoCitySent?.[c.name] ? new Date(st.autoCitySent[c.name]).getTime() : 0;
      if (!lastAt || Date.now() - lastAt >= cdMs) { chosen = { c, idx }; break; }
    }
    // semua kota masih cooldown → tetap rotasi (jangan diam), mulai dari penunjuk
    if (!chosen) { const idx = startIdx % n; chosen = { c: AUTO_CITIES[idx], idx }; }
    loc = chosen.c;
    st.autoCityIdx = (chosen.idx + 1) % n;
    autoPicked = true;
  }
  const targets = chatId
    ? [chatId]
    : await mergeAutoTargets(sock, "autorainnotify", [...st.targets]);
  if (!targets.length) return { noTargets: true };

  // Rantai provider: OWM One Call 3.0 → Open-Meteo minutely_15
  let minutely, source;
  // v24.2.6 — kalau One Call 3.0 sudah ketahuan butuh langganan, jangan dicoba
  // tiap siklus (hemat kuota & waktu). Dicoba lagi setelah 6 jam.
  const skipOwmOneCall = st.owmSkipUntil && Date.now() < st.owmSkipUntil;
  try {
    if (skipOwmOneCall) throw new Error("One Call 3.0 dilewati sementara (butuh langganan One Call by Call)");
    minutely = await fetchOwmMinutely(loc.lat, loc.lon);
    source = "openweathermap-onecall3";
    st.owmError = null;
    st.owmSkipUntil = 0;
  } catch (eOwm) {
    // FIX v24.2.5: set LANGSUNG di objek `st` yang bakal di-save di akhir fungsi
    // (dulu cuma noteOwmError() → save objek lain, lalu saveSettings(st) di akhir
    // menimpa balik jadi null → .status gak pernah nunjukin alasan).
    st.owmError = owmErrorText(eOwm);
    if (/subscription/i.test(String(eOwm?.message || ""))) st.owmSkipUntil = Date.now() + 6 * 3600_000;
    try {
      minutely = await fetchOmMinutely(loc.lat, loc.lon);
      source = "open-meteo-minutely15";
    } catch (eOm) {
      // v24.2.6 — key OWM tetap dipakai: Forecast 2.5 (free tier) sebagai
      // sumber terakhir, biar key gak jadi beban mati saat Open-Meteo tumbang.
      try {
        minutely = await fetchOwmForecast(loc.lat, loc.lon);
        source = "openweathermap-forecast25";
      } catch (eFc) {
        throw new Error("semua sumber nowcast down: " + eOwm.message + " / " + eOm.message + " / " + eFc.message);
      }
    }
  }
  st.lastCheck = new Date().toISOString();
  st.lastSource = source;

  const an = analyzeRain(minutely);
  let sent = 0;
  if (an.willRain) {
    let msg = await buildRainMessage(loc.name, an);
    // v24.2.7 — jelasin kalau lokasinya dipilih otomatis (biar user paham
    // kenapa yang muncul bukan kotanya) + kasih cara set lokasi sendiri.
    if (autoPicked) {
      msg += "\n\n_📍 Lokasi dipilih otomatis (kamu belum set lokasi). Set biar pantau kotamu: `.hujannotif lokasi <nama kota>`_\n_Pantauan kota bergilir — gak akan spam satu kota terus._";
    }
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
    // catat kota otomatis yg baru saja dinotifkan (cooldown per kota)
    if (sent && autoPicked) {
      st.autoCitySent = { ...(st.autoCitySent || {}), [loc.name]: new Date().toISOString() };
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
    owmSkipUntil: st.owmSkipUntil || 0,
    running: !!timer,
  };
}

// ───────────────────────────── monitor ─────────────────────────────

let timer = null;

export function syncRainMonitor() {
  const st = getSettings();
  // v24.2.7 — lokasi TIDAK lagi syarat: kalau belum di-set, sekarang pakai
  // kota fallback bergilir. Cukup enabled + ada penerima.
  if (st.enabled && st.targets.length && !timer) startTimer();
  if ((!st.enabled || !st.targets.length) && timer) stopRainMonitor();
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
