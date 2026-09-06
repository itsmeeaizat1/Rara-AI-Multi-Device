// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
//  nova-bencana.js — Core fitur Bencana Alam (kategori "bencana")
//  Sumber data (semua API resmi, gratis, tanpa key):
//    🇮🇩 BMKG         — data.bmkg.go.id (gempa Indonesia, shakemap, tsunami)
//    🛰  GDACS (EU/UN) — www.gdacs.org (banjir, topan, gunung api, kekeringan,
//                         kebakaran lahan, tsunami, gempa — level Waspada/Siaga/Awas)
//    🔭 NASA EONET     — eonet.gsfc.nasa.gov (karhutla, badai, gunung api, dll.)
//    🌎 USGS           — earthquake.usgs.gov (gempa global M >= 6.0)
//  Semua endpoint VERIFIED HIDUP 2026-09-06 dari sandbox.
//
//  Auto-alert (.bencanawatch on, per-chat opt-in, default OFF):
//    • Gempa Indonesia baru M >= 5.0 (BMKG)   — poll 60 dtk
//    • Gempa global baru M >= 6.0 (USGS)      — poll 5 mnt
//    • GDACS baru level SIAGA/AWAS            — poll 5 mnt
//  Monitor lazy: timer cuma jalan kalau ada >= 1 chat berlangganan.
//  Pesan alert: plain text natural (aturan bot: notifikasi otomatis
//  terjadwal tanpa box-drawing & tanpa smallcaps).
//
//  3 MODE PENGIRIMAN (request owner 2026-09-06):
//   • otomatis (default) — semua info bencana baru dikirim realtime;
//     dekat lokasi → peringatan wilayah, jauh → alert generic.
//   • jadwal — gak realtime; bencana baru dikumpulkan dulu, dikirim
//     sebagai RANGKUMAN di jam yang di-set user (berapa pun banyaknya,
//     .bencanawatch jadwal add 07:00 / 10:00 / ...).
//   • darurat — realtime tapi cuman yg penting: bencana DEKAT lokasi
//     user (radius) atau bencana besar (gempa M 6.5+ BMKG / M 7.0+
//     global / GDACS level AWAS). Info wilayah jauh gak dikirim.
//
//  PERINGATAN WILAYAH (regional alert, request owner 2026-09-06):
//  Subscriber bisa set lokasi (.bencanawatch lokasi <kota>) + radius.
//  Event baru dalam radius → peringatan khusus warga sekitar wilayah:
//    • kalimat AI (aiFallbackChat) yang berubah sesuai kondisi bencana
//      (jenis/level/magnitudo/jarak) dengan template fallback lokal
//    • info section meta data lengkap (jenis, magnitudo, level, waktu,
//      titik + maps, jarak + arah mata angin, radius, sumber)
//  Subscriber jauh / tanpa lokasi → alert generic seperti biasa.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { getDatabase } from "./nova-database.js";
import { logger } from "./nova-logger.js";
import { aiFallbackChat } from "./nova-ai-fallback.js";

const GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const BMKG_URL = "https://data.bmkg.go.id/DataMKG/TEWS";

const POLL_FAST_MS = 60_000;   // gempa BMKG
const POLL_SLOW_MS = 300_000;  // GDACS + USGS global

const DEFAULT_RADIUS_KM = 300; // radius peringatan wilayah (bisa di-set per user)
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

const STATE_FILE = path.join(process.cwd(), "src", "data", "bencana-state.json");

// ───────────────────────────── util ─────────────────────────────

async function fetchJson(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} dari ${new URL(url).hostname}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function jamWib(ts) {
  const wib = new Date(new Date(ts).getTime() + 7 * 3600e3);
  return wib.toISOString().slice(0, 16).replace("T", " ") + " WIB";
}

function mapsLink(lat, lon) {
  return `https://maps.google.com/?q=${lat},${lon}`;
}

const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const ymd = (d) => d.toISOString().slice(0, 10);

/** Negara kepanjangan → "Austria, Belgium +23 negara" */
export function shortCountry(c) {
  if (!c) return "";
  const parts = String(c).split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length <= 3) return String(c).trim();
  return parts.slice(0, 3).join(", ") + ` +${parts.length - 3} negara`;
}

// ───────────────────────────── tipe & level ─────────────────────────────

