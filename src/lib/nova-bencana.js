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
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${String(wib.getUTCDate()).padStart(2, "0")} ${bulan[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${wib.toISOString().slice(11, 16)} WIB`;
}

function mapsLink(lat, lon) {
  return `https://maps.google.com/?q=${lat},${lon}`;
}

// ───────────────────── preview card (link sumber + thumbnail) ─────────────────────
// Request owner 2026-09-06: link sumber gak mau muncul sebagai link mentah di
// teks alert — teks cukup metadata lengkap. Link masuk ke preview card
// (externalAdReply) + thumbnail dari sumbernya (shakemap BMKG dsb).

const cardThumbCache = new Map(); // url → Buffer (biar gak unduh ulang per target)

/** Unduh thumbnail dari sumber (timeout 10 dtk, tolak > 5MB / non-image). */
async function downloadCardThumb(url) {
  if (!url || !/^https?:\/\//.test(url)) return null;
  if (cardThumbCache.has(url)) return cardThumbCache.get(url);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const ab = await res.arrayBuffer();
    if (!ab.byteLength || ab.byteLength > 5 * 1024 * 1024) return null;
    const buf = Buffer.from(ab);
    if (cardThumbCache.size > 20) cardThumbCache.clear();
    cardThumbCache.set(url, buf);
    return buf;
  } catch { return null; }
}

/**
 * Thumbnail lokal fallback — owner bisa taruh banner sendiri di
 * assets/image/bencana/bencanathumbnail.jpg (placeholder 1x1 diabaikan).
 */
function localBencanaThumb() {
  try {
    const p = path.join(process.cwd(), "assets", "image", "bencana", "bencanathumbnail.jpg");
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      if (buf.length > 1000) return buf;
    }
  } catch {}
  return null;
}

/** URL valid buat preview card — link rusak bikin card gak dirender WA. */
function safeSourceUrl(u) {
  try {
    const url = new URL(String(u || ""));
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {}
  return null;
}

/** Bangun info preview card dari event: title, body, sourceUrl, thumbUrl. */
export function eventCard(ev) {
  const su = evSumberKey(ev);
  let sourceUrl = null;
  if (su === "bmkg") sourceUrl = "https://data.bmkg.go.id";
  if (su === "usgs") sourceUrl = safeSourceUrl(ev.report) || "https://earthquake.usgs.gov";
  if (su === "gdacs") sourceUrl = safeSourceUrl(ev.report) || "https://www.gdacs.org";
  const title = `${ev.jenis || "BENCANA"}${ev.mag ? ` M${ev.mag}` : ""}${ev.level ? ` — ${String(ev.level).replace(/ \(.*\)$/, "")}` : ""}`;
  return {
    title: String(title).slice(0, 60),
    body: String(ev.desc || "").slice(0, 60),
    sourceUrl: safeSourceUrl(sourceUrl),
    thumbUrl: ev.thumbUrl || null,
  };
}

/** Kirim alert sebagai link-preview card: teks bersih + link sumber di card. */
export async function sendWithCard(_sock, chatId, text, card) {
  const msg = { text };
  if (card?.sourceUrl) {
    const thumb = (await downloadCardThumb(card.thumbUrl)) || localBencanaThumb();
    msg.contextInfo = {
      externalAdReply: {
        title: card.title || "INFO BENCANA",
        body: card.body || "",
        sourceUrl: card.sourceUrl,
        mediaType: 1,
        renderLargerThumbnail: true,
        ...(thumb ? { thumbnail: thumb } : {}),
      },
    };
  }
  await _sock.sendMessage(chatId, msg);
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
        detailsUrl: p.url?.details || null,
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
      detail: f.properties.detail || null, // geojson detail API — sumber shakemap thumbnail
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
      st.fp ??= [];
      return st;
    }
  } catch { /* korup → mulai ulang */ }
  return { bmkg: null, gdacs: [], usgs: [], pending: [], firedJadwal: [], fp: [] };
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

export function globalWatcherKey(ownerJid) {
  return `global:${ownerJid}`;
}

/** Langganan GLOBAL: alert dikirim ke DM owner + semua grup yang bot masuk. */
export function addGlobalWatcher(ownerJid) {
  const subs = getWatchers();
  const key = globalWatcherKey(ownerJid);
  const cur = subs[key] || {};
  subs[key] = { ...cur, scope: "global", ownerJid, since: cur.since || new Date().toISOString() };
  saveWatchers(subs);
  return subs;
}

