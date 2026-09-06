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
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { getDatabase } from "./nova-database.js";
import { logger } from "./nova-logger.js";

const GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const BMKG_URL = "https://data.bmkg.go.id/DataMKG/TEWS";

const POLL_FAST_MS = 60_000;   // gempa BMKG
const POLL_SLOW_MS = 300_000;  // GDACS + USGS global

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
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch { /* korup → mulai ulang */ }
  return { bmkg: null, gdacs: [], usgs: [] };
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
  subs[chatId] = { since: new Date().toISOString() };
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

// ───────────────────────────── monitor auto-alert ─────────────────────────────

let sock = null;
let fastTimer = null;
let slowTimer = null;

function isRunning() {
  return !!(fastTimer || slowTimer);
}

async function broadcast(text, imageUrl = null) {
  const subs = getWatchers();
  for (const chatId of Object.keys(subs)) {
    try {
      await sock.sendMessage(chatId, { text });
      if (imageUrl) await sock.sendMessage(chatId, { image: { url: imageUrl } });
    } catch (e) {
      logger.error?.("bencana", `Gagal kirim ke ${chatId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
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
        await broadcast(lines.join("\n"), g._shakemapUrl);
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
        await broadcast(lines.join("\n"));
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
        await broadcast(lines.join("\n"));
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
  logger.success?.("bencana", `Monitor aktif (${watcherCount()} chat — BMKG 60s, GDACS+USGS 300s)`);
  return true;
}

/** Stop timer — dipanggil pas subscriber terakhir off. */
export function stopBencanaMonitor() {
  if (fastTimer) clearInterval(fastTimer);
  if (slowTimer) clearInterval(slowTimer);
  fastTimer = slowTimer = null;
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