export const GDACS_TYPES = {
  EQ: { label: "Gempa Bumi", icon: "💥" },
  FL: { label: "Banjir", icon: "🌊" },
  TC: { label: "Topan / Badai Tropis", icon: "🌀" },
  VO: { label: "Gunung Api", icon: "🌋" },
  DR: { label: "Kekeringan", icon: "☀️" },
  WF: { label: "Kebakaran Hutan/Lahan", icon: "🔥" },
  TS: { label: "Tsunami", icon: "🌊" },
};

export const ALERT_STYLE = {
  Green: { icon: "🟢", label: "WASPADA" },
  Orange: { icon: "🟠", label: "SIAGA" },
  Red: { icon: "🔴", label: "AWAS" },
};

// ───────────────────────────── provider: GDACS ─────────────────────────────

/**
 * Eventlist GDACS.
 * eventtype: EQ gempa, FL banjir, TC topan, VO gunung api,
 * DRkekeringan, WF kebakaran lahan, TS tsunami.
 * alertlevel: Green (Waspada) / Orange (Siaga) / Red (Awas).
 */
export async function getGdacs(days = 7) {
  const from = ymd(new Date(Date.now() - days * 864e5));
  const to = ymd(new Date());
  const d = await fetchJson(`${GDACS_URL}?fromDate=${from}&toDate=${to}`);
  return (d?.features ?? [])
    .map((f) => {
      const p = f.properties;
      const [lon, lat] = f.geometry?.coordinates ?? [0, 0];
      return {
        type: p.eventtype,
        id: `${p.eventtype}-${p.eventid}`,
        name: p.name || "",
        country: p.country || "",
        desc: stripHtml(p.htmldescription || p.description),
        alertlevel: p.alertlevel || "Green",
        alertscore: p.alertscore ?? 0,
        iscurrent: p.iscurrent === "true" || p.iscurrent === true,
        fromdate: p.fromdate || null,
        todate: p.todate || null,
        report: p.url?.report || null,
        lat, lon,
      };
    })
    .sort((a, b) => b.alertscore - a.alertscore);
}

// ───────────────────────────── provider: NASA EONET ─────────────────────────────

export async function getEonet(days = 14, limit = 40) {
  const d = await fetchJson(`${EONET_URL}?status=open&days=${days}&limit=${limit}`);
  return (d?.events ?? []).map((e) => {
    const geo = e.geometry?.[e.geometry.length - 1] ?? {};
    const [lon, lat] = geo.coordinates ?? [0, 0];
    const cat = e.categories?.[0]?.title ?? "Lainnya";
    return {
      id: e.id,
      title: e.title,
      cat,
      mag: geo.magnitudeValue ? `${geo.magnitudeValue} ${geo.magnitudeUnit ?? ""}`.trim() : null,
      date: Date.parse(geo.date),
      lat, lon,
      link: e.sources?.[0]?.url || e.link || null,
    };
  });
}

// ───────────────────────────── provider: USGS ─────────────────────────────

export async function getUsgs(minMag = 6.0, limit = 15) {
  const d = await fetchJson(`${USGS_URL}?format=geojson&limit=${limit}&minmagnitude=${minMag}&orderby=time`);
  return (d?.features ?? []).map((f) => {
    const [lon, lat] = f.geometry.coordinates;
    return {
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place || "—",
      time: f.properties.time,
      tsunami: f.properties.tsunami === 1,
      url: f.properties.url || null,
      lat, lon,
    };
  });
}

// ───────────────────────────── provider: BMKG ─────────────────────────────

export async function getBmkgLatest() {
  const d = await fetchJson(`${BMKG_URL}/autogempa.json`);
  const g = d?.Infogempa?.gempa;
  if (!g?.DateTime) return null;
  g._shakemapUrl = g.Shakemap ? `${BMKG_URL}/${g.Shakemap}` : null;
  return g;
}

// ───────────────────────────── state & subscribers ─────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const st = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      st.pending ??= [];
      st.firedJadwal ??= [];
      return st;
    }
  } catch { /* korup → mulai ulang */ }
  return { bmkg: null, gdacs: [], usgs: [], pending: [], firedJadwal: [] };
}

function saveState(st) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
  } catch (e) {
    logger.error?.("bencana", "Gagal simpan state: " + e.message);
  }
}

/** Subscribers disimpan di database utama: db.setting("bencanaWatch") */
function getWatchers() {
  try {
    const db = getDatabase();
    return db.setting("bencanaWatch") || {};
  } catch { return {}; }
}