export function removeGlobalWatcher(ownerJid) {
  const subs = getWatchers();
  delete subs[globalWatcherKey(ownerJid)];
  saveWatchers(subs);
  return subs;
}

/** Return record global milik owner (atau null). */
export function hasGlobalWatcher(ownerJid) {
  const rec = getWatchers()[globalWatcherKey(ownerJid)];
  return rec?.scope === "global" ? rec : null;
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

/** Jenis bencana valid buat filter subscriber. */
export const BENCANA_JENIS = ["gempa", "banjir", "topan", "gunungapi", "kebakaran", "kering", "tsunami"];

export const BENCANA_SUMBER = ["bmkg", "usgs", "gdacs"];

/** Key sumber canonical dari event (ev.sumber string bebas). */
export function evSumberKey(ev) {
  const s = String(ev?.sumber || "");
  if (/BMKG/i.test(s)) return "bmkg";
  if (/USGS/i.test(s)) return "usgs";
  if (/GDACS/i.test(s)) return "gdacs";
  return null;
}

/**
 * Set filter sumber subscriber (bmkg/usgs/gdacs). kosong/null = semua sumber.
 * Berlaku di realtime & rangkuman, sama seperti filter jenis.
 */
export function setWatcherSumber(chatId, sources) {
  const subs = getWatchers();
  if (!subs[chatId]) throw new Error("Aktifkan dulu .bencanawatch on.");
  if (!Array.isArray(sources) || sources.length === 0) {
    delete subs[chatId].sumber; // reset → semua sumber
  } else {
    const bad = sources.filter((k) => !BENCANA_SUMBER.includes(k));
    if (bad.length) {
      throw new Error(`Sumber tidak dikenal: ${bad.join(", ")}. Pilihan: ${BENCANA_SUMBER.join(", ")} (atau 'semua')`);
    }
    subs[chatId].sumber = [...new Set(sources)];
  }
  saveWatchers(subs);
  return subs[chatId];
}

/**
 * Set filter jenis bencana subscriber. kinds kosong/null = semua jenis.
 * Filter berlaku di SEMUA mode — jenis yang gak dipilih gak dikirim
 * (realtime & rangkuman).
 */
export function setWatcherJenis(chatId, kinds) {
  const subs = getWatchers();
  if (!subs[chatId]) throw new Error("Aktifkan dulu .bencanawatch on.");
  if (!Array.isArray(kinds) || kinds.length === 0) {
    delete subs[chatId].jenis; // reset → semua jenis
  } else {
    const bad = kinds.filter((k) => !BENCANA_JENIS.includes(k));
    if (bad.length) {
      throw new Error(`Jenis tidak dikenal: ${bad.join(", ")}. Pilihan: ${BENCANA_JENIS.join(", ")} (atau 'semua')`);
    }
    subs[chatId].jenis = [...new Set(kinds)];
  }
  saveWatchers(subs);
  return subs[chatId];
}

/**
 * Set kepadatan alert subscriber (request owner 2026-09-07):
 *   • "utama" (default) — realtime tanpa cooldown, tapi tiap pembaruan
 *     pusat cukup 1 info TERPENTING saja (bukan semua → anti-spam).
 *   • "semua" — semua info dikirim tapi dikasih cooldown 10 menit
 *     per chat biar gak spam.
 */
export function setWatcherKirim(chatId, mode) {
  const subs = getWatchers();
  if (!subs[chatId]) throw new Error("Aktifkan dulu .bencanawatch on.");
  const m = String(mode || "").toLowerCase();
  const alias = { utama: "utama", penting: "utama", satu: "utama", semua: "semua", all: "semua", cooldown: "semua", col: "semua" };
  const val = alias[m];
  if (!val) throw new Error("Pilihan: utama (1 info terpenting per pembaruan, tanpa cooldown) atau semua (semua info, dikasih cooldown 10 menit).");
  subs[chatId].kirim = val;
  if (val === "utama") { subs[chatId].held = []; subs[chatId].lastAlertTs = 0; } // mulai bersih
  saveWatchers(subs);
  return subs[chatId];
}

function pendingLine(ev) {
  let head = ev.jenis || "Bencana";
  if (ev.mag) head += ` ${ev.mag} SR`;
  if (ev.level) head += ` — ${String(ev.level).replace(/ \(.*\)$/, "")}`;
  return `${head}${ev.desc ? `: ${ev.desc}` : ""}${ev.waktu ? ` (${ev.waktu})` : ""}`;
}

/** Kumpulkan event ke pending (buat mode jadwal). Cap 100. */
function pushPending(ev) {
  const st = loadState();
  st.pending.push({ ts: Date.now(), line: pendingLine(ev), lat: ev.lat, lon: ev.lon, kind: ev.kind, sumberKey: evSumberKey(ev) });
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
export async function fireJadwalDigest(_sock, chatId, sub, watcherKey = chatId) {
  const st = loadState();
  const since = sub.lastDigest || 0;
  // filter per subscriber: jenis & sumber — sama seperti realtime
  const jf = Array.isArray(sub.jenis) && sub.jenis.length;
  const sf = Array.isArray(sub.sumber) && sub.sumber.length;
  const events = (st.pending || []).filter((p) => p.ts > since)
    .filter((p) => !jf || (p.kind && sub.jenis.includes(p.kind)))
    .filter((p) => !sf || (p.sumberKey && sub.sumber.includes(p.sumberKey)));
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
  if (subs[watcherKey]) { subs[watcherKey].lastDigest = Date.now(); saveWatchers(subs); }
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
/**
 * Info section metadata LENGKAP — dipakai SEMUA alert bencana (generic
 * realtime, darurat, severe-saat-jadwal, peringatan wilayah):
 * jenis, magnitudo/kedalaman, level, waktu, lokasi, koordinat UTUH,
 * detail khusus event (potensi/dirasakan/flag tsunami), jarak dari
 * lokasi subscriber (kalau di-set), radius monitoring, sumber.
 * Link sumber & laporan ada di preview card (bukan di teks).
 */
export function buildInfoSection(ev, sub = null, distKm = null, dirLabel = null) {
  const fmtCoord = (n) => (typeof n === "number" ? (Number.isInteger(n) ? String(n) : String(+n.toFixed(4))) : String(n));
  const L = ["— Informasi kejadian —"];
  L.push(`Jenis      : ${ev.jenis || ev.kind || "Bencana"}`);
  if (ev.mag) L.push(`Magnitudo  : ${ev.mag} SR${ev.depth && ev.depth !== "-" ? `, kedalaman ${ev.depth}` : ""}`);
  if (ev.level) L.push(`Level      : ${ev.level}`);
  if (ev.waktu) L.push(`Waktu      : ${ev.waktu}`);
  L.push(`Terdeteksi : ${jamWib(Date.now())}`);
  if (ev.desc) L.push(`Lokasi     : ${ev.desc}${ev.country ? ` — ${ev.country}` : ""}`);
  if (ev.lat != null) L.push(`Koordinat  : ${fmtCoord(ev.lat)}, ${fmtCoord(ev.lon)}`);
  if (ev.potensi) L.push(`Potensi    : ${ev.potensi}`);
  if (ev.dirasakan) L.push(`Dirasakan  : ${ev.dirasakan}`);
  if (ev.tsunamiFlag) L.push("Tsunami    : ada flag potensi tsunami — waspada pesisir");
  if (distKm != null && sub?.city) L.push(`Jarak      : ±${Math.round(distKm)} km arah ${dirLabel} dari ${sub.city}`);
  if (sub?.radius) L.push(`Radius     : monitoring ${sub.radius} km`);
  L.push(`Sumber     : ${ev.sumber}`); // link sumber & laporan ada di preview card
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
    `\n\n${buildInfoSection(ev, sub, distKm, dir)}`;
  const card = eventCard(ev);
  card.title = `PERINGATAN — ${sub.city}`.slice(0, 60);
  card.body = `${ev.jenis || "Bencana"} ±${Math.round(distKm)} km dari ${sub.city}`.slice(0, 60);
  await sendWithCard(_sock, chatId, out, card);
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
// cache daftar grup (buat scope global) — refresh tiap 5 menit
let groupsCache = { ts: 0, list: [] };
async function allGroupJids() {
  const now = Date.now();
  if (groupsCache.list.length && now - groupsCache.ts < 5 * 60_000) return groupsCache.list;
  try {
    const g = await sock?.groupFetchAllParticipating?.();
    if (g && typeof g === "object") {
      groupsCache = { ts: now, list: Object.keys(g) };
    }
  } catch { /* keep cache lama */ }
  return groupsCache.list;
}

/**
 * Bentangkan watchers → daftar target [watcherKey, chatId, sub].
 * Record biasa → 1 target. Record scope global → DM owner + semua grup.
 * Chat yang punya record sendiri gak dobel (record sendiri menang).
 */
async function expandTargets() {
  const subs = getWatchers();
  const targets = [];
  const seen = new Set();
  for (const [chatId, sub] of Object.entries(subs)) {
    if (sub.scope === "global") continue;
    targets.push([chatId, chatId, sub]);
    seen.add(chatId);
  }
  const globals = Object.entries(subs).filter(([, s]) => s.scope === "global");
  for (const [key, sub] of globals) {
    if (!seen.has(sub.ownerJid)) { targets.push([key, sub.ownerJid, sub]); seen.add(sub.ownerJid); }
  }
  for (const [key, sub] of globals) {
    for (const gid of await allGroupJids()) {
      if (!seen.has(gid)) { targets.push([key, gid, sub]); seen.add(gid); }
    }
  }
  return targets;
}

/**
 * Tambah baris jarak ke generic alert buat subscriber yang punya lokasi
 * (biar info lengkap: seberapa jauh kejadian dari kota dia) — tanpa
 * harus masuk radius peringatan wilayah.
 */
function withDistanceLine(text, sub, ev) {
  if (sub?.lat == null || ev?.lat == null) return text;
  try {
    const d = haversineKm(sub.lat, sub.lon, ev.lat, ev.lon);
    const dir = bearingCompass(sub.lat, sub.lon, ev.lat, ev.lon);
    return `${text}\n\nJarak      : ±${Math.round(d)} km arah ${dir} dari ${sub.city}`;
  } catch {
    return text;
  }
}

// ─────────── FIX OWNER 2026-09-07: ANTI-SPAM BENCANAWATCH ───────────
// 1. Fingerprint anti-dobel lintas sumber: gempa yang sama muncul di
//    BMKG + USGS + GDACS → cukup 1 info (pusat pertama yang duluan kirim).
//    Kriteria: gempa, ±12 jam, |Δlat| & |Δlon| < 1.5°, |Δmag| < 0.4.
function fpDupe(st, ev) {
  if (!Array.isArray(st.fp)) st.fp = [];
  const now = Date.now();
  st.fp = st.fp.filter((x) => now - x.ts < 12 * 3600e3);
  if (!ev || ev.kind !== "gempa" || ev.lat == null) return false;
  return st.fp.some((x) =>
    Math.abs(x.lat - ev.lat) < 1.5 &&
    Math.abs(x.lon - ev.lon) < 1.5 &&
    (ev.mag == null || x.mag == null || Math.abs(x.mag - parseFloat(ev.mag)) < 0.4)
  );
}

function fpMark(st, ev) {
  if (!Array.isArray(st.fp)) st.fp = [];
  const mag = parseFloat(ev?.mag);
  st.fp.push({ lat: ev.lat, lon: ev.lon, mag: Number.isFinite(mag) ? mag : null, ts: Date.now() });
  st.fp = st.fp.slice(-60);
}

// 2. Thumbnail USGS — shakemap intensity.jpg dari detail geojson
//    (live verified 2026-09-07: 200 image/jpeg).
async function usgsThumbUrl(q) {
  try {
    if (!q.detail) return null;
    const det = await fetchJson(q.detail);
    const sm = det?.properties?.products?.shakemap?.[0]?.contents?.["download/intensity.jpg"]?.url;
    return sm || null;
  } catch { return null; }
}

// 3. Thumbnail GDACS — peta overview dari endpoint geteventdata
//    (live verified 2026-09-07: flood_overview_*.png 200 image/png).
//    downloadCardThumb bakal nolak kalau ternyata bukan image.
async function gdacsThumbUrl(e) {
  try {
    if (!e.detailsUrl) return null;
    const det = await fetchJson(e.detailsUrl);
    const urls = [...new Set(
      [...JSON.stringify(det).matchAll(/https?:\/\/[^"\\ ]*contentdata\/resources\/[^"\\ ]+?\.(?:png|jpg|jpeg)/gi)].map((m) => m[0])
    )];
    return urls.find((u) => /overview/i.test(u)) || urls[0] || null;
  } catch { return null; }
}

// ─────────── FIX OWNER 2026-09-07 (revisi 2): KEPADATAN ALERT ───────────
// Owner: jangan semua info dikirim jadi spam. 2 mode (sub.kirim):
//   • "utama" (DEFAULT) — otomatis realtime TANPA cooldown, tapi tiap
//     pembaruan pusat cuma kirim 1 INFO TERPENTING: paling dekat lokasi
//     user (dalam radius) > paling parah (severe) > pertama di daftar.
//     Info lain di periode itu gak dikirim (anti-spam).
//   • "semua" — semua info tetap dikirim tapi DIKASIH COOLDOWN 10 menit
//     per chat; yang dateng pas masih cooldown ditahan (brief), nyusul
//     nempel di pengiriman berikutnya.
const KIRIM_COOLDOWN_MS = 10 * 60_000;

function briefOf(ev) {
  return ev?._summary || pendingLine(ev);
}

/** Event terpenting buat subscriber: dekat lokasi > severe > pertama. */
function pickBestEvent(evs, sub) {
  if (sub?.lat != null) {
    const radius = sub.radius || DEFAULT_RADIUS_KM;
    const nears = evs
      .filter((ev) => ev?.lat != null)
      .map((ev) => ({ ev, d: haversineKm(sub.lat, sub.lon, ev.lat, ev.lon) }))
      .filter((x) => x.d <= radius)
      .sort((a, b) => a.d - b.d);
    if (nears.length) return nears[0].ev;
  }
  const sev = evs.filter((ev) => ev.isSevere);
  if (sev.length) return sev[0];
  return evs[0];
}

/** Teks alert penuh 1 event (format single-event: info section lengkap). */
function fullTextFor(ev, headerPrefix) {
  const lvl = String(ev.level || "").replace(/ \(.*\)$/, "");
  const lines = [
    `${headerPrefix}${lvl ? ` — ${lvl}` : ""}`,
    "",
    `${ev.jenis}${ev.country ? ` di ${ev.country}` : ""}`,
    ev.desc || "",
    "",
    buildInfoSection(ev),
  ];
  return lines.filter((l, i) => !(l === "" && lines[i - 1] === "")).join("\n");
}

/** Drain info tertahan (mode "semua" pas cooldown) → prepend ke teks. */
function drainHeld(sub) {
  const held = Array.isArray(sub.held) ? sub.held : [];
  sub.held = [];
  return held;
}

/**
 * Kirim beberapa event baru dari SATU pembaruan pusat sesuai kepadatan
 * subscriber: utama → 1 info terpenting saja; semua → best full + sisanya
 * brief, dengan cooldown per chat.
 */
export async function dispatchBest(evs, headerPrefix, card) {
  const subs = getWatchers();
  const hasJadwal = Object.values(subs).some((s) => (s.mode || "otomatis") === "jadwal");
  if (hasJadwal) for (const ev of evs) pushPending(ev);
  for (const [watcherKey, chatId, sub] of await expandTargets()) {
    try {
      const mode = sub.mode || "otomatis";
      let list = evs.slice();
      if (Array.isArray(sub.jenis) && sub.jenis.length) list = list.filter((ev) => sub.jenis.includes(ev.kind));
      if (Array.isArray(sub.sumber) && sub.sumber.length) list = list.filter((ev) => sub.sumber.includes(evSumberKey(ev)));
      if (!list.length) continue;

      if (mode === "jadwal") {
        // ATURAN OWNER: yang darurat tetap realtime, sisanya nunggu rangkuman
        const severe = list.filter((ev) => ev.isSevere);
        if (severe.length) {
          const best = pickBestEvent(severe, sub);
          const held = drainHeld(sub);
          let out = fullTextFor(best, headerPrefix);
          if (held.length) out = held.map((h) => `• ${h.line}`).join("\n") + "\n\n" + out;
          await sendWithCard(sock, chatId, withDistanceLine(out, sub, best), card);
          sub.lastAlertTs = Date.now();
          const subs2 = getWatchers();
          if (subs2[watcherKey]) { subs2[watcherKey].lastDigest = Date.now(); saveWatchers(subs2); }
        }
        continue;
      }

      let cand = list;
      if (mode === "darurat") {
        const radius = sub.radius || DEFAULT_RADIUS_KM;
        cand = list.filter((ev) =>
          ev.isSevere ||
          (sub.lat != null && ev.lat != null && haversineKm(sub.lat, sub.lon, ev.lat, ev.lon) <= radius)
        );
        if (!cand.length) continue;
      }

      const slowMode = (sub.kirim || "utama") !== "utama";
      const now = Date.now();
      const held = Array.isArray(sub.held) ? sub.held : [];
      if (slowMode && sub.lastAlertTs && now - sub.lastAlertTs < KIRIM_COOLDOWN_MS) {
        // mode "semua": lagi cooldown — semua event periode ini ditahan dulu
        for (const ev of cand) if (held.length < 10) held.push({ line: briefOf(ev), ts: now });
        sub.held = held;
        saveWatchers(subs);
        continue;
      }

      const best = pickBestEvent(cand, sub);
      let out = fullTextFor(best, headerPrefix);
      const rest = cand.filter((e) => e !== best);
      if (rest.length && slowMode) {
        out += "\n\nLainnya periode ini:\n" + rest.map((e) => `• ${briefOf(e)}`).join("\n");
      }
      const held2 = drainHeld(sub);
      if (held2.length) out = held2.map((h) => `• ${h.line}`).join("\n") + "\n\n" + out;
      await sendWithCard(sock, chatId, withDistanceLine(out, sub, best), card);
      sub.lastAlertTs = Date.now();
      saveWatchers(subs);
    } catch (e) {
      logger.error?.("bencana", `Gagal kirim (kepadatan) ke ${chatId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
}

async function dispatch(ev, genericText = null, card = null) {
  const subs = getWatchers();
  const hasJadwal = Object.values(subs).some((s) => (s.mode || "otomatis") === "jadwal");
  if (hasJadwal) pushPending(ev); // kumpulin buat rangkuman terjadwal
  for (const [watcherKey, chatId, sub] of await expandTargets()) {
    try {
      const mode = sub.mode || "otomatis";

      // filter jenis bencana (kalau di-set) — berlaku di semua mode
      if (Array.isArray(sub.jenis) && sub.jenis.length && !sub.jenis.includes(ev.kind)) continue;

      // filter sumber (kalau di-set) — bmkg / usgs / gdacs
      if (Array.isArray(sub.sumber) && sub.sumber.length && !sub.sumber.includes(evSumberKey(ev))) continue;

      const distKm =
        sub.lat != null && ev?.lat != null
          ? haversineKm(sub.lat, sub.lon, ev.lat, ev.lon)
          : Infinity;
      const radius = sub.radius || DEFAULT_RADIUS_KM;
      const near = distKm <= radius;

      if (mode === "jadwal") {
        // ATURAN OWNER: bencana DARURAT mesti realtime — gak nunggu rangkuman.
        if (ev.isSevere) {
          if (near) await sendRegionalAlert(sock, chatId, ev, sub);
          else if (genericText) await sendWithCard(sock, chatId, withDistanceLine(genericText, sub, ev), card);
          // tandai sudah diterima biar gak dobel muncul di rangkuman berikutnya
          const subs2 = getWatchers();
          if (subs2[watcherKey]) { subs2[watcherKey].lastDigest = Date.now(); saveWatchers(subs2); }
        }
        continue; // yg biasa nunggu jam rangkuman
      }

      if (mode === "darurat" && !near && !ev.isSevere) continue; // filter: cuman yg darurat

      if (near) {
        await sendRegionalAlert(sock, chatId, ev, sub);
      } else if (genericText) {
        // FIX OWNER 2026-09-07: kepadatan alert — mode "semua" dikasih
        // cooldown 10 menit per chat; yang dateng pas cooldown ditahan,
        // nyusul nempel di pengiriman berikutnya.
        const slowMode = (sub.kirim || "utama") !== "utama";
        const now = Date.now();
        const held = Array.isArray(sub.held) ? sub.held : [];
        if (slowMode && sub.lastAlertTs && now - sub.lastAlertTs < KIRIM_COOLDOWN_MS) {
          if (held.length < 10) { held.push({ line: briefOf(ev), ts: now }); sub.held = held; saveWatchers(subs); }
          continue;
        }
        let out = genericText;
        const held2 = drainHeld(sub);
        if (held2.length) out = held2.map((h) => `• ${h.line}`).join("\n") + "\n\n" + out;
        await sendWithCard(sock, chatId, withDistanceLine(out, sub, ev), card);
        sub.lastAlertTs = Date.now();
        saveWatchers(subs);
      }
    } catch (e) {
      logger.error?.("bencana", `Gagal kirim ke ${chatId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
}

/** Wrapper testable — pakai sock internal monitor. */
export async function dispatchBencanaEvent(ev, genericText = null, card = null) {
  return dispatch(ev, genericText, card);
}

/**
 * Cek jadwal tiap menit — kirim rangkuman buat subscriber mode jadwal
 * yang jam-nya cocok dengan sekarang (WIB). Anti dobel via state firedJadwal.
 */
async function jadwalTick() {
  try {
    const { hhmm, date } = nowWib();
    for (const [watcherKey, chatId, sub] of await expandTargets()) {
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
        const sent = await fireJadwalDigest(sock, chatId, sub, watcherKey);
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
      if (fpDupe(st, { kind: "gempa", lat: (() => { const [la] = String(g.Coordinates).split(",").map((s) => s.trim()); return +la; })(), lon: (() => { const [, lo] = String(g.Coordinates).split(",").map((s) => s.trim()); return +lo; })(), mag: g.Magnitude })) {
        return; // gempa ini udah pernah dikirim sumber lain (USGS/GDACS) — cukup 1 info
      }
      if (parseFloat(g.Magnitude) >= 5.0) {
        const [lat, lon] = String(g.Coordinates).split(",").map((s) => s.trim());
        const ev = {
          kind: "gempa", jenis: "Gempa Bumi",
          mag: g.Magnitude, depth: g.Kedalaman,
          level: parseFloat(g.Magnitude) >= 6.0 ? "AWAS" : "SIAGA",
          waktu: `${g.Tanggal} ${g.Jam}`,
          lat: +lat, lon: +lon, desc: g.Wilayah,
          potensi: g.Potensi || null, dirasakan: g.Dirasakan || null,
          sumber: "BMKG (data.bmkg.go.id)",
          isSevere: parseFloat(g.Magnitude) >= 6.5, // mode darurat: gempa besar lolos filter global
        };
        ev.thumbUrl = g._shakemapUrl; // shakemap → thumbnail preview card (bukan attachment terpisah)
        {
          const st2 = loadState();
          fpMark(st2, ev); // tandai biar USGS/GDACS gak dobelin gempa yang sama
          saveState(st2);
        }
        const lines = [
          "AUTO-ALERT BENCANA — GEMPA INDONESIA (BMKG)",
          "",
          `Gempa M ${g.Magnitude} SR terdeteksi — ${g.Wilayah}`,
          "",
          buildInfoSection(ev),
        ];
        await dispatch(ev, lines.join("\n"), eventCard(ev));
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
    // FIX OWNER 2026-09-07: baseline first-run — pas bencanawatch baru dinyalain,
    // SEMUA event GDACS lama duluan dianggap "sudah dilihat" (tanpa alert) biar
    // gak kebanjir pesan spam dari luar negeri. Alert cuma buat event BARU
    // sejak monitor aktif.
    if (!st.gdacsInit) {
      st.gdacsInit = true;
      st.gdacs = events.map((e) => e.id).slice(-200);
      saveState(st);
      return;
    }
    const fresh = events.filter((e) => !st.gdacs.includes(e.id));
    if (fresh.length) {
      st.gdacs.push(...fresh.map((e) => e.id));
      st.gdacs = st.gdacs.slice(-200);
      saveState(st);
      const evs = [];
      for (const e of fresh) {
        const t = GDACS_TYPES[e.type] ?? { label: e.type, icon: "⚠️" };
        const a = ALERT_STYLE[e.alertlevel];
        const ev = {
          kind: KIND_BY_TYPE[e.type] || "default",
          jenis: t.label,
          level: `${a.label} (${a.icon})`,
          waktu: e.fromdate ? `mulai ${jamWib(e.fromdate)}` : (e.desc || ""),
          lat: e.lat, lon: e.lon, desc: e.desc || e.name,
          country: shortCountry(e.country) || null,
          sumber: "GDACS (EU/UN) — gdacs.org",
          report: e.report,
          isSevere: e.alertlevel === "Red", // mode darurat: level AWAS lolos filter global
        };
        if (fpDupe(st, ev)) continue; // gempa yang sama udah dikirim pusat lain — cukup 1 info
        ev.thumbUrl = await gdacsThumbUrl(e); // peta overview GDACS → thumbnail card
        ev._summary = `${t.icon} ${t.label}${ev.country ? ` — ${ev.country}` : ""} — ${a.label}${ev.desc ? ` — ${ev.desc.slice(0, 60)}` : ""}`;
        evs.push(ev);
      }
      if (evs.length === 1) {
        // 1 event baru → format lama lengkap (info section + AI regional)
        const ev = evs[0];
        const lines = [
          `AUTO-ALERT BENCANA GLOBAL — LEVEL ${String(ev.level).replace(/ \(.*\)$/, "")}`,
          "",
          `${ev.jenis}${ev.country ? ` di ${ev.country}` : ""}`,
          ev.desc,
          "",
          buildInfoSection(ev),
        ];
        await dispatch(ev, lines.join("\n"), eventCard(ev));
      } else if (evs.length > 1) {
        // FIX OWNER (revisi 2026-09-07): jangan semua info dikirim (spam) —
        // tiap pembaruan cukup 1 info TERPENTING per subscriber (mode utama),
        // atau semua + cooldown 10 mnt (mode semua). Atur: .bencanawatch kirim.
        const top = [...evs].sort((a, b) => Number(b.isSevere) - Number(a.isSevere))[0];
        await dispatchBest(evs, "AUTO-ALERT BENCANA GLOBAL", eventCard(top));
      }
      const st2 = loadState();
      for (const ev of evs) fpMark(st2, ev);
      saveState(st2);
    }
  } catch (e) {
    logger.error?.("bencana", "GDACS error: " + e.message);
  }
  try {
    const quakes = await getUsgs(6.0, 15);
    const st = loadState();
    // FIX OWNER 2026-09-07: baseline first-run — sama kayak GDACS, daftar gempa
    // lama pas monitor baru nyala dianggap "sudah dilihat" (tanpa spam alert).
    if (!st.usgsInit) {
      st.usgsInit = true;
      st.usgs = quakes.map((q) => String(q.id)).slice(-200);
      saveState(st);
      return;
    }
    const fresh = quakes.filter((q) => !st.usgs.includes(String(q.id)));
    if (fresh.length) {
      st.usgs.push(...fresh.map((q) => String(q.id)));
      st.usgs = st.usgs.slice(-200);
      saveState(st);
      const evs = [];
      for (const q of fresh) {
        const ev = {
          kind: "gempa", jenis: "Gempa Bumi (global)",
          mag: q.mag?.toFixed(1), depth: "-",
          level: q.tsunami ? "AWAS (flag tsunami)" : "SIAGA",
          waktu: jamWib(q.time),
          lat: q.lat, lon: q.lon, desc: q.place,
          tsunamiFlag: !!q.tsunami,
          sumber: "USGS (earthquake.usgs.gov)",
          report: q.url,
          isSevere: q.mag >= 7.0, // mode darurat: gempa besar global lolos filter
        };
        if (fpDupe(st, ev)) continue; // gempa yang sama udah dikirim BMKG/GDACS — cukup 1 info
        ev.thumbUrl = await usgsThumbUrl(q); // shakemap intensity.jpg → thumbnail card
        ev._summary = `🌍 Gempa global M${ev.mag} — ${q.place} — ${String(ev.level).replace(/ \(.*\)$/, "")}`;
        evs.push(ev);
      }
      if (evs.length === 1) {
        const ev = evs[0];
        const lines = [
          "AUTO-ALERT GEMPA GLOBAL — M 6.0+ (USGS)",
          "",
          `Gempa global M${ev.mag} terdeteksi — ${ev.desc}`,
          "",
          buildInfoSection(ev),
        ];
        await dispatch(ev, lines.join("\n"), eventCard(ev));
      } else if (evs.length > 1) {
        // FIX OWNER (revisi 2026-09-07): 1 info terpenting per pembaruan
        // (mode utama) / semua + cooldown 10 mnt (mode semua).
        const top = [...evs].sort((a, b) => Number(b.isSevere) - Number(a.isSevere))[0];
        await dispatchBest(evs, "AUTO-ALERT GEMPA GLOBAL (USGS)", eventCard(top));
      }
      const st2 = loadState();
      for (const ev of evs) fpMark(st2, ev);
      saveState(st2);
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

/**
 * FIX OWNER 2026-09-07: kesehatan monitor buat debugging "kok gak masuk
 * alertnya" — status polling per sumber + jalan/gak, biar owner bisa
 * verifikasi monitor beneran hidup tanpa nebak.
 */
export function getMonitorHealth() {
  const st = loadState();
  return {
    running: isRunning(),
    totalWatcher: watcherCount(),
    bmkgLastCheck: st.bmkg || null, // null = belum sempat poll sekali pun
    gdacsBaselineReady: !!st.gdacsInit,
    usgsBaselineReady: !!st.usgsInit,
    pollBmkgSec: POLL_FAST_MS / 1000,
    pollGlobalSec: POLL_SLOW_MS / 1000,
  };
}