function saveWatchers(subs) {
  try {
    const db = getDatabase();
    db.setting("bencanaWatch", subs);
  } catch (e) {
    logger.error?.("bencana", "Gagal simpan subscriber: " + e.message);
  }
}

export function addWatcher(chatId) {
  const subs = getWatchers();
  const cur = subs[chatId] || {};
  subs[chatId] = { ...cur, since: cur.since || new Date().toISOString() }; // preserve lokasi/radius saat re-on
  saveWatchers(subs);
  return subs;
}

export function removeWatcher(chatId) {
  const subs = getWatchers();
  delete subs[chatId];
  saveWatchers(subs);
  return subs;
}

export function watcherCount() {
  return Object.keys(getWatchers()).length;
}

/** Versi aman buat handler (gak nge-throw walau db belum siap). */
export async function getWatchersSafe() {
  return getWatchers();
}

// ───────────────────── geocoding + jarak (peringatan wilayah) ─────────────────────

/**
 * Geocode nama tempat → { lat, lon, city, detail } via Open-Meteo
 * (gratis, tanpa key). Cache di db.setting("bencanaGeoCache").
 */
export async function geocodeLocation(query) {
  const q = String(query || "").trim();
  if (q.length < 2) throw new Error("Nama tempat minimal 2 huruf.");
  let cache = {};
  try { cache = getDatabase().setting("bencanaGeoCache") || {}; } catch {}
  const key = q.toLowerCase();
  if (cache[key]) return cache[key];
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=1&language=id&format=json`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
    const d = await res.json();
    const g = d?.results?.[0];
    if (!g) throw new Error(`Tempat "${q}" tidak ditemukan.`);
    const loc = {
      lat: g.latitude,
      lon: g.longitude,
      city: g.name,
      detail: [g.admin1, g.country].filter(Boolean).join(", "),
    };
    const keys = Object.keys(cache);
    if (keys.length > 100) delete cache[keys[0]]; // cache max 100
    cache[key] = loc;
    try { getDatabase().setting("bencanaGeoCache", cache); } catch {}
    return loc;
  } finally {
    clearTimeout(t);
  }
}

/** Jarak dua titik (km) — haversine. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Arah mata angin dari titik user ke event ("timur laut", dll). */
export function bearingCompass(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const dirs = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Set lokasi subscriber (tanpa nge-reset state lain).
 * @returns record subscriber yang baru.
 */
export async function setWatcherLocation(chatId, placeQuery) {
  const loc = await geocodeLocation(placeQuery);
  const subs = getWatchers();
  const cur = subs[chatId] || {};
  subs[chatId] = { ...cur, since: cur.since || new Date().toISOString(), ...loc };
  saveWatchers(subs);
  return subs[chatId];
}

/** Hapus lokasi subscriber (keep subscription). */
export function clearWatcherLocation(chatId) {
  const subs = getWatchers();
  if (subs[chatId]) {
    const { lat, lon, city, detail, ...rest } = subs[chatId];
    subs[chatId] = rest;
    saveWatchers(subs);
  }
  return subs[chatId];
}

/** Set radius monitoring (50-2000 km). */
export function setWatcherRadius(chatId, km) {
  const r = Math.round(Number(km));
  if (!r || r < 50 || r > 2000) throw new Error("Radius harus 50-2000 km.");
  const subs = getWatchers();
  const cur = subs[chatId];
  if (!cur) throw new Error("Aktifkan dulu .bencanawatch on sebelum set radius.");
  subs[chatId] = { ...cur, radius: r };
  saveWatchers(subs);
  return subs[chatId];
}

// ───────────────────── mode pengiriman + jadwal ─────────────────────

const MODES = ["otomatis", "jadwal", "darurat"];

/** Set mode pengiriman subscriber (otomatis/jadwal/darurat). */
export function setWatcherMode(chatId, mode) {
  if (!MODES.includes(mode)) throw new Error(`Mode harus ${MODES.join(" / ")}.`);
  const subs = getWatchers();
  if (!subs[chatId]) throw new Error("Aktifkan dulu .bencanawatch on.");
  subs[chatId].mode = mode;
  saveWatchers(subs);
  return subs[chatId];
}

/** Tambah jam rangkuman (HH:MM). Auto-switch ke mode jadwal. */
export function addWatcherSchedule(chatId, hhmm) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || "").trim());
  if (!m) throw new Error("Format jam salah. Contoh: 07:00");
  const norm = `${m[1].padStart(2, "0")}:${m[2]}`;
  const subs = getWatchers();
  if (!subs[chatId]) throw new Error("Aktifkan dulu .bencanawatch on.");
  const cur = subs[chatId];
  cur.schedules = Array.isArray(cur.schedules) ? cur.schedules : [];
  if (cur.schedules.includes(norm)) throw new Error(`Jadwal ${norm} sudah ada.`);
  if (cur.schedules.length >= 12) throw new Error("Maksimal 12 jadwal. Hapus salah satu dulu.");
  cur.schedules.push(norm);
  cur.schedules.sort();
  cur.mode = "jadwal";
  saveWatchers(subs);
  return subs[chatId];
}

/** Hapus satu jam rangkuman. */
export function removeWatcherSchedule(chatId, hhmm) {
  const subs = getWatchers();
  const cur = subs[chatId];
  if (!cur) throw new Error("Aktifkan dulu .bencanawatch on.");
  cur.schedules = Array.isArray(cur.schedules) ? cur.schedules : [];
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || "").trim());
  const norm = m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
  if (!norm || !cur.schedules.includes(norm)) throw new Error(`Jadwal ${hhmm || "-"} gak ada. Cek daftar: .bencanawatch jadwal`);
  cur.schedules = cur.schedules.filter((s) => s !== norm);
  saveWatchers(subs);
  return subs[chatId];
}

/** Hapus semua jam rangkuman (tanpa ganti mode). */
export function clearWatcherSchedules(chatId) {
  const subs = getWatchers();
  const cur = subs[chatId];
  if (!cur) throw new Error("Aktifkan dulu .bencanawatch on.");
  cur.schedules = [];
  saveWatchers(subs);
  return subs[chatId];
}

function pendingLine(ev) {
  let head = ev.jenis || "Bencana";
  if (ev.mag) head += ` ${ev.mag} SR`;
  if (ev.level) head += ` — ${String(ev.level).replace(/ \(.*\)$/, "")}`;
  return `${head}${ev.desc ? `: ${ev.desc}` : ""}`;
}

/** Kumpulkan event ke pending (buat mode jadwal). Cap 100. */
function pushPending(ev) {
  const st = loadState();
  st.pending.push({ ts: Date.now(), line: pendingLine(ev), lat: ev.lat, lon: ev.lon });
  if (st.pending.length > 100) st.pending = st.pending.slice(-100);
  saveState(st);
}

function nowWib() {
  const w = new Date(Date.now() + 7 * 3600e3);
  return { hhmm: w.toISOString().slice(11, 16), date: w.toISOString().slice(0, 10) };
}

/**
 * Bangun & kirim rangkuman bencana ke satu subscriber mode jadwal.
 * @returns true kalau ada bencana baru & terkirim.
 */
export async function fireJadwalDigest(_sock, chatId, sub) {
  const st = loadState();
  const since = sub.lastDigest || 0;
  const events = (st.pending || []).filter((p) => p.ts > since);
  if (!events.length) return false;
  let out = `RANGKUMAN BENCANA — ${nowWib().hhmm} WIB\n\n`;
  out += `Ada ${events.length} bencana baru sejak rangkuman terakhir:\n\n`;
  out += events.slice(0, 15).map((p, i) => `${i + 1}. ${p.line}`).join("\n");
  if (sub.lat != null) {
    let best = null;
    for (const p of events) {
      if (p.lat == null) continue;
      const d = haversineKm(sub.lat, sub.lon, p.lat, p.lon);
      if (!best || d < best.d) best = { d, p };
    }
    if (best) {
      const dir = bearingCompass(sub.lat, sub.lon, best.p.lat, best.p.lon);
      out += `\n\nTerdekat dari ${sub.city}: ±${Math.round(best.d)} km arah ${dir}\n(${best.p.line})`;
    }
  }
  out += `\n\nCek detail: .bencana\nSumber: BMKG, USGS, GDACS`;
  await _sock.sendMessage(chatId, { text: out });
  // majuin lastDigest — event berikutnya gak dobel masuk rangkuman berikutnya
  const subs = getWatchers();
  if (subs[chatId]) { subs[chatId].lastDigest = Date.now(); saveWatchers(subs); }
  return true;
}

// ───────────────────── composer AI + info section ─────────────────────

const KIND_BY_TYPE = { EQ: "gempa", FL: "banjir", TC: "topan", VO: "gunungapi", DR: "kering", WF: "kebakaran", TS: "tsunami" };

/** Template fallback kalau rantai AI mati — variasi per jenis bencana. */
const REGIONAL_TPL = {
  gempa: [
    "Gempa bumi {mag} SR terdeteksi sekitar {dist} km dari {city}. Mohon warga {city} tetap tenang, waspada gempa susulan, dan hindari bangunan yang terindikasi retak.",
    "Baru saja terjadi gempa {mag} SR di sekitar {city} (±{dist} km). Untuk warga {city}: hindari kaca dan benda gantung, dan siapkan jalur evakuasi bila diperlukan.",
    "Ada gempa {mag} SR pada jarak ±{dist} km dari {city}. Bila dirasakan, lindungi kepala, menjauh dari dinding, dan tetap di tempat aman sampai goncangan berhenti.",
  ],
  banjir: [
    "Peringatan banjir untuk warga {city}: terdeteksi kejadian banjir ±{dist} km dari kota Anda. Mohon waspada kenaikan permukaan air dan hindari area rendah.",
    "Ada kejadian banjir di sekitar {city} (±{dist} km). Warga dimohon menjauhi sungai dan saluran air, siapkan dokumen penting, dan pantau info resmi.",
  ],
  topan: [
    "Badai/topan tropis aktif ±{dist} km dari {city}. Warga {city} mohon waspada angin kencang, hujan deras, dan kemungkinan gangguan listrik.",
    "Terdeteksi topan dekat wilayah {city} (±{dist} km). Mohon amankan benda ringan di luar rumah dan hindari perjalanan tidak penting.",
  ],
  gunungapi: [
    "Aktivitas gunung api terdeteksi ±{dist} km dari {city}. Warga {city} mohon menghindari radius bahaya dan pantau arah angin untuk abu vulkanik.",
    "Ada peningkatan aktivitas gunung api di sekitar {city} (±{dist} km). Siapkan masker bila abu jatuh dan ikuti arahan petugas.",
  ],
  kering: [
    "Kondisi kekeringan terdeteksi di wilayah sekitar {city} (±{dist} km). Mohon hemat air bersih dan waspada kebakaran lahan.",
  ],
  kebakaran: [
    "Kebakaran hutan/lahan aktif ±{dist} km dari {city}. Warga {city} mohon waspada asap, pakai masker bila perlu, dan hindari area pembakaran.",
  ],
  tsunami: [
    "PERINGATAN: terdeteksi peristiwa tsunami ±{dist} km dari {city}. Bila berada di pesisir, segera menjauh ke dataran tinggi dan ikuti arahan evakuasi.",
  ],
  default: [
    "Terdeteksi bencana ({jenis}) ±{dist} km dari {city}. Mohon warga {city} tetap waspada dan pantau informasi resmi terbaru.",
  ],
};

/** Pilih template + isi placeholder. */
function regionalTemplate(ev, distKm, city) {
  const arr = REGIONAL_TPL[ev.kind] || REGIONAL_TPL.default;
  const tpl = arr[Math.floor(Math.random() * arr.length)];
  return tpl
    .replace(/{mag}/g, ev.mag || "?")
    .replace(/{dist}/g, String(Math.round(distKm)))
    .replace(/{city}/g, city)
    .replace(/{jenis}/g, ev.jenis || ev.kind || "bencana");
}

/**
 * Kalimat peringatan via AI (berubah tiap kejadian sesuai kondisi).
 * Fallback template lokal kalau rantai AI mati — fitur gak pernah mati total.
 */
export async function composeRegionalText(ev, distKm, city) {
  const system =
    "Kamu sistem peringatan dini bencana bot WhatsApp bernama Nova. Tulis pesan peringatan singkat (3-5 kalimat) " +
    "dalam bahasa Indonesia untuk warga kota yang disebut, gaya pengumuman darurat: tenang, tegas, menghibur tidak perlu. " +
    "ATURAN: jangan pakai markdown atau format; maksimal satu emoji; jangan mengarang angka/detail yang tidak diberikan; " +
    "sebutkan jenis bencana, tingkat bahaya, dan saran keselamatan konkret sesuai jenis bencananya; variasikan kalimat pembuka.";
  const data =
    `Jenis bencana: ${ev.jenis} (${ev.kind})\n` +
    `Level bahaya: ${ev.level || "waspada"}\n` +
    (ev.mag ? `Magnitudo: ${ev.mag} SR, kedalaman ${ev.depth || "-"}\n` : "") +
    `Jarak dari kota user: ±${Math.round(distKm)} km\n` +
    `Kota user: ${city}\n` +
    (ev.desc ? `Deskripsi: ${ev.desc}\n` : "") +
    "Tulis pesan peringatan untuk warga kota tsb.";
  try {
    const out = await aiFallbackChat(data, { systemPrompt: system });
    let text = String(out || "")
      .replace(/[*_`#>]+/g, "")
      .replace(/^\s*(berikut|ini\s+adalah)[^:]{0,20}:?\s*/i, "")
      .trim();
    if (text.length > 600) text = text.slice(0, 600).trim() + "…";
    if (text.length >= 80) return text;
    throw new Error("AI balas terlalu pendek/kosong");
  } catch {
    return regionalTemplate(ev, distKm, city);
  }
}

/** Info section meta data lengkap kejadian (plain text natural). */
function buildMetaSection(ev, sub, distKm, dirLabel) {
  const L = ["— Informasi kejadian —"];
  L.push(`Jenis     : ${ev.jenis}`);
  if (ev.mag) L.push(`Magnitudo : ${ev.mag} SR, kedalaman ${ev.depth || "-"}`);
  if (ev.level) L.push(`Level     : ${ev.level}`);
  if (ev.waktu) L.push(`Waktu     : ${ev.waktu}`);
  if (ev.lat != null) L.push(`Titik     : ${(+ev.lat).toFixed(2)}, ${(+ev.lon).toFixed(2)} → ${mapsLink(ev.lat, ev.lon)}`);
  L.push(`Jarak     : ±${Math.round(distKm)} km arah ${dirLabel} dari ${sub.city}`);
  L.push(`Radius    : monitoring ${sub.radius || DEFAULT_RADIUS_KM} km`);
  L.push(`Sumber    : ${ev.sumber}`);
  if (ev.report) L.push(`Laporan   : ${ev.report}`);
  return L.join("\n");
}

/**
 * Kirim peringatan wilayah ke satu subscriber.
 * @returns true kalau terkirim.
 */
export async function sendRegionalAlert(_sock, chatId, ev, sub) {
  const distKm = haversineKm(sub.lat, sub.lon, ev.lat, ev.lon);
  const dir = bearingCompass(sub.lat, sub.lon, ev.lat, ev.lon);
  const text = await composeRegionalText(ev, distKm, sub.city);
  const out =
    `PERINGATAN BENCANA — WILAYAH ${String(sub.city).toUpperCase()}\n\n` +
    text +
    `\n\n${buildMetaSection(ev, sub, distKm, dir)}`;
  await _sock.sendMessage(chatId, { text: out });
  return true;
}

// ───────────────────────────── monitor auto-alert ─────────────────────────────

let sock = null;
let fastTimer = null;
let slowTimer = null;
let jadwalTimer = null;

function isRunning() {
  return !!(fastTimer || slowTimer || jadwalTimer);
}

/**
 * Dispatch event ke semua subscriber SESUAI MODE:
 *  • otomatis — dekat lokasi → peringatan wilayah, jauh → alert generic
 *  • jadwal   — gak dikirim sekarang; dikumpulkan, dikirim rangkuman di jam set
 *  • darurat  — hanya yg dekat lokasi (radius) ATAU bencana besar (isSevere)
 * Per-subscriber, jadi tiap chat dapat konten yang relevan.
 */
async function dispatch(ev, genericText = null, imageUrl = null) {
  const subs = getWatchers();
  const hasJadwal = Object.values(subs).some((s) => (s.mode || "otomatis") === "jadwal");
  if (hasJadwal) pushPending(ev); // kumpulin buat rangkuman terjadwal
  for (const [chatId, sub] of Object.entries(subs)) {
    try {
      const mode = sub.mode || "otomatis";
      if (mode === "jadwal") continue; // nunggu jam rangkuman

      const distKm =
        sub.lat != null && ev?.lat != null
          ? haversineKm(sub.lat, sub.lon, ev.lat, ev.lon)
          : Infinity;
      const radius = sub.radius || DEFAULT_RADIUS_KM;
      const near = distKm <= radius;

      if (mode === "darurat" && !near && !ev.isSevere) continue; // filter: cuman yg darurat

      if (near) {
        await sendRegionalAlert(sock, chatId, ev, sub);
      } else if (genericText) {
        await sock.sendMessage(chatId, { text: genericText });
        if (imageUrl) await sock.sendMessage(chatId, { image: { url: imageUrl } });
      }
    } catch (e) {
      logger.error?.("bencana", `Gagal kirim ke ${chatId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
}

/** Wrapper testable — pakai sock internal monitor. */
export async function dispatchBencanaEvent(ev, genericText = null, imageUrl = null) {
  return dispatch(ev, genericText, imageUrl);
}

/**
 * Cek jadwal tiap menit — kirim rangkuman buat subscriber mode jadwal
 * yang jam-nya cocok dengan sekarang (WIB). Anti dobel via state firedJadwal.
 */
async function jadwalTick() {
  try {
    const subs = getWatchers();
    const { hhmm, date } = nowWib();
    for (const [chatId, sub] of Object.entries(subs)) {
      if ((sub.mode || "otomatis") !== "jadwal") continue;
      const scheds = Array.isArray(sub.schedules) ? sub.schedules : [];
      if (!scheds.includes(hhmm)) continue;
      const st = loadState();
      const key = `${chatId}|${date}|${hhmm}`;
      if (st.firedJadwal.includes(key)) continue;
      st.firedJadwal.push(key);
      st.firedJadwal = st.firedJadwal.slice(-100);
      saveState(st);
      // fireJadwalDigest update lastDigest sendiri; kalau kosong (false),
      // event nunggu sampai rangkuman berikutnya (gak ada pesan = gak ada kabar)
      try {
        const sent = await fireJadwalDigest(sock, chatId, sub);
        if (sent) logger.success?.("bencana", `Rangkuman ${hhmm} terkirim ke ${chatId}`);
      } catch (e) {
        logger.error?.("bencana", `Rangkuman gagal kirim ke ${chatId}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.error?.("bencana", "Jadwal error: " + e.message);
  }
}

// fast tick: gempa BMKG baru M >= 5.0
async function fastTick() {
  try {
    const g = await getBmkgLatest();
    if (!g) return;
    const st = loadState();
    if (st.bmkg === null) { st.bmkg = g.DateTime; saveState(st); return; } // baseline, tanpa spam
    if (g.DateTime > st.bmkg) {
      st.bmkg = g.DateTime;
      saveState(st);
      if (parseFloat(g.Magnitude) >= 5.0) {
        const [lat, lon] = String(g.Coordinates).split(",").map((s) => s.trim());
        const lines = [
          "AUTO-ALERT BENCANA — GEMPA INDONESIA (BMKG)",
          "",
          `${g.Magnitude} SR, kedalaman ${g.Kedalaman}`,
          `${g.Tanggal} ${g.Jam}`,
          `${g.Wilayah}`,
        ];
        if (g.Potensi) lines.push(g.Potensi);
        if (g.Dirasakan) lines.push(`Dirasakan: ${g.Dirasakan}`);
        lines.push(`Lokasi: ${g.Coordinates} → ${mapsLink(lat, lon)}`);
        lines.push("", "Sumber: BMKG (data.bmkg.go.id)");
        const ev = {
          kind: "gempa", jenis: "Gempa Bumi",
          mag: g.Magnitude, depth: g.Kedalaman,
          level: parseFloat(g.Magnitude) >= 6.0 ? "AWAS" : "SIAGA",
          waktu: `${g.Tanggal} ${g.Jam}`,
          lat: +lat, lon: +lon, desc: g.Wilayah,
          sumber: "BMKG (data.bmkg.go.id)",
          isSevere: parseFloat(g.Magnitude) >= 6.5, // mode darurat: gempa besar lolos filter global
        };
        await dispatch(ev, lines.join("\n"), g._shakemapUrl);
      }
    }
  } catch (e) {
    logger.error?.("bencana", "BMKG error: " + e.message);
  }
}

// slow tick: GDACS SIAGA/AWAS baru + USGS global M >= 6.0 baru
async function slowTick() {
  try {
    const events = (await getGdacs(2)).filter((e) => e.alertlevel === "Orange" || e.alertlevel === "Red");
    const st = loadState();
    const fresh = events.filter((e) => !st.gdacs.includes(e.id));
    if (fresh.length) {
      st.gdacs.push(...fresh.map((e) => e.id));
      st.gdacs = st.gdacs.slice(-200);
      saveState(st);
      for (const e of fresh) {
        const t = GDACS_TYPES[e.type] ?? { label: e.type, icon: "⚠️" };
        const a = ALERT_STYLE[e.alertlevel];
        const lines = [
          `AUTO-ALERT BENCANA GLOBAL — LEVEL ${a.label}`,
          "",
          `${t.icon} ${t.label}${e.country ? ` di ${shortCountry(e.country)}` : ""}`,
          e.desc || e.name,
          `Lokasi: ${(+e.lat).toFixed(2)}, ${(+e.lon).toFixed(2)} → ${mapsLink(e.lat, e.lon)}`,
        ];
        if (e.report) lines.push(`Laporan: ${e.report}`);
        lines.push("", "Sumber: GDACS (EU/UN) — gdacs.org");
        const ev = {
          kind: KIND_BY_TYPE[e.type] || "default",
          jenis: t.label,
          level: `${a.label} (${a.icon})`,
          waktu: e.fromdate ? `mulai ${jamWib(e.fromdate)}` : (e.desc || ""),
          lat: e.lat, lon: e.lon, desc: e.desc || e.name,
          sumber: "GDACS (EU/UN) — gdacs.org",
          report: e.report,
          isSevere: e.alertlevel === "Red", // mode darurat: level AWAS lolos filter global
        };
        await dispatch(ev, lines.join("\n"));
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } catch (e) {
    logger.error?.("bencana", "GDACS error: " + e.message);
  }
  try {
    const quakes = await getUsgs(6.0, 15);
    const st = loadState();
    const fresh = quakes.filter((q) => !st.usgs.includes(String(q.id)));
    if (fresh.length) {
      st.usgs.push(...fresh.map((q) => String(q.id)));
      st.usgs = st.usgs.slice(-200);
      saveState(st);
      for (const q of fresh) {
        const lines = [
          "AUTO-ALERT GEMPA GLOBAL — M 6.0+ (USGS)",
          "",
          `M${q.mag?.toFixed(1)} — ${q.place}`,
          `${jamWib(q.time)}`,
          `Lokasi: ${(+q.lat).toFixed(2)}, ${(+q.lon).toFixed(2)} → ${mapsLink(q.lat, q.lon)}`,
        ];
        if (q.tsunami) lines.push("PERHATIAN: ada flag potensi tsunami di event ini.");
        if (q.url) lines.push(`Detail: ${q.url}`);
        lines.push("", "Sumber: USGS (earthquake.usgs.gov)");
        const ev = {
          kind: "gempa", jenis: "Gempa Bumi (global)",
          mag: q.mag?.toFixed(1), depth: "-",
          level: q.tsunami ? "AWAS (flag tsunami)" : "SIAGA",
          waktu: jamWib(q.time),
          lat: q.lat, lon: q.lon, desc: q.place,
          sumber: "USGS (earthquake.usgs.gov)",
          report: q.url,
          isSevere: q.mag >= 7.0, // mode darurat: gempa besar global lolos filter
        };
        await dispatch(ev, lines.join("\n"));
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } catch (e) {
    logger.error?.("bencana", "USGS error: " + e.message);
  }
}

/** Start timer kalau belum jalan (lazy — cuma kalau ada subscriber). */
export function startBencanaMonitor() {
  if (isRunning()) return false;
  if (watcherCount() === 0) return false;
  fastTick();
  slowTick();
  fastTimer = setInterval(fastTick, POLL_FAST_MS);
  slowTimer = setInterval(slowTick, POLL_SLOW_MS);
  jadwalTimer = setInterval(jadwalTick, 60_000); // cek jadwal tiap menit (mode jadwal)
  logger.success?.("bencana", `Monitor aktif (${watcherCount()} chat — BMKG 60s, GDACS+USGS 300s, jadwal 60s)`);
  return true;
}

/** Stop timer — dipanggil pas subscriber terakhir off. */
export function stopBencanaMonitor() {
  if (fastTimer) clearInterval(fastTimer);
  if (slowTimer) clearInterval(slowTimer);
  if (jadwalTimer) clearInterval(jadwalTimer);
  fastTimer = slowTimer = jadwalTimer = null;
  return true;
}

/** Sinkron state monitor dengan jumlah subscriber. */
export function syncBencanaMonitor(_sock) {
  if (_sock) sock = _sock;
  if (watcherCount() > 0) startBencanaMonitor();
  else if (isRunning()) stopBencanaMonitor();
}

/**
 * Dipanggil sekali saat boot (index.js). Simpan sock, lalu nyalakan
 * monitor hanya kalau sudah ada subscriber dari sesi sebelumnya.
 */
export function initBencanaMonitor(_sock) {
  sock = _sock;
  syncBencanaMonitor();
  return true;
}
