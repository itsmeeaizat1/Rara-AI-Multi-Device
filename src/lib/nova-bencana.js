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
import { mergeAutoTargets } from "./nova-auto-target.js";
import path from "node:path";
import { getDatabase } from "./nova-database.js";
import { logger } from "./nova-logger.js";
import { aiChainChat } from "./nova-ai-fallback.js";

const GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const USGS_DAY_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
const BMKG_URL = "https://data.bmkg.go.id/DataMKG/TEWS";

const POLL_FAST_MS = 180_000;  // gempa BMKG — 3 menit (ala script owner 8 Sep 2026)
const POLL_SLOW_MS = 180_000; // GDACS + USGS global — 3 menit
const VOLCANO_POLL_MS = 600_000; // status gunung api PVMBG MAGMA — 10 menit

const DEFAULT_RADIUS_KM = 300; // radius peringatan wilayah (bisa di-set per user)
// UPGRADE 15 Sep 2026 (request owner "default minimal alertnya di sekitar
// minimal 3.5mg klo 5.0mg jarang soalnya digempa"): ambang magnitudo
// minimum alert gempa per subscriber — DEFAULT 3.5 SR (M5.0 jarang di
// wilayah yang sering digempa). Bisa diatur: .bencanawatch minmag <M>.
export const DEFAULT_MIN_MAG = 3.5;
export const MIN_MAG_FLOOR = 2.0; // batas bawah yang boleh di-set
export const MIN_MAG_CEIL = 9.0; // batas atas
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

// PENTING (15 Sep 2026): let + seam — e2e test bisa arahin state file ke
// /tmp biar gak nyetag state produksi.
let STATE_FILE = path.join(process.cwd(), "src", "data", "bencana-state.json");
export function _setBencanaStateFileForTest(f) { STATE_FILE = f || STATE_FILE; }

// ───────────────────────────── util ─────────────────────────────

const FETCH_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36";
export const FETCH_RETRY_DELAY_MS = 2000; // jeda antar percobaan (403 BMKG flaky — ketemu 10 Sep 2026)

/**
 * fetch JSON dengan retry opsional. RETRY cuma buat error yang layak
 * dicoba lagi: HTTP 403/408/429/5xx atau kegagalan jaringan.
 * (403 BMKG data.bmkg.go.id lagi FLAKY — kadang Forbidden beberapa
 * request sebelum balik normal lagi, ketemu live 10 Sep 2026.)
 */
export async function fetchJsonWithRetry(url, timeoutMs = 15000, retries = 0, doFetch = null) {
  const impl = doFetch || ((u, opts) => fetch(u, opts));
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await impl(url, { signal: ctrl.signal, headers: { "User-Agent": FETCH_UA } });
      if (!res.ok) {
        const retryable = res.status === 403 || res.status === 408 || res.status === 429 || res.status >= 500;
        if (!retryable) throw new Error(`HTTP ${res.status} dari ${new URL(url).hostname}`);
        lastErr = new Error(`HTTP ${res.status} dari ${new URL(url).hostname}`);
        if (attempt < retries) { await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS)); continue; }
        throw lastErr;
      }
      return await res.json();
    } catch (e) {
      if (String(e?.message || "").startsWith("HTTP ")) throw e; // 4xx non-retryable → langsung lempar
      lastErr = e;
      if (attempt < retries) { await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS)); continue; }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr || new Error("fetch gagal: " + url);
}

async function fetchJson(url, timeoutMs = 15000, retries = 0) {
  return fetchJsonWithRetry(url, timeoutMs, retries, null);
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
  } catch (e) { console.error("[bencana] ❌ Gagal unduh thumbnail card:", e?.message || e); return null; }
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
  } catch (e) { console.error("[bencana] ❌ Gagal baca thumbnail lokal:", e?.message || e); }
  return null;
}

/** URL valid buat preview card — link rusak bikin card gak dirender WA. */
function safeSourceUrl(u) {
  try {
    const url = new URL(String(u || ""));
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch (e) { console.error("[bencana] ❌ sourceUrl card gak valid:", e?.message || e); }
  return null;
}

/** Bangun info preview card dari event: title, body, sourceUrl, thumbUrl. */
export function eventCard(ev) {
  const su = evSumberKey(ev);
  let sourceUrl = null;
  if (su === "bmkg") sourceUrl = "https://data.bmkg.go.id";
  if (su === "usgs") sourceUrl = safeSourceUrl(ev.report) || "https://earthquake.usgs.gov";
  if (su === "gdacs") sourceUrl = safeSourceUrl(ev.report) || "https://www.gdacs.org";
  if (su === "pvmbg") sourceUrl = safeSourceUrl(ev.laporanUrl) || "https://magma.esdm.go.id";
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

/**
 * USGS feed harian 4.5_day — auto-alert pakai ini (ala script owner 8 Sep 2026):
 * signifikan = magnitudo >= 5.0 DAN alert level != green.
 * Shape sama kayak getUsgs (+ field alert) biar thumb/dedup tetap jalan.
 */
export async function getUsgsDay() {
  const d = await fetchJson(USGS_DAY_URL);
  return (d?.features ?? [])
    .filter((f) => {
      const m = f.properties?.mag || 0;
      const a = f.properties?.alert || null;
      // logika script owner: M5+ dengan alert level (yellow/orange/red).
      // CATATAN: alert USGS bisa null (belum dievaluasi PAGER) — supaya gempa
      // BESAR gak lolos cuma gara-gara belum dievaluasi, M6+ tetap masuk.
      return (a && a !== "green" && m >= 5.0) || m >= 6.0;
    })
    .map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      return {
        id: f.id,
        mag: f.properties.mag,
        place: f.properties.place || "—",
        time: f.properties.time,
        tsunami: f.properties.tsunami === 1,
        alert: f.properties.alert || "green",
        url: f.properties.url || null,
        detail: f.properties.detail || null, // dipakai shakemap thumbnail
        lat, lon,
      };
    });
}

// ───────────────────────────── provider: BMKG ─────────────────────────────

export async function getBmkgLatest() {
  const d = await fetchJson(`${BMKG_URL}/autogempa.json`, 15000, 2); // BMKG flaky 403 → retry 2x
  const g = d?.Infogempa?.gempa;
  if (!g?.DateTime) return null;
  g._shakemapUrl = g.Shakemap ? `${BMKG_URL}/${g.Shakemap}` : null;
  return g;
}
// ───────────────────────────── provider: PVMBG MAGMA (gunung api) ─────────────
// Sumber LOKAL resmi status gunung api Indonesia (request owner 10 Sep 2026:
// "gempa dan gunung api info terbaru"). Halaman server-rendered Laravel
// magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas — SATU tabel besar dengan
// blok rowspan per level (IV Awas → III Siaga → II Waspada → I Normal).
// API JSON lama (/api/v1/gunung-api) udah 404 — parsing HTML satu-satunya.
const MAGMA_URL = "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas";
export const MAGMA_LEVELS = {
  4: { romawi: "Level IV", label: "AWAS", icon: "\u{1F534}" },
  3: { romawi: "Level III", label: "SIAGA", icon: "\u{1F7E0}" },
  2: { romawi: "Level II", label: "WASPADA", icon: "\u{1F7E1}" },
  1: { romawi: "Level I", label: "NORMAL", icon: "\u{1F7E2}" },
};
const MAGMA_BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
};

// seam HTTP buat e2e (inject)
let magmaHttp = null;
export function setMagmaHttp(fn) { magmaHttp = fn; }
export function resetMagmaHttp() { magmaHttp = null; }

async function fetchHtml(url, timeoutMs = 20000, retries = 1) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = magmaHttp
        ? await magmaHttp(url)
        : await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: MAGMA_BROWSER_HEADERS });
      if (!res.ok) {
        const retryable = res.status === 403 || res.status === 408 || res.status === 429 || res.status >= 500;
        if (!retryable) throw new Error(`HTTP ${res.status} dari ${new URL(url).hostname}`);
        lastErr = new Error(`HTTP ${res.status} dari ${new URL(url).hostname}`);
        if (attempt < retries) { await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS)); continue; }
        throw lastErr;
      }
      return await res.text();
    } catch (e) {
      if (String(e?.message || "").startsWith("HTTP ")) throw e;
      lastErr = e;
      if (attempt < retries) { await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS)); continue; }
      throw e;
    }
  }
  throw lastErr || new Error("fetch html gagal: " + url);
}

/** Parse halaman tingkat-aktivitas MAGMA → { ringkas, list }. */
export function parseMagmaPage(html) {
  const t = String(html || "");
  // kartu ringkasan: <h1>N</h1> <p>Level X (Label)</p>
  const ringkas = {};
  for (const m of t.matchAll(/<h1>(\d+)<\/h1>\s*<p>(Level (?:IV|III|II|I) \([^)]+\))<\/p>/g)) {
    ringkas[m[2]] = +m[1];
  }
  // anchor section: <td rowspan="N"> … <a …>Level III (Siaga)</a>
  const sections = [];
  const LEVEL_BY_LABEL = { "Level IV (Awas)": 4, "Level III (Siaga)": 3, "Level II (Waspada)": 2, "Level I (Normal)": 1 };
  for (const m of t.matchAll(/<td rowspan="\d+"[^>]*>\s*<a[^>]*>(Level (?:IV|III|II|I) \([^)]+\))<\/a>/g)) {
    sections.push({ label: m[1], idx: m.index });
  }
  const list = [];
  for (const m of t.matchAll(/([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019.\- ]*?)\s+-\s+([A-Za-z][A-Za-z ]*?)\s*<a href="(https:\/\/magma\.esdm\.go\.id\/v1\/gunung-api\/laporan\/(\d+)[^"]*)"/g)) {
    let levelNum = null;
    for (const s of sections) if (s.idx < m.index) levelNum = LEVEL_BY_LABEL[s.label] ?? null;
    list.push({
      nama: m[1].trim(), prov: m[2].trim(),
      levelNum, levelLabel: levelNum != null ? MAGMA_LEVELS[levelNum].label : null,
      laporanUrl: m[3], laporanId: +m[4],
    });
  }
  return { ringkas, list };
}

/**
 * Parse koordinat dari halaman laporan gunung (per-gunung).
 * Format MAGMA: "Latitude -7.542&deg;LU, Longitude 110.442&deg;BT" —
 * angka udah bertanda (Merapi dicap LU tapi nilainya -7.542 — quirk
 * label PVMBG) → PERCAYAI TANDA ANGKA; koreksi cuma kalau label
 * jelas bertentangan DAN angka positif (LS/BB positif → negatif).
 */
export function parseMagmaCoords(html) {
  const t = String(html || "").replace(/&deg;/g, "\u00B0").replace(/&nbsp;/g, " ");
  const m = t.match(/Latitude\s+(-?\d+(?:\.\d+)?)\s*\u00B0?\s*(LU|LS)?\D{0,40}?Longitude\s+(-?\d+(?:\.\d+)?)\s*\u00B0?\s*(BT|BB)?/i);
  if (!m) return null;
  let lat = +m[1];
  let lon = +m[3];
  if (/^LS$/i.test(m[2] || "") && lat > 0) lat = -lat; // Lintang Selatan positif → negatif
  if (/^BB$/i.test(m[4] || "") && lon > 0) lon = -lon; // Bujur Barat positif → negatif
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** Ambil daftar gunung api + status PVMBG (live). */
export async function getMagmaVolcanoes() {
  const html = await fetchHtml(MAGMA_URL, 20000, 2);
  const page = parseMagmaPage(html);
  if (!page.list.length) throw new Error("parse MAGMA 0 gunung api — halaman berubah?");
  return page;
}

// ───────────────────────────── tick: perubahan status gunung api ─────────────

/**
 * Diff status gunung api terhadap state tersimpan (PURE — biar testable).
 * Baseline pertama silent (anti-spam, pola sama kayak gdacsInit).
 * Gunung BARU masuk list: dicatat; alert cuma kalau masuk di >= SIAGA
 * (dianggap "naik" dari Normal).
 */
export function diffVolcanoState(st, list) {
  st.volcano ??= { baseline: false, levels: {}, coords: {} };
  const changes = [];
  if (!st.volcano.baseline) {
    for (const v of list) st.volcano.levels[v.nama] = { num: v.levelNum, id: v.laporanId };
    st.volcano.baseline = true;
    return { changes, baseline: true };
  }
  for (const v of list) {
    const prev = st.volcano.levels[v.nama];
    st.volcano.levels[v.nama] = { num: v.levelNum, id: v.laporanId };
    if (!prev) {
      if ((v.levelNum ?? 1) >= 3) changes.push({ v, prevNum: 1 }); // pendatang baru langsung Siaga+ → alert
      continue;
    }
    if (v.levelNum !== prev.num) changes.push({ v, prevNum: prev.num });
  }
  return { changes };
}

/** Koordinat gunung (cache permanen — koordinat gunung gak berubah). */
async function volcanoCoords(v, st) {
  st.volcano.coords ??= {};
  if (st.volcano.coords[v.nama] === undefined) {
    let c = null;
    try { c = parseMagmaCoords(await fetchHtml(v.laporanUrl, 15000, 1)); } catch (e) { console.error("[bencana] ❌ Gagal parse koordinat gunung:", e?.message || e); c = null; }
    st.volcano.coords[v.nama] = c || false; // false = udah nyoba gak dapet — jangan ulangin
    saveState(st);
  }
  return st.volcano.coords[v.nama] || null;
}

async function handleVolcanoChange(sendSock, { v, prevNum }, st) {
  const lv = MAGMA_LEVELS[v.levelNum] || MAGMA_LEVELS[1];
  const prevL = MAGMA_LEVELS[prevNum] || MAGMA_LEVELS[1];
  const up = v.levelNum > prevNum;
  const coords = await volcanoCoords(v, st);
  const ev = {
    kind: "gunungapi", jenis: "Gunung Api", mag: null,
    level: lv.label, nama: v.nama, prov: v.prov,
    waktu: jamWib(Date.now()),
    lat: coords?.lat, lon: coords?.lon,
    desc: `${v.nama} — ${v.prov}`,
    sumber: "PVMBG MAGMA Indonesia",
    isSevere: v.levelNum >= 4, // naik AWAS = darurat realtime (menembus mode jadwal)
    laporanUrl: v.laporanUrl,
  };
  const lines = [
    `\u{1F30B} ${up ? "\u2B06\uFE0F" : "\u2B07\uFE0F"} STATUS GUNUNG API — PVMBG`,
    "",
    `Gunung : ${v.nama}`,
    `Status  : ${lv.icon} ${lv.romawi} (${lv.label})`,
    `Sebelum : ${prevL.icon} ${prevL.label}`,
    `Wilayah : ${v.prov}`,
    coords ? `Posisi   : ${coords.lat}, ${coords.lon}` : null,
    "",
    up
      ? (v.levelNum >= 3 ? "Peningkatan aktivitas signifikan — ikuti arahan PVMBG dan hindari radius bahaya." : "Peningkatan aktivitas terdeteksi — pantau info resmi PVMBG.")
      : "Aktivitas menurun — tetap pantau perkembangan resmi PVMBG.",
    "",
    "Sumber: PVMBG MAGMA Indonesia",
  ].filter(Boolean);
  // routing: perubahan yang menyentuh SIAGA/AWAS (naik ke situ ATAU turun
  // dari situ) = alert GLOBAL (semua subscriber jenis gunungapi).
  // Perubahan Waspada↔Normal = cuma buat subscriber yang lokasinya DEKAT
  // gunung (radius, butuh koordinat — tanpa koordinat dilewatin).
  if ((v.levelNum ?? 1) >= 3 || prevNum >= 3) {
    await dispatch(sendSock, ev, lines.join("\n"), eventCard(ev));
  } else if (coords) {
    await dispatchNearEvent(sendSock, ev, "gunungapi", "pvmbg");
  }
}

// UPGRADE 15 Sep 2026 (syarat owner): sock PARAMETER + log siklus + level
// gunung dipersist SETELAH alert terkirim (dulu dicatat ASAP → kirim gagal
// = perubahan status hilang, gak pernah dinotifkin).
async function volcanoTick(sendSock) {
  const s = sendSock || sock;
  if (!s) { console.error("[bencana] ❌ [volcanoTick] koneksi WhatsApp TIDAK ADA — siklus dilewati"); return; }
  try {
    console.log(`[bencana] 🔄 [volcanoTick] cek status gunung api PVMBG jalan (${VOLCANO_POLL_MS / 1000}s sekali)…`);
    const page = await getMagmaVolcanoes();
    const st = loadState();
    const { changes, baseline } = diffVolcanoState(st, page.list);
    if (baseline || !changes.length) {
      saveState(st); // baseline/tanpa perubahan → gak ada notifikasi → aman langsung simpan
      if (baseline) console.log(`[bencana] 🔄 [volcanoTick] baseline gunung api dicatat (${page.list?.length ?? 0} gunung)`);
      else console.log("[bencana] 🔄 [volcanoTick] tidak ada perubahan status gunung api");
      return;
    }
    console.log(`[bencana] 🔄 [volcanoTick] ${changes.length} perubahan status gunung api terdeteksi`);
    let errors = 0;
    for (const ch of changes) {
      try { await handleVolcanoChange(s, ch, st); }
      catch (e) { errors++; console.error(`[bencana] ❌ [volcanoTick] Gagal kirim status gunung ${ch.v.nama}:`, e?.message || e); logger.error?.("bencana", `Gagal kirim status gunung ${ch.v.nama}: ${e.message}`); }
      await new Promise((r) => setTimeout(r, 800));
    }
    if (errors > 0) {
      // ada yang gagal → state level BELUM disimpan → perubahan di-tick ulang nanti
      console.error(`[bencana] ❌ [volcanoTick] ${errors} alert gagal terkirim — perubahan level BELUM dipersist, dicoba lagi ${VOLCANO_POLL_MS / 1000}s lagi`);
    } else {
      saveState(st); // SYARAT OWNER #4: persist SETELAH semua alert terkirim
      console.log("[bencana] ✅ [volcanoTick] perubahan status terkirim, level dipersist (tahan restart)");
    }
  } catch (e) {
    console.error("[bencana] ❌ [volcanoTick] MAGMA error:", e?.message || e, e?.stack || "");
    logger.error?.("bencana", "MAGMA error: " + e.message);
  }
}


// ─────────── provider EWS: JEPANG (JMA) — live verified 8 Sep 2026 ───────────
// URL script owner (jma.go.jp/en/quake/earthquake.json) TIDAK ADA → HTML redirect.
// API resmi yang bener dipakai halaman gempa JMA: /bosai/quake/data/list.json.
// Format: array gempa terbaru; cod "+32.5+130.5-10000/" = lat+lon-kedalaman(meter);
// mag string; anm = nama episenter (Jepang); at = waktu ISO (+09:00).
export async function getJmaLatest(limit = 12) {
  const raw = await fetchJson("https://www.jma.go.jp/bosai/quake/data/list.json", 9000);
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit).map((f) => {
    const m = /^\s*([+-]?\d+(?:\.\d+)?)([+-]?\d+(?:\.\d+)?)(-?\d+)?\/?\s*$/.exec(String(f.cod || ""));
    const lat = m ? parseFloat(m[1]) : null;
    const lon = m ? parseFloat(m[2]) : null;
    const depthKm = m && m[3] != null ? Math.round(Math.abs(parseFloat(m[3])) / 100) : null; // meter → km
    const ts = f.at ? new Date(f.at).getTime() : null;
    return {
      key: `jma_${f.eid || (f.at || "")}_${(f.cod || "").trim()}`,
      provider: "JEPANG",
      mag: parseFloat(f.mag) || 0,
      depth: depthKm != null ? `${depthKm} km` : "N/A",
      wilayah: f.anm ? `${f.anm} (Jepang)` : "Jepang",
      tsunami: "Tidak ada info JMA",
      lat, lon,
      waktu: ts ? jamWib(ts) : "N/A",
    };
  }).filter((x) => x.lat != null && x.lon != null);
}

// ─────────── provider EWS: GLOBAL (EMSC) — live verified 8 Sep 2026 ───────────
// Script owner nyuruh pake China (CEA) — tapi CEA gak punya JSON feed publik
// (ceic.cn = domain parkir, ceic.ac.cn = SPA tanpa API). Sebagai gantinya:
// EMSC SeismicPortal (Eropa) yang agregasi SEMUA agensi dunia REAL-TIME —
// termasuk gempa China (auth CEA), Jepang, Indonesia (auth BMKG — verified:
// gempa Flores M3.0 ke-echo ke EMSC). Nama provider "GLOBAL".
export async function getEmscLatest(limit = 15) {
  const d = await fetchJson("https://www.seismicportal.eu/fdsnws/event/1/query?limit=30&format=json&orderby=time", 9000);
  const feats = (d?.features ?? []).filter((f) => f.properties?.evtype === "ke");
  return feats.slice(0, limit).map((f) => {
    const pr = f.properties || {};
    const [lon, lat] = f.geometry?.coordinates || [null, null];
    const depthKm = pr.depth != null ? Math.abs(parseFloat(pr.depth)) : null;
    const ts = pr.time ? new Date(pr.time).getTime() : null;
    return {
      key: `emsc_${pr.unid || f.id}`,
      provider: "GLOBAL",
      mag: parseFloat(pr.mag) || 0,
      depth: depthKm != null ? `${depthKm} km` : "N/A",
      wilayah: pr.flynn_region || "Tidak diketahui",
      tsunami: "Tidak ada",
      lat, lon,
      waktu: ts ? jamWib(ts) : "N/A",
    };
  }).filter((x) => x.lat != null && x.lon != null);
}

// ───────────────────────────── state & subscribers ─────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const st = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      st.pending ??= [];
      st.firedJadwal ??= [];
      st.fp ??= [];
      st.ews ??= { bootstrapped: false, seen: [], history: [] };
      st.ews.seen ??= [];
      st.ews.history ??= [];
      st.volcano ??= { baseline: false, levels: {}, coords: {} };
      return st;
    }
  } catch (e) { console.error("[bencana] ❌ state file korup/tak terbaca, mulai ulang state baru:", e?.message || e); }
  return { bmkg: null, gdacs: [], usgs: [], pending: [], firedJadwal: [], fp: [], ews: { bootstrapped: false, seen: [], history: [] }, volcano: { baseline: false, levels: {}, coords: {} } };
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
  } catch (e) { console.error("[bencana] ❌ Gagal baca subscriber dari db:", e?.message || e); return {}; }
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
  try { cache = getDatabase().setting("bencanaGeoCache") || {}; } catch (e) { console.error("[bencana] ❌ Gagal baca cache geocode:", e?.message || e); }
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
    try { getDatabase().setting("bencanaGeoCache", cache); } catch (e) { console.error("[bencana] ❌ Gagal simpan cache geocode:", e?.message || e); }
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

/**
 * UPGRADE 15 Sep 2026 (request owner: "radius bsa diset bebas lbh dr 2000
 * smpai ke luar negeri"): batas lama 2000 km DIBUKA jadi 50-20000 km.
 * 20000 km > setengah keliling bumi (±20015 km) = jarak maksimum haversine
 * antara 2 titik manapun di bumi → "dunia" mencakup SEMUA benua. Keyword
 * dunia/global/semua/dunia21 → 20000 (seluruh dunia).
 */
export const RADIUS_MAX_KM = 20000; // > jarak maksimum 2 titik di bumi (±20015 km)
export function parseRadiusKm(km) {
  const raw = String(km ?? "").toLowerCase().trim();
  if (["dunia", "global", "semua", "world", "worldwide", "internasional", "luarnegeri", "luar-negeri"].includes(raw)) return RADIUS_MAX_KM;
  const r = Math.round(Number(raw));
  return r;
}
export function setWatcherRadius(chatId, km) {
  const r = parseRadiusKm(km);
  if (!r || r < 50 || r > RADIUS_MAX_KM) throw new Error(`Radius harus 50-${RADIUS_MAX_KM} km (20000 = seluruh dunia). Contoh: .bencanawatch radius 500 | .bencanawatch radius dunia`);
  const subs = getWatchers();
  const cur = subs[chatId];
  if (!cur) throw new Error("Aktifkan dulu .bencanawatch on sebelum set radius.");
  subs[chatId] = { ...cur, radius: r };
  saveWatchers(subs);
  return subs[chatId];
}

/**
 * Ambang magnitudo minimum alert gempa per subscriber (default 3.5 —
 * request owner 15 Sep 2026). Mempengaruhi: near-quake (gempa dekat) DAN
 * EWS gempa. Gempa besar global M6.5+ TETAP dikirim (pengaman darurat).
 * Contoh: .bencanawatch minmag 3.0 | .bencanawatch minmag reset
 */
export function setWatcherMinMag(chatId, mag) {
  const subs = getWatchers();
  const cur = subs[chatId];
  if (!cur) throw new Error("Aktifkan dulu .bencanawatch on sebelum set minmag.");
  if (/^(reset|default|bawaan)$/i.test(String(mag ?? ""))) {
    const { minMag: _drop, ...rest } = cur;
    subs[chatId] = rest;
    saveWatchers(subs);
    return subs[chatId];
  }
  const m = parseFloat(mag);
  if (!Number.isFinite(m) || m < MIN_MAG_FLOOR || m > MIN_MAG_CEIL) {
    throw new Error(`Magnitudo minimum harus ${MIN_MAG_FLOOR}-${MIN_MAG_CEIL} SR (default ${DEFAULT_MIN_MAG}). Contoh: .bencanawatch minmag 3.5 | .bencanawatch minmag reset`);
  }
  subs[chatId] = { ...cur, minMag: Math.round(m * 10) / 10 };
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

export const BENCANA_SUMBER = ["bmkg", "usgs", "gdacs", "pvmbg"];

/** Key sumber canonical dari event (ev.sumber string bebas). */
export function evSumberKey(ev) {
  const s = String(ev?.sumber || "");
  if (/BMKG/i.test(s)) return "bmkg";
  if (/USGS/i.test(s)) return "usgs";
  if (/GDACS/i.test(s)) return "gdacs";
  if (/PVMBG|MAGMA/i.test(s)) return "pvmbg";
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
    const out = await aiChainChat(data, { systemPrompt: system });
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
export async function sendRegionalAlert(_sock, chatId, ev, sub, opts = {}) {
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
  await sendWithCard(_sock, chatId, opts.test ? "\u{1F9EA} SIMULASI TEST — bukan bencana nyata\n\n" + out : out, card);
  return true;
}

// ───────────────────────────── monitor auto-alert ─────────────────────────────

let sock = null;
let fastTimer = null;
let slowTimer = null;
let volcanoTimer = null;
let jadwalTimer = null;
let mdEwsTimer = null; // EWS multi-bencana GDACS (tsunami/topan/banjir/dll)

function isRunning() {
  return !!(fastTimer || slowTimer || jadwalTimer || ewsTimer || volcanoTimer || mdEwsTimer);
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
  } catch (e) { console.error("[bencana] ❌ Gagal ambil daftar grup (pakai cache lama):", e?.message || e); }
  return groupsCache.list;
}

/**
 * Bentangkan watchers → daftar target [watcherKey, chatId, sub].
 * Record biasa → 1 target. Record scope global → DM owner + semua grup.
 * Chat yang punya record sendiri gak dobel (record sendiri menang).
 */
async function expandTargets(sendSock = null) {
  const s = sendSock || sock;
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
  // ── target terpusat (.switch auto bencanawatch set): NAMBAH jangkauan —
  // subscriber tetap dapat, grup/DM pilihan owner juga dapat alert generic
  // (tanpa lokasi → gak dapat versi "dekat wilayah"). ──
  try {
    const extras = await mergeAutoTargets(s, "bencanawatch", []);
    for (const jid of extras) {
      if (!seen.has(jid)) {
        targets.push([`auto:${jid}`, jid, { mode: "otomatis", kirim: "utama", __autoTarget: true }]);
        seen.add(jid);
      }
    }
  } catch (e) { console.error("[bencana] ❌ Target terpusat gagal dibaca (pakai subscriber aja):", e?.message || e); }
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
export async function dispatchBest(sendSock, evs, headerPrefix, card) {
  const s = sendSock || sock;
  const subs = getWatchers();
  let sent = 0, errors = 0;
  if (!s) { console.error("[bencana] ❌ dispatchBest: koneksi WhatsApp TIDAK ADA — pesan gak bisa dikirim"); return { sent: 0, errors: 1 }; }
  const hasJadwal = Object.values(subs).some((x) => (x.mode || "otomatis") === "jadwal");
  if (hasJadwal) for (const ev of evs) pushPending(ev);
  for (const [watcherKey, chatId, sub] of await expandTargets(s)) {
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
          await sendWithCard(s, chatId, withDistanceLine(out, sub, best), card);
          sent++;
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
      await sendWithCard(s, chatId, withDistanceLine(out, sub, best), card);
      sent++;
      sub.lastAlertTs = Date.now();
      saveWatchers(subs);
    } catch (e) {
      errors++;
      console.error(`[bencana] ❌ Gagal kirim (kepadatan) ke ${chatId}:`, e?.message || e);
      logger.error?.("bencana", `Gagal kirim (kepadatan) ke ${chatId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { sent, errors };
}

async function dispatch(sendSock, ev, genericText = null, card = null) {
  const s = sendSock || sock;
  const subs = getWatchers();
  let sent = 0, errors = 0;
  if (!s) { console.error("[bencana] ❌ dispatch: koneksi WhatsApp TIDAK ADA — alert", ev?.jenis || "", "gak bisa dikirim"); return { sent: 0, errors: 1 }; }
  const hasJadwal = Object.values(subs).some((x) => (x.mode || "otomatis") === "jadwal");
  if (hasJadwal) pushPending(ev); // kumpulin buat rangkuman terjadwal
  for (const [watcherKey, chatId, sub] of await expandTargets(s)) {
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
          if (near) { await sendRegionalAlert(s, chatId, ev, sub); sent++; }
          else if (genericText) { await sendWithCard(s, chatId, withDistanceLine(genericText, sub, ev), card); sent++; }
          // tandai sudah diterima biar gak dobel muncul di rangkuman berikutnya
          const subs2 = getWatchers();
          if (subs2[watcherKey]) { subs2[watcherKey].lastDigest = Date.now(); saveWatchers(subs2); }
        }
        continue; // yg biasa nunggu jam rangkuman
      }

      if (mode === "darurat" && !near && !ev.isSevere) continue; // filter: cuman yg darurat

      if (near) {
        await sendRegionalAlert(s, chatId, ev, sub);
        sent++;
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
        await sendWithCard(s, chatId, withDistanceLine(out, sub, ev), card);
        sent++;
        sub.lastAlertTs = Date.now();
        saveWatchers(subs);
      }
    } catch (e) {
      errors++;
      console.error(`[bencana] ❌ Gagal kirim alert ke ${chatId}:`, e?.message || e);
      logger.error?.("bencana", `Gagal kirim ke ${chatId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { sent, errors };
}

/** Wrapper testable — pakai sock internal monitor. */
/**
 * CONTOH INFO saat baru aktif (request owner 2026-09-07: "kalau diaktifin
 * harusnya muncul 1 info sebagai tanda aktif — ini udah di-on malah gak
 * muncul 1 info apapun dari sumbernya").
 *
 * Langsung fetch 1 info TERKINI asli (gempa terbaru BMKG, fallback: event
 * GDACS terbaru 7 hari) dan kirim ke chat tempat fitur baru diaktifkan —
 * sebagai BUKTI pipeline fetch→format→kirim beneran jalan, sekaligus
 * preview seperti apa alert nanti keliatannya.
 *
 * Penting: fungsi ini TIDAK menyentuh state seen/fingerprint — jadi gak
 * ganggu deteksi realtime (event yang sama tetap bisa ke-detect ulang
 * sebagai "baru" kalau memang baru sejak monitor aktif).
 */
export async function sendActivationSample(sock, chatId) {
  try {
    let ev = null;
    let header = "";
    try {
      const g = await getBmkgLatest();
      if (g?.DateTime) {
        const [lat, lon] = String(g.Coordinates).split(",").map((s) => s.trim());
        ev = {
          kind: "gempa", jenis: "Gempa Bumi",
          mag: g.Magnitude, depth: g.Kedalaman,
          level: parseFloat(g.Magnitude) >= 6.0 ? "AWAS" : "SIAGA",
          waktu: `${g.Tanggal} ${g.Jam}`,
          lat: +lat, lon: +lon, desc: g.Wilayah,
          potensi: g.Potensi || null, dirasakan: g.Dirasakan || null,
          sumber: "BMKG (data.bmkg.go.id)",
        };
        ev.thumbUrl = g._shakemapUrl;
        ev._bmkgRaw = g; // simpan field mentah buat format emoji ala script
        header = "GEMPA TERBARU BMKG";
      }
    } catch { /* coba fallback */ }
    if (!ev) {
      const evs = await getGdacs(7);
      const e = evs?.[0];
      if (!e) return false;
      const t = GDACS_TYPES[e.type] ?? { label: e.type, icon: "⚠️" };
      const a = ALERT_STYLE[e.alertlevel] || ALERT_STYLE.Green;
      ev = {
        kind: KIND_BY_TYPE?.[e.type] || "default",
        jenis: t.label,
        level: `${a.label} (${a.icon})`,
        waktu: e.fromdate ? `mulai ${jamWib(e.fromdate)}` : "",
        lat: e.lat, lon: e.lon, desc: e.desc || e.name,
        country: shortCountry(e.country) || null,
        sumber: "GDACS (EU/UN) — gdacs.org",
        report: e.report,
      };
      try { ev.thumbUrl = await gdacsThumbUrl(e); } catch { /* thumbnail opsional */ }
      header = "BENCANA TERBARU GDACS";
    }
    let sampleLines;
    if (ev._bmkgRaw) {
      // contoh BMKG: FORMAT ALA SCRIPT — persis alert BMKG asli
      const g = ev._bmkgRaw;
      sampleLines = [
        "⚠️ *GEMPA TERKINI - BMKG*",
        "",
        `📅 Tanggal: ${g.Tanggal || "N/A"}`,
        `🕐 Jam: ${g.Jam || "N/A"}`,
        `📊 Magnitude: *${g.Magnitude} SR*`,
        `📏 Kedalaman: ${g.Kedalaman || "N/A"}`,
        `📍 Wilayah: ${g.Wilayah || "N/A"}`,
        `🌊 Potensi Tsunami: ${g.Potensi || "Tidak ada"}`,
        `💥 Dirasakan: ${g.Dirasakan || "Tidak ada info"}`,
        "",
        "Sumber: BMKG",
      ];
    } else {
      // fallback GDACS: format info section (gak ada padanan di script)
      sampleLines = [
        `${ev.jenis}${ev.country ? ` di ${ev.country}` : ""}${ev.mag ? ` — M${ev.mag}` : ""}`,
        ev.desc || "",
        "",
        buildInfoSection(ev),
      ];
    }
    const lines = [
      `🔔 *BENCANAWATCH AKTIF* — ${header}`,
      "",
      ...sampleLines,
      "",
      "— contoh kejadian TERKINI (bukan alert baru). Mulai sekarang",
      "bencana BARU otomatis masuk ke chat ini dengan format ini.",
    ];
    await sendWithCard(sock, chatId, lines.join("\n"), eventCard(ev));
    return true;
  } catch (e) {
    logger.error?.("bencana", "Gagal kirim contoh info aktivasi: " + e.message);
    return false;
  }
}

export async function dispatchBencanaEvent(ev, genericText = null, card = null) {
  return dispatch(sock, ev, genericText, card);
}

/**
 * Cek jadwal tiap menit — kirim rangkuman buat subscriber mode jadwal
 * yang jam-nya cocok dengan sekarang (WIB). Anti dobel via state firedJadwal.
 */
// UPGRADE 15 Sep 2026 (syarat owner): sock PARAMETER + log siklus + slot
// jadwal ditandai "fired" SETELAH rangkuman sukses terkirim (dulu ditandai
// duluan → kirim gagal = slot hilang, rangkuman gak pernah nyampe).
async function jadwalTick(sendSock) {
  const s = sendSock || sock;
  if (!s) { console.error("[bencana] ❌ [jadwalTick] koneksi WhatsApp TIDAK ADA — siklus dilewati"); return; }
  try {
    const { hhmm, date } = nowWib();
    for (const [watcherKey, chatId, sub] of await expandTargets(s)) {
      if ((sub.mode || "otomatis") !== "jadwal") continue;
      const scheds = Array.isArray(sub.schedules) ? sub.schedules : [];
      if (!scheds.includes(hhmm)) continue;
      const st = loadState();
      const key = `${chatId}|${date}|${hhmm}`;
      if (st.firedJadwal.includes(key)) continue;
      console.log(`[bencana] 🔄 [jadwalTick] slot rangkuman ${hhmm} tiba untuk ${chatId}`);
      // fireJadwalDigest update lastDigest sendiri; kalau kosong (false),
      // event nunggu sampai rangkuman berikutnya (gak ada pesan = gak ada kabar)
      try {
        const sent = await fireJadwalDigest(s, chatId, sub, watcherKey);
        // SYARAT OWNER #4: slot ditandai SETELAH digest selesai (sukses/kosong)
        const st2 = loadState();
        st2.firedJadwal.push(key);
        st2.firedJadwal = st2.firedJadwal.slice(-100);
        saveState(st2);
        if (sent) { console.log(`[bencana] ✅ [jadwalTick] rangkuman ${hhmm} terkirim ke ${chatId}`); logger.success?.("bencana", `Rangkuman ${hhmm} terkirim ke ${chatId}`); }
        else console.log(`[bencana] 🔄 [jadwalTick] rangkuman ${hhmm} kosong untuk ${chatId} — slot ditandai`);
      } catch (e) {
        console.error(`[bencana] ❌ [jadwalTick] Rangkuman gagal kirim ke ${chatId} — slot BELUM ditandai, dicoba lagi 60s lagi:`, e?.message || e);
        logger.error?.("bencana", `Rangkuman gagal kirim ke ${chatId}: ${e.message}`);
      }
    }
  } catch (e) {
    console.error("[bencana] ❌ [jadwalTick] error:", e?.message || e, e?.stack || "");
    logger.error?.("bencana", "Jadwal error: " + e.message);
  }
}

/** Threshold gempa dekat-lokasi: di bawah mag ini dianggap terlalu
 *  kecil buat dinotifkin (menghindari spam gempa mikro tiap menit). */
const NEAR_QUAKE_MIN_MAG = 2.5;

/**
 * FITUR BARU (request owner 2026-09-07: "tambah alert gempa — kalau gempa
 * terdeteksi di dekat lokasi aku muncul notifikasi langsung, di lokasi
 * lain juga kalau radiusnya ditambah").
 *
 * Gempa BMKG yang gak lolos filter global M 5.0 TAPI terjadi DEKAT lokasi
 * subscriber (dalam radius masing-masing — radius gede = kejadian di
 * lokasi lain yang masuk radius juga kehitung "dekat") tetap dikirim
 * LANGSUNG sebagai peringatan wilayah. Cuma buat subscriber yang:
 * - udah set lokasi (.bencanawatch lokasi), dan
 * - gak nge-filter keluar jenis gempa / sumber bmkg, dan
 * - bukan mode jadwal (jadwal → dikumpulkan ke rangkuman).
 * Subscriber TANPA lokasi gak kena sama sekali (alert global tetap M 5.0+).
 */
export async function dispatchNearQuake(ev) { return dispatchNearEvent(sock, ev, "gempa", "bmkg"); } // backward-compat fastTick
export async function dispatchNearEvent(sendSock, ev, kindKey = "gempa", sumberKey = "bmkg") { /* exported: wrapper testable */
  const s = sendSock || sock;
  const subs = getWatchers();
  let sent = 0, errors = 0;
  if (!s) { console.error("[bencana] ❌ dispatchNearEvent: koneksi WhatsApp TIDAK ADA — pesan gak bisa dikirim"); return { sent: 0, errors: 1 }; }
  const hasJadwal = Object.values(subs).some((x) => (x.mode || "otomatis") === "jadwal");
  if (hasJadwal) pushPending(ev); // subscriber jadwal terima lewat rangkuman
  for (const [watcherKey, chatId, sub] of await expandTargets(s)) {
    try {
      if (sub?.lat == null || ev?.lat == null) continue; // wajib punya lokasi
      const mode = sub.mode || "otomatis";
      if (Array.isArray(sub.jenis) && sub.jenis.length && !sub.jenis.includes(kindKey)) continue;
      if (Array.isArray(sub.sumber) && sub.sumber.length && !sub.sumber.includes(sumberKey)) continue;
      const distKm = haversineKm(sub.lat, sub.lon, ev.lat, ev.lon);
      const radius = sub.radius || DEFAULT_RADIUS_KM;
      if (distKm > radius) continue; // di luar radius → bukan urusan fitur ini
      // ambang magnitudo per subscriber (default 3.5 — owner 15 Sep 2026)
      const minMagSub = parseFloat(sub.minMag ?? DEFAULT_MIN_MAG);
      const magEv = parseFloat(ev.mag);
      if (Number.isFinite(magEv) && magEv < minMagSub) continue;
      if (mode === "jadwal") continue; // udah dipending ke rangkuman
      await sendRegionalAlert(s, chatId, ev, sub);
      sent++;
    } catch (e) {
      errors++;
      console.error(`[bencana] ❌ Gagal kirim near-quake ke ${chatId}:`, e?.message || e);
      logger.error?.("bencana", `Gagal kirim near-quake ke ${chatId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  if (sent) logger.success?.("bencana", `Gempa dekat-lokasi M${ev.mag}: ${sent} subscriber dinotifkin`);
  return { sent, errors };
}

// Seams e2e — inject sumber data biar tes dedup/persist deterministik
let _bmkgLatestFn = getBmkgLatest;
let _usgsEwsFn = getUsgsDayEws;
let _jmaFn = getJmaLatest;
let _emscFn = getEmscLatest;
let _usgsDayFn = getUsgsDay;
let _gdacsFn = getGdacs;
export function _setBencanaSourcesForTest({ bmkg, usgsEws, jma, emsc, usgsDay, gdacs } = {}) {
  if (bmkg) _bmkgLatestFn = bmkg;
  if (usgsEws) _usgsEwsFn = usgsEws;
  if (jma) _jmaFn = jma;
  if (emsc) _emscFn = emsc;
  if (usgsDay) _usgsDayFn = usgsDay;
  if (gdacs) _gdacsFn = gdacs;
}

// fast tick: gempa BMKG baru M >= 5.0
// UPGRADE 15 Sep 2026 (syarat owner): sock diterima sebagai PARAMETER,
// console.log tiap siklus, dan DEDUP HANYA dipersist SETELAH kirim sukses.
async function fastTick(sendSock) {
  const s = sendSock || sock;
  const t0 = Date.now();
  if (!s) { console.error("[bencana] ❌ fastTick: koneksi WhatsApp TIDAK ADA — siklus dilewati (monitor harus di-start via initBencanaMonitor(sock))"); return; }
  try {
    console.log(`[bencana] 🔄 [fastTick] cek BMKG jalan (${POLL_FAST_MS / 1000}s sekali)…`);
    const g = await _bmkgLatestFn();
    if (!g) { console.log(`[bencana] 🔄 [fastTick] BMKG: tidak ada data (skip) — ${Date.now() - t0}ms`); return; }
    const st = loadState();
    if (st.bmkg === null) { st.bmkg = g.DateTime; saveState(st); console.log(`[bencana] 🔄 [fastTick] BMKG baseline pertama dicatat (tanpa spam): ${g.DateTime}`); return; } // baseline, tanpa spam
    if (g.DateTime > st.bmkg) {
      const mag = parseFloat(g.Magnitude);
      const [lat, lon] = String(g.Coordinates).split(",").map((x) => x.trim());
      if (fpDupe(st, { kind: "gempa", lat: +lat, lon: +lon, mag: g.Magnitude })) {
        // event udah dikirim jalur lain (USGS/GDACS/EWS) → cukup majuin baseline
        st.bmkg = g.DateTime; saveState(st);
        console.log(`[bencana] 🔄 [fastTick] BMKG M${g.Magnitude} duplikat lintas-jalur (sudah dikirim jalur lain) — baseline dimajukan`);
        return;
      }
      if (mag >= 5.0) {
        const ev = {
          kind: "gempa", jenis: "Gempa Bumi",
          mag: g.Magnitude, depth: g.Kedalaman,
          level: mag >= 6.0 ? "AWAS" : "SIAGA",
          waktu: `${g.Tanggal} ${g.Jam}`,
          lat: +lat, lon: +lon, desc: g.Wilayah,
          potensi: g.Potensi || null, dirasakan: g.Dirasakan || null,
          sumber: "BMKG (data.bmkg.go.id)",
          isSevere: mag >= 6.5, // mode darurat: gempa besar lolos filter global
        };
        ev.thumbUrl = g._shakemapUrl; // shakemap → thumbnail preview card (bukan attachment terpisah)
        // FORMAT ALA SCRIPT OWNER (8 Sep 2026) — emoji per field
        const lines = [
          "⚠️ *GEMPA TERKINI - BMKG*",
          "",
          `📅 Tanggal: ${g.Tanggal || "N/A"}`,
          `🕐 Jam: ${g.Jam || "N/A"}`,
          `📊 Magnitude: *${g.Magnitude} SR*`,
          `📏 Kedalaman: ${g.Kedalaman || "N/A"}`,
          `📍 Wilayah: ${g.Wilayah || "N/A"}`,
          `🌊 Potensi Tsunami: ${g.Potensi || "Tidak ada"}`,
          `💥 Dirasakan: ${g.Dirasakan || "Tidak ada info"}`,
          "",
          `Sumber: BMKG`,
        ];
        const res = await dispatch(s, ev, lines.join("\n"), eventCard(ev));
        // ── SYARAT OWNER #4: DEDUP DIPERSIST SETELAH PESAN BERHASIL TERKIRIM.
        // Kalau kirim gagal → state TIDAK disimpan → tick berikutnya NYOBA LAGI.
        if (res.errors > 0) {
          console.error(`[bencana] ❌ [fastTick] BMKG M${g.Magnitude} GAGAL dikirim (${res.errors} error, ${res.sent} sukses) — event ${g.DateTime} BELUM ditandai, dicoba lagi ${POLL_FAST_MS / 1000}s lagi`);
          return;
        }
        const st2 = loadState();
        st2.bmkg = g.DateTime;
        fpMark(st2, ev); // tandai biar USGS/GDACS gak dobelin gempa yang sama
        saveState(st2);
        console.log(`[bencana] ✅ [fastTick] BMKG M${g.Magnitude} ${g.Wilayah || ""} → terkirim ${res.sent} chat, dedup dipersist (tahan restart)`);
      } else if (mag >= NEAR_QUAKE_MIN_MAG) {
        // FITUR owner 2026-09-07: gempa < M 5.0 gak masuk alert global,
        // tapi kalau DEKAT lokasi subscriber tetap dikirim langsung.
        const ev = {
          kind: "gempa", jenis: "Gempa Bumi",
          mag: g.Magnitude, depth: g.Kedalaman,
          level: "WASPADA",
          waktu: `${g.Tanggal} ${g.Jam}`,
          lat: +lat, lon: +lon, desc: g.Wilayah,
          potensi: g.Potensi || null, dirasakan: g.Dirasakan || null,
          sumber: "BMKG (data.bmkg.go.id)",
          isSevere: false,
        };
        ev.thumbUrl = g._shakemapUrl;
        const res = await dispatchNearEvent(s, ev, "gempa", "bmkg");
        if (res.errors > 0) {
          console.error(`[bencana] ❌ [fastTick] near-quake M${g.Magnitude} GAGAL dikirim — event ${g.DateTime} dicoba lagi ${POLL_FAST_MS / 1000}s lagi`);
          return;
        }
        const st2 = loadState();
        st2.bmkg = g.DateTime;
        fpMark(st2, ev); // tandai biar gak dobel dari pusat lain
        saveState(st2);
        console.log(`[bencana] ✅ [fastTick] near-quake M${g.Magnitude} → ${res.sent} subscriber dekat lokasi, dedup dipersist`);
      } else {
        // gempa kecil < threshold → gak dinotif, cukup majuin baseline
        st.bmkg = g.DateTime; saveState(st);
        console.log(`[bencana] 🔄 [fastTick] BMKG M${g.Magnitude} di bawah threshold notif — baseline dimajukan`);
      }
    } else {
      console.log(`[bencana] 🔄 [fastTick] BMKG: tidak ada gempa baru — ${Date.now() - t0}ms`);
    }
  } catch (e) {
    console.error("[bencana] ❌ [fastTick] BMKG error:", e?.message || e, e?.stack || "");
    logger.error?.("bencana", "BMKG error: " + e.message);
  }
}

// slow tick: GDACS SIAGA/AWAS baru + USGS signifikan (M5+ alert / M6+) baru
// UPGRADE 15 Sep 2026 (syarat owner): sock PARAMETER + log siklus + dedup
// dipersist SETELAH kirim sukses (gagal kirim → dicoba lagi tick berikutnya).
async function slowTick(sendSock) {
  const s = sendSock || sock;
  if (!s) { console.error("[bencana] ❌ slowTick: koneksi WhatsApp TIDAK ADA — siklus dilewati"); return; }
  console.log(`[bencana] 🔄 [slowTick] cek GDACS + USGS jalan (${POLL_SLOW_MS / 1000}s sekali)…`);
  try {
    const events = (await _gdacsFn(2)).filter((e) => e.alertlevel === "Orange" || e.alertlevel === "Red");
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
      // SYARAT OWNER #4: id event HANYA dipersist SETELAH pesan berhasil
      // terkirim. Duplikat lintas-jalur (sudah dikirim pusat lain) aman
      // dicatat sekarang; event baru ditahan sampai dispatch sukses.
      const evs = [];
      const dupSkipped = [];
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
        if (fpDupe(st, ev)) { dupSkipped.push(e.id); continue; } // gempa yang sama udah dikirim pusat lain — cukup 1 info
        ev.thumbUrl = await gdacsThumbUrl(e); // peta overview GDACS → thumbnail card
        ev._summary = `${t.icon} ${t.label}${ev.country ? ` — ${ev.country}` : ""} — ${a.label}${ev.desc ? ` — ${ev.desc.slice(0, 60)}` : ""}`;
        evs.push(ev);
      }
      if (dupSkipped.length) {
        const stD = loadState();
        stD.gdacs.push(...dupSkipped);
        stD.gdacs = stD.gdacs.slice(-200);
        saveState(stD);
      }
      let res = { sent: 0, errors: 0 };
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
        res = await dispatch(s, ev, lines.join("\n"), eventCard(ev));
      } else if (evs.length > 1) {
        // FIX OWNER (revisi 2026-09-07): jangan semua info dikirim (spam) —
        // tiap pembaruan cukup 1 info TERPENTING per subscriber (mode utama),
        // atau semua + cooldown 10 mnt (mode semua). Atur: .bencanawatch kirim.
        const top = [...evs].sort((a, b) => Number(b.isSevere) - Number(a.isSevere))[0];
        res = await dispatchBest(s, evs, "AUTO-ALERT BENCANA GLOBAL", eventCard(top));
      }
      if (evs.length && res.errors > 0) {
        console.error(`[bencana] ❌ [slowTick] GDACS gagal kirim (${res.errors} error, ${res.sent} sukses) — ${evs.length} event BELUM ditandai, dicoba lagi ${POLL_SLOW_MS / 1000}s lagi`);
      } else if (evs.length) {
        const st2 = loadState();
        st2.gdacs.push(...fresh.map((e) => e.id));
        st2.gdacs = st2.gdacs.slice(-200);
        for (const ev of evs) fpMark(st2, ev);
        saveState(st2);
        console.log(`[bencana] ✅ [slowTick] GDACS: ${evs.length} event baru → ${res.sent} chat, dedup dipersist`);
      }
    }
  } catch (e) {
    console.error("[bencana] ❌ [slowTick] GDACS error:", e?.message || e, e?.stack || "");
    logger.error?.("bencana", "GDACS error: " + e.message);
  }
  try {
    const quakes = await _usgsDayFn();
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
      // SYARAT OWNER #4: id USGS hanya dipersist SETELAH kirim sukses
      const evs = [];
      const dupSkipped = [];
      for (const q of fresh) {
        const ev = {
          kind: "gempa", jenis: "Gempa Bumi (global)",
          mag: q.mag?.toFixed(1), depth: "-",
          level: q.tsunami
            ? "AWAS (flag tsunami)"
            : q.mag >= 7.0 ? "AWAS"
            : ({ yellow: "SIAGA", orange: "AWAS", red: "AWAS" })[q.alert] || "SIAGA",
          waktu: jamWib(q.time),
          lat: q.lat, lon: q.lon, desc: q.place,
          tsunamiFlag: !!q.tsunami,
          sumber: "USGS (earthquake.usgs.gov)",
          report: q.url,
          isSevere: q.mag >= 7.0, // mode darurat: gempa besar global lolos filter
        };
        if (fpDupe(st, ev)) { dupSkipped.push(String(q.id)); continue; } // gempa yang sama udah dikirim BMKG/GDACS — cukup 1 info
        ev.thumbUrl = await usgsThumbUrl(q); // shakemap intensity.jpg → thumbnail card
        ev._summary = `🌍 Gempa global M${ev.mag} — ${q.place} — ${String(ev.level).replace(/ \(.*\)$/, "")}`;
        evs.push(ev);
      }
      if (dupSkipped.length) {
        const stD = loadState();
        stD.usgs.push(...dupSkipped);
        stD.usgs = stD.usgs.slice(-200);
        saveState(stD);
      }
      let res = { sent: 0, errors: 0 };
      if (evs.length === 1) {
        const ev = evs[0];
        const q = fresh.find((x) => String(x.id) === String(ev.id)) || fresh[0];
        // FORMAT ALA SCRIPT OWNER (8 Sep 2026) — emoji per field
        const lines = [
          "🌍 *GEMPA GLOBAL - USGS*",
          "",
          `📊 Magnitude: *M ${q.mag}*`,
          `📍 Lokasi: ${q.place || "Unknown"}`,
          `🕐 Waktu: ${jamWib(q.time)}`,
          `🌊 Tsunami: ${q.tsunami ? "✅ YA" : "❌ TIDAK"}`,
          `🚨 Alert: ${String(q.alert || "green").toUpperCase()}`,
          "",
          `Sumber: USGS`,
        ];
        res = await dispatch(s, ev, lines.join("\n"), eventCard(ev));
      } else if (evs.length > 1) {
        // FIX OWNER (revisi 2026-09-07): 1 info terpenting per pembaruan
        // (mode utama) / semua + cooldown 10 mnt (mode semua).
        const top = [...evs].sort((a, b) => Number(b.isSevere) - Number(a.isSevere))[0];
        res = await dispatchBest(s, evs, "AUTO-ALERT GEMPA GLOBAL (USGS)", eventCard(top));
      }
      if (evs.length && res.errors > 0) {
        console.error(`[bencana] ❌ [slowTick] USGS gagal kirim (${res.errors} error, ${res.sent} sukses) — ${evs.length} event dicoba lagi ${POLL_SLOW_MS / 1000}s lagi`);
      } else if (evs.length) {
        const st2 = loadState();
        st2.usgs.push(...fresh.map((q) => String(q.id)));
        st2.usgs = st2.usgs.slice(-200);
        for (const ev of evs) fpMark(st2, ev);
        saveState(st2);
        console.log(`[bencana] ✅ [slowTick] USGS: ${evs.length} gempa global baru → ${res.sent} chat, dedup dipersist`);
      }
    }
  } catch (e) {
    console.error("[bencana] ❌ [slowTick] USGS error:", e?.message || e, e?.stack || "");
    logger.error?.("bencana", "USGS error: " + e.message);
  }
}

/** Start timer kalau belum jalan (lazy — cuma kalau ada subscriber). */
// ─────────── EWS: PERINGATAN DINI GEMPA MULTI-PROVIDER (8 Sep 2026) ───────────
// Request owner: "klo bencana terjadi peringatan dini kirim notifikasi
// langsung, jd fitur ini sbgai pengaman darurat" — ala script EWS standalone.
// Poll 4 sumber TIAP 10 DETIK (BMKG + USGS + JEPANG/JMA + GLOBAL/EMSC),
// M 4.5+ (ala script), dan PENTING: pesan EWS BYPASS mode pengiriman
// (otomatis/jadwal/darurat) — ini pengaman darurat, selalu realtime.
const EWS_POLL_MS = 10_000; // poll EWS gempa 4 provider — 10 dtk (spec owner 20 dtk, kita lebih cepat)
export const EWS_MIN_MAG = 3.5; // ambang bawah polling EWS (15 Sep: 4.0 → 3.5 — level + minMag subscriber yang menentukan relevansi)
const EWS_S_WAVE_KMS = 3.6; // kecepatan guncangan (gelombang S perusak) km/detik — spec owner 15 Sep 2026
const EWS_URGENT_RANGE_KM = 800; // dalam range ini → ETA guncangan + instruksi darurat
const EWS_SEVERE_MAG = 6.5; // di atas ini → semua subscriber dikabarin (tanpa lokasi pun)

/**
 * LEVEL SIAGA EWS v2 (spec owner 15 Sep 2026 — "ala BMKG di TV"):
 *   MERAH  = 🚨 M≥5.5 dalam 300 km  → PERINGATAN DARURAT + DROP/COVER/HOLD ON
 *   KUNING = ⚠️ M≥4.5 dalam 500 km  → PERINGATAN DINI + bersiap
 *   HIJAU  = ℹ️ M≥5.0 dalam 2000 km → info saja, kemungkinan tak terasa
 * Radius subscriber gede (mis. "radius dunia") memperluas HIJAU jadi info
 * jarak jauh. Fisika: gelombang S merambat ±3,6 km/dtk → pusat gempa
 * 200 km = getaran terasa ±56 detik — alert bisa nyampe SEBELUM lantai
 * bergoyang (konsep EWS Jepang).
 */
export const EWS_LEVELS = {
  MERAH:  { minMag: 5.5, radiusKm: 300,  icon: "🚨", label: "PERINGATAN DARURAT" },
  KUNING: { minMag: 3.5, radiusKm: 500,  icon: "⚠️", label: "PERINGATAN DINI" }, // 15 Sep: 4.5 → 3.5 (digempa sering tapi kecil)
  HIJAU:  { minMag: 5.0, radiusKm: 2000, icon: "ℹ️", label: "INFO GEMPA" },
};
export function tentukanLevelEws(mag, jarakKm) {
  const m = parseFloat(mag);
  if (Number.isFinite(m) && jarakKm != null) {
    if (m >= EWS_LEVELS.MERAH.minMag && jarakKm <= EWS_LEVELS.MERAH.radiusKm) return "MERAH";
    if (m >= EWS_LEVELS.KUNING.minMag && jarakKm <= EWS_LEVELS.KUNING.radiusKm) return "KUNING";
    if (m >= EWS_LEVELS.HIJAU.minMag && jarakKm <= EWS_LEVELS.HIJAU.radiusKm) return "HIJAU";
  }
  return null;
}
/** ETA gelombang S sampai lokasi subscriber (detik, dibulatkan). */
export function etaGetaranDetik(jarakKm) {
  return Math.round(jarakKm / EWS_S_WAVE_KMS);
}

let ewsTimer = null;
const ewsProviderHealth = { BMKG: { fails: 0, down: false }, USGS: { fails: 0, down: false }, JMA: { fails: 0, down: false }, EMSC: { fails: 0, down: false } };
export function getEwsProviderHealth() { return { ...ewsProviderHealth }; }

/** USGS day feed versi EWS — M4.5+ semua (getUsgsDay cuma M5+/M6+). */
async function getUsgsDayEws() {
  const d = await fetchJson(USGS_DAY_URL, 9000);
  return (d?.features ?? [])
    .filter((f) => (f.properties?.mag || 0) >= EWS_MIN_MAG)
    .map((f) => {
      const [lon, lat] = f.geometry?.coordinates || [null, null];
      return {
        key: `usgs_${f.id}`,
        provider: "USGS",
        mag: f.properties.mag,
        depth: f.properties.depth != null ? `${f.properties.depth} km` : "N/A",
        wilayah: f.properties.place || "—",
        tsunami: f.properties.tsunami === 1 ? "Berpotensi Tsunami" : "Tidak ada",
        lat, lon,
        waktu: jamWib(f.properties.time || Date.now()),
      };
    });
}

function bmkgToEws(g) {
  if (!g?.DateTime) return null;
  const [lat, lon] = String(g.Coordinates || ",").split(",").map((s) => +s.trim());
  return {
    key: `bmkg_${g.DateTime}`,
    provider: "BMKG",
    mag: parseFloat(g.Magnitude) || 0,
    depth: g.Kedalaman || "N/A",
    wilayah: g.Wilayah || "N/A",
    tsunami: g.Potensi || "Tidak ada",
    lat, lon,
    waktu: `${g.Tanggal || "N/A"} ${g.Jam || ""}`.trim(),
  };
}

/** Format peringatan dini ala script owner (formatEarlyWarning). */
/**
 * Template pesan EWS v2 (spec owner 15 Sep 2026 — 3 level ala BMKG di TV).
 * ev = { provider, mag, depth, wilayah, tsunami, lat, lon, waktu }.
 * opts = { jarak, eta (detik), city, level: MERAH|KUNING|HIJAU|GLOBAL }.
 * MERAH membawa instruksi darurat DROP-COVER-HOLD ON; ETA ≤90 dtk
 * ditulis dalam DETIK (urgensi terasa), di atasnya menit.
 */
export function formatEwsWarning(ev, { jarak = null, eta = null, city = null, level = "HIJAU", near = false } = {}) {
  const mag = parseFloat(ev.mag) || ev.mag;
  const etaText = eta == null ? null
    : eta <= 90 ? `*${eta} DETIK*`
    : `± ${Math.max(1, Math.round(eta / 60))} menit`;

  if (level === "MERAH") {
    let msg = "🚨 *PERINGATAN DARURAT — GEMPA KUAT TERDETEKSI!* 🚨\n\n";
    msg += `💥 Magnitudo : *M ${mag}*\n`;
    msg += `📍 Lokasi : ${ev.wilayah}\n`;
    if (jarak != null) msg += `📏 Jarak dari ${city || "lokasimu"}: *±${Math.round(jarak)} km*\n`;
    msg += `🌊 Potensi : ${ev.tsunami || "sedang dicek"}\n`;
    msg += `🕐 Waktu : ${ev.waktu}\n\n`;
    if (etaText != null) msg += `⏱️ *Perkiraan getaran sampai di lokasimu: ${etaText}*\n\n`;
    msg += "‼️ *LAKUKAN SEKARANG:*\n";
    msg += "1️⃣ DROP — Merunduk\n";
    msg += "2️⃣ COVER — Lindungi kepala, berlindung di bawah meja\n";
    msg += "3️⃣ HOLD ON — Bertahan sampai guncangan berhenti\n\n";
    msg += "🚪 Jauhi kaca, lemari tinggi, dan benda mudah jatuh\n";
    msg += "🏢 Di gedung: JANGAN pakai lift!\n";
    msg += "🏖️ Di pesisir: Waspadai potensi tsunami!\n\n";
    msg += "_Tetap tenang. Segera ke tempat terbuka jika guncangan kuat._ 🙏\n";
    if (ev.lat != null && ev.lon != null) msg += `\n🗺️ ${mapsLink(ev.lat, ev.lon)}\n`;
    msg += `\n📡 _Sumber: ${ev.provider}_`;
    return msg;
  }

  if (level === "KUNING") {
    let msg = "⚠️ *PERINGATAN DINI GEMPA* ⚠️\n\n";
    msg += `💥 Magnitudo : *M ${mag}*\n`;
    msg += `📍 Lokasi : ${ev.wilayah}\n`;
    if (jarak != null) msg += `📏 Jarak dari ${city || "lokasimu"}: *±${Math.round(jarak)} km*\n`;
    msg += `🕐 Waktu : ${ev.waktu}\n`;
    msg += `🌊 Potensi : ${ev.tsunami || "-"}\n\n`;
    if (etaText != null) msg += `⏱️ Perkiraan getaran terasa: *${etaText}*\n\n`;
    msg += "_Bersiaplah, jauhi benda mudah jatuh. Pantau info lanjutan ya 🙏_\n";
    if (ev.lat != null && ev.lon != null) msg += `\n🗺️ ${mapsLink(ev.lat, ev.lon)}\n`;
    msg += `\n📡 _Sumber: ${ev.provider}_`;
    return msg;
  }

  if (level === "GLOBAL") {
    // gempa BESAR (M6.5+) di luar jangkauan subscriber — info global
    let msg = "🌐 *INFO GEMPA BESAR DUNIA*\n\n";
    msg += `💥 Magnitudo : *M ${mag}*\n`;
    msg += `📍 Lokasi : ${ev.wilayah}\n`;
    if (jarak != null) msg += `📏 Jarak dari ${city || "lokasimu"}: ±${Math.round(jarak)} km\n`;
    msg += `🕐 Waktu : ${ev.waktu}\n`;
    msg += `🌊 Potensi : ${ev.tsunami || "-"}\n\n`;
    msg += "_Gempa besar global — pantau berita resmi jika wilayahmu dekat pesisir. Tidak perlu panik 😊_\n";
    if (ev.lat != null && ev.lon != null) msg += `\n🗺️ ${mapsLink(ev.lat, ev.lon)}\n`;
    msg += `\n📡 _Sumber: ${ev.provider}_`;
    return msg;
  }

  // HIJAU — info saja
  let msg = "ℹ️ *INFO GEMPA*\n\n";
  msg += `💥 M ${mag} | 📍 ${ev.wilayah}\n`;
  if (jarak != null) msg += `📏 ±${Math.round(jarak)} km dari ${city || "lokasimu"}\n`;
  msg += `🕐 ${ev.waktu}\n`;
  msg += `📏 Kedalaman: ${ev.depth}\n\n`;
  msg += "_Kemungkinan tidak terasa di lokasimu. Tidak perlu panik 😊_\n";
  if (ev.lat != null && ev.lon != null) msg += `\n🗺️ ${mapsLink(ev.lat, ev.lon)}\n`;
  msg += `\n📡 _Sumber: ${ev.provider}_`;
  return msg;
}

/**
 * Kirim satu event EWS ke semua subscriber yang relevan.
 * UPGRADE 15 Sep 2026 (syarat owner #2 + fix bug JID global): koneksi
 * WhatsApp kini diterima SEBAGAI PARAMETER, dan target dibentangkan via
 * expandTargets() — BUG LAMA: subscriber global disimpan di key
 * "global:<ownerJid>" dan dispatchEws mengirim ke KEY itu mentah-mentah
 * (JID invalid → sendMessage SELALU gagal) → subscriber global TIDAK
 * PERNAH menerima peringatan dini. Sekarang: key global dibentangkan ke
 * DM owner + semua grup, target terpusat ikut, dan tiap gagal kirim
 * dihitung sebagai error (pemanggil gak menandainya "sudah dinotif").
 */
async function dispatchEws(sendSock, ev, subs) {
  const s = sendSock || sock;
  if (!s) {
    console.error("[bencana] ❌ dispatchEws: koneksi WhatsApp TIDAK ADA — peringatan dini GAGAL dikirim, akan dicoba lagi tick berikutnya");
    return { sent: 0, errors: 1 };
  }
  const severe = ev.mag >= EWS_SEVERE_MAG;
  const provKey = ev.provider === "BMKG" ? "bmkg" : ev.provider === "USGS" ? "usgs"
    : ev.provider === "JEPANG" ? "jepang" : "global";
  let sent = 0, errors = 0;
  for (const [watcherKey, chatId, sub] of await expandTargets(s)) {
    try {
      if (sub.ews === false) continue; // opt-out EWS per subscriber (.bencanawatch ews off)
      if (Array.isArray(sub.provider) && sub.provider.length && !sub.provider.includes(provKey)) continue; // .bencanawatch provider <daftar>
      if (Array.isArray(sub.sumber) && sub.sumber.length && !sub.sumber.includes(provKey)) continue;
      if (Array.isArray(sub.jenis) && sub.jenis.length && !sub.jenis.includes("gempa")) continue;

      let jarak = null, eta = null, level = null;
      if (sub.lat != null && sub.lon != null && ev.lat != null && ev.lon != null) {
        jarak = haversineKm(sub.lat, sub.lon, ev.lat, ev.lon);
        eta = etaGetaranDetik(jarak); // detik (gelombang S 3,6 km/dtk)
        // EWS v2 (spec owner 15 Sep): level ditentukan kombinasi magnitudo + jarak
        level = tentukanLevelEws(ev.mag, jarak);
        // radius subscriber gede (mis. "radius dunia" 20000 km) → gempa M5+ di
        // luar 2000 km tetap dibawa sebagai HIJAU (info), radius jangkauan ikut
        const reach = Math.max(EWS_LEVELS.HIJAU.radiusKm, sub.radius || 0);
        if (!level && jarak <= reach && parseFloat(ev.mag) >= EWS_LEVELS.HIJAU.minMag) level = "HIJAU";
        const nearRange = Math.max(EWS_URGENT_RANGE_KM, sub.radius || 0);
        const near = jarak <= nearRange;
        if (!level) level = null; // di luar semua level → cek severe global di bawah
        else if (!near && level === "HIJAU" && !severe) { /* tetap kirim — info sesuai spec */ }
      }
      // ambang magnitudo per subscriber (default 3.5 — owner 15 Sep 2026):
      // bisa NAIK (filter gempa kecil) atau TURUN di bawah KUNING 3.5 —
      // gempa >= ambang & <= 500 km tetap dapat KUNING walau di bawah spec
      const minMagSub = parseFloat(sub.minMag ?? DEFAULT_MIN_MAG);
      if (!level && Number.isFinite(parseFloat(ev.mag))) {
        const inKuningRange = jarak != null && jarak <= EWS_LEVELS.KUNING.radiusKm;
        if (parseFloat(ev.mag) >= minMagSub && inKuningRange) level = "KUNING"; // minmag turunkan lantai KUNING
      }
      if (!level) {
        // subscriber tanpa lokasi / gempa di luar jangkauan → hanya gempa BESAR global
        if (!severe) continue;
        level = "GLOBAL";
      }
      // gempa di bawah ambang subscriber gak dikirim EWS, KECUALI gempa besar global
      if (!severe && Number.isFinite(parseFloat(ev.mag)) && parseFloat(ev.mag) < minMagSub) continue;

      const text = formatEwsWarning(ev, { jarak, eta, city: sub.city, level });
      await s.sendMessage(chatId, { text });
      sent++;
    } catch (e) {
      errors++;
      console.error(`[bencana] ❌ EWS kirim ke ${chatId} gagal:`, e?.message || e);
      logger.error?.("bencana", `EWS kirim ke ${chatId} gagal: ${e.message}`);
    }
  }
  return { sent, errors };
}

/**
 * EWS tick — poll 4 provider tiap 10 detik. Dedup:
 *  - state.ews.seen = key per provider (ala script lastEvents)
 *  - fpDupe/fpMark = anti-dobel LINTAS jalur (fastTick/slowTick gak ngedobel
 *    gempa yang udah dikirim EWS, dan sebaliknya)
 * Baseline pertama: tandain semua seen TANPA kirim (anti spam pas boot).
 */
// UPGRADE 15 Sep 2026 (syarat owner): sock PARAMETER + log siklus + dedup
// seen/fpMark HANYA dipersist SETELAH kirim sukses. Dulu: event ditandai
// seen → saveState → baru dispatch → kalau kirim gagal (sock null / JID
// global invalid) event BLACK HOLE selamanya, gak pernah dicoba lagi.
async function ewsTick(sendSock) {
  const s = sendSock || sock;
  if (!s) { console.error("[bencana] ❌ [ewsTick] koneksi WhatsApp TIDAK ADA — siklus dilewati"); return; }
  try {
    console.log(`[bencana] 🔄 [ewsTick] cek peringatan dini 4 provider jalan (${EWS_POLL_MS / 1000}s sekali)…`);
    const [bmkg, usgs, jma, emsc] = await Promise.allSettled([
      _bmkgLatestFn(), _usgsEwsFn(), _jmaFn(), _emscFn(),
    ]);
    const events = [];
    if (bmkg.status === "fulfilled" && bmkg.value) {
      const e = bmkgToEws(bmkg.value);
      if (e) events.push(e);
    }
    for (const r of [usgs, jma, emsc]) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) events.push(...r.value);
    }

    // ── RANTAI FALLBACK PROVIDER (spec owner 15 Sep 2026: "tambah sistem
    // polling ganda antara BMKG dan USGS — jika BMKG down otomatis ke USGS
    // atau provider lain"). Semua provider di-poll PARALEL; BMKG jadi
    // sumber utama Indonesia, USGS/JMA/EMSC jadi jalur cadangan global.
    // Health tracker: 2x gagal beruntun → status DOWN (log transisi),
    // 1x sukses → kembali ONLINE. Event lintas-provider didedupe via
    // fingerprint koordinat+mag — gempa yang sama gak dobel kirim.
    const results = { BMKG: bmkg, USGS: usgs, JMA: jma, EMSC: emsc };
    const statusLine = [];
    for (const [prov, r] of Object.entries(results)) {
      const ok = r.status === "fulfilled";
      if (r.status === "rejected") console.error(`[bencana] ❌ [ewsTick] provider ${prov} gagal di-poll:`, r.reason?.message || r.reason);
      const h = (ewsProviderHealth[prov] ??= { fails: 0, down: false });
      if (ok) {
        h.fails = 0;
        if (h.down) { h.down = false; console.log(`[bencana] ✅ [ewsTick] provider ${prov} KEMBALI ONLINE`); }
      } else {
        h.fails++;
        if (h.fails >= 2 && !h.down) {
          h.down = true;
          console.error(`[bencana] ❌ [ewsTick] provider ${prov} DOWN (${h.fails}x gagal beruntun) — ${prov === "BMKG" ? "fallback USGS/JMA/EMSC otomatis aktif" : "sisa provider tetap jalan"}`);
        }
      }
      statusLine.push(`${prov} ${h.down ? "❌" : "✅"}`);
    }
    console.log(`[bencana] 🔄 [ewsTick] status provider: ${statusLine.join(" | ")}${ewsProviderHealth.BMKG?.down ? " → FALLBACK AKTIF" : ""}`);

    const st = loadState();
    st.ews ??= { bootstrapped: false, seen: [], history: [] };
    st.ews.seen ??= [];
    st.ews.history ??= [];

    // Baseline boot: tandain semua yang sekarang tanpa kirim (anti spam)
    if (!st.ews.bootstrapped) {
      st.ews.bootstrapped = true;
      st.ews.seen = events.filter((e) => e.mag >= EWS_MIN_MAG).map((e) => e.key).slice(-300);
      saveState(st);
      console.log(`[bencana] 🔄 [ewsTick] baseline boot: ${st.ews.seen.length} event tercatat tanpa kirim (anti spam)`);
      return;
    }

    // kandidat BARU — TANPA mutasi state dulu (syarat owner #4)
    const fresh = [];
    const crossJalur = []; // sudah dikirim jalur lain (fastTick/slowTick)
    for (const ev of events) {
      if (ev.mag < EWS_MIN_MAG) continue;
      if (st.ews.seen.includes(ev.key)) continue;
      if (fpDupe(st, { kind: "gempa", lat: ev.lat, lon: ev.lon, mag: ev.mag })) { crossJalur.push(ev.key); continue; } // udah dikirim jalur lain
      fresh.push(ev);
    }

    const subs = await getWatchersSafe();
    for (const ev of fresh) {
      const res = await dispatchEws(s, ev, subs);
      const sentOk = res.sent > 0;
      if (res.errors > 0 && !sentOk) {
        // KIRIM GAGAL SEMUA → jangan tandai seen → dicoba lagi tick berikutnya
        console.error(`[bencana] ❌ [ewsTick] ${ev.provider} M${ev.mag} GAGAL terkirim (${res.errors} error) — event ${ev.key} BELUM ditandai seen, dicoba lagi ${EWS_POLL_MS / 1000}s lagi`);
        continue;
      }
      // PERSIST SETELAH kirim sukses (atau gak ada subscriber relevan → cukup sekali proses)
      const st2 = loadState();
      st2.ews.seen.push(ev.key);
      st2.ews.seen = st2.ews.seen.slice(-300);
      fpMark(st2, ev); // tandai biar fastTick/slowTick gak ngedobel
      st2.ews.history.unshift({
        provider: ev.provider, mag: ev.mag, wilayah: ev.wilayah,
        waktu: ev.waktu, terkirim: res.sent, ts: Date.now(),
      });
      st2.ews.history = st2.ews.history.slice(-50);
      saveState(st2);
      if (sentOk) {
        console.log(`[bencana] ✅ [ewsTick] ${ev.provider} M${ev.mag} — ${ev.wilayah} → ${res.sent} chat, dedup dipersist (tahan restart)`);
        logger.success?.("bencana", `[EWS] ${ev.provider} M${ev.mag} — ${ev.wilayah} → ${res.sent} chat`);
      }
    }
    // event lintas-jalur aman dicatat seen (sudah dikirim jalur lain)
    if (crossJalur.length) {
      const st3 = loadState();
      st3.ews.seen.push(...crossJalur);
      st3.ews.seen = st3.ews.seen.slice(-300);
      saveState(st3);
    }
  } catch (e) {
    console.error("[bencana] ❌ [ewsTick] error:", e?.message || e, e?.stack || "");
    logger.error?.("bencana", "EWS tick error: " + e.message);
  }
}

/** Exported: wrapper testable — kirim event EWS ke snapshot subscriber. */
// ═══════════ EWS v2 — MULTI-BENCANA (spec owner 15 Sep 2026:
// "jd tdk hnya bencana gempa sj ada ewsnya jga") ═══════════
// Tsunami/topan/banjir/gunung api/kekeringan/kebakaran dari GDACS
// (EU/UN) di-poll tiap 60 dtk — level MERAH/KUNING/HIJAU + instruksi
// evakuasi KHUSUS PER JENIS BENCANA. Gempa (EQ) sengaja DILEWATI di
// sini — udah punya jalur EWS 4-provider 10 dtk sendiri; dedup lintas
// jalur via fingerprint tetap jalan biar slowTick gak dobel kirim.
const MD_EWS_POLL_MS = 60_000;
const MD_EWS_SKIP_TYPES = ["EQ"]; // gempa punya EWS sendiri (10 dtk)

/** Instruksi evakuasi khusus per jenis bencana. */
export const MD_EWS_INSTRUCTIONS = {
  tsunami: [
    "1️⃣ SEGERA MENJAUHI PANTAI sekarang",
    "2️⃣ Naik ke tempat tinggi (≥20 m atau ≥3 lantai)",
    "3️⃣ JANGAN menunggu ombak kelihatan — ombak tsunami bisa datang menit pertama",
    "4️⃣ Hindari sungai & pesisir sampai all-clear resmi",
  ],
  topan: [
    "1️⃣ Siapkan bahan pokok 3 hari + air bersih",
    "2️⃣ Senter + baterai, isi HP penuh",
    "3️⃣ Tetap di dalam ruangan, jauhi pohon/tiang/billboard",
    "4️⃣ Amankan atap & jendela, waspada banjir/kabel listrik",
  ],
  banjir: [
    "1️⃣ Matikan listrik dari MCB sebelum air masuk",
    "2️⃣ Siapkan tas evakuasi: dokumen penting + obat + uang tunai",
    "3️⃣ Pindahkan barang & colokan ke tempat tinggi",
    "4️⃣ JANGAN berjalan/berkendara di arus 15 cm+ — bawaan arus kuat",
  ],
  gunungapi: [
    "1️⃣ Jauhi radius rawan (P3K/PKam zona bahaya PVMBG)",
    "2️⃣ Pakai masker N95 + kacamata, tutup tandon air",
    "3️⃣ Waspada lahar hujan di jalur sungai saat hujan",
    "4️⃣ Siapkan tas evakuasi, ikuti arahan petugas",
  ],
  kekeringan: [
    "1️⃣ Hemat air — prioritas minum & masak",
    "2️⃣ Simpan cadangan air bersih di wadah tertutup",
    "3️⃣ Cek jadwal/pengumuman PDAM setempat",
    "4️⃣ Waspada kebakaran — area kering mudah terbakar",
  ],
  kebakaran: [
    "1️⃣ Waspada asap — pakai masker N95 di luar ruangan",
    "2️⃣ Tutup jendela, hindari aktivitas luar berlebih",
    "3️⃣ Jauhi area kebakaran & jalur evakuasi darurat",
    "4️⃣ Awasi ISPA — khususnya anak-anak & lansia",
  ],
  default: [
    "1️⃣ Pantau info resmi (BNPB/BPBD setempat)",
    "2️⃣ Siapkan tas evakuasi: dokumen + obat + uang tunai",
    "3️⃣ Ikuti arahan petugas darurat",
  ],
};

/**
 * Level EWS multi-bencana per subscriber.
 * alertlevel GDACS: Red=Merah / Orange=Siaga / Green=Waspada.
 * TSUNAMI SELALU MINIMAL MERAH dalam 1000 km (bencana paling mematikan),
 * KUNING sampai 3000 km. Lainnya: alertlevel + jarak (radius subscriber
 * ikut diperhitungkan — radius dunia = jangkauan global).
 */
export function tentukanLevelMdEws(type, alertlevel, jarakKm, subRadius = 0) {
  const r = subRadius || 0;
  if (type === "TS") {
    if (jarakKm != null && jarakKm <= Math.max(1000, r)) return "MERAH";
    if (jarakKm != null && jarakKm <= Math.max(3000, r)) return "KUNING";
    return alertlevel === "Red" ? "KUNING" : null;
  }
  if (alertlevel === "Red") {
    if (jarakKm == null) return "MERAH"; // subscriber global (tanpa lokasi) — event darurat dunia
    if (jarakKm <= Math.max(500, r)) return "MERAH";
    if (jarakKm <= Math.max(3000, r)) return "KUNING";
    return "HIJAU";
  }
  if (alertlevel === "Orange") {
    if (jarakKm == null) return null;
    if (jarakKm <= Math.max(500, r)) return "KUNING";
    if (jarakKm <= Math.max(2000, r)) return "HIJAU";
    return null;
  }
  // Green — info saja, dekat saja
  if (jarakKm == null) return null;
  if (jarakKm <= Math.max(500, r)) return "HIJAU";
  return null;
}

/** Template pesan EWS multi-bencana — instruksi sesuai jenis. */
export function formatMdEwsWarning(ev, { level = "HIJAU", jarak = null, city = null } = {}) {
  const jenisKey = ev.kind || "default";
  const ins = MD_EWS_INSTRUCTIONS[jenisKey] || MD_EWS_INSTRUCTIONS.default;
  const icon = ev.icon || "⚠️";
  let msg = level === "MERAH"
    ? `🚨 *PERINGATAN DARURAT — ${String(ev.jenis || "BENCANA").toUpperCase()}!* 🚨\n\n`
    : level === "KUNING"
      ? `⚠️ *PERINGATAN DINI — ${String(ev.jenis || "BENCANA").toUpperCase()}* ⚠️\n\n`
      : `ℹ️ *INFO ${String(ev.jenis || "BENCANA").toUpperCase()}*\n\n`;
  msg += `${icon} Jenis : *${ev.jenis}*\n`;
  if (ev.level) msg += `📊 Status : ${ev.level}\n`;
  if (jarak != null) msg += `📏 Jarak dari ${city || "lokasimu"}: *±${Math.round(jarak)} km*\n`;
  if (ev.country) msg += `🌍 Lokasi : ${ev.country}${ev.desc ? ` — ${ev.desc.slice(0, 80)}` : ""}\n`;
  else if (ev.desc) msg += `🌍 ${ev.desc.slice(0, 100)}\n`;
  if (ev.waktu) msg += `🕐 ${ev.waktu}\n\n`;
  if (level === "MERAH" || level === "KUNING") {
    msg += "‼️ *LANGKAH PENYELAMATAN:*\n";
    msg += ins.join("\n") + "\n\n";
    msg += "_Tetap tenang & pantau info resmi. 🙏_\n";
  } else {
    msg += ins.slice(0, 2).join("\n") + "\n\n";
    msg += "_Belum perlu panik — cukup siaga dan pantau perkembangan. 😊_\n";
  }
  if (ev.lat != null && ev.lon != null) msg += `\n🗺️ ${mapsLink(ev.lat, ev.lon)}\n`;
  if (ev.report) msg += `📄 Laporan GDACS: ${ev.report}\n`;
  msg += `\n📡 _Sumber: GDACS (EU/UN) — gdacs.org_`;
  return msg;
}

/** Kirim satu event multi-bencana ke subscriber relevan. Sock = PARAMETER. */
async function dispatchMdEws(s, ev) {
  let sent = 0, errors = 0;
  for (const [watcherKey, chatId, sub] of await expandTargets(s)) {
    try {
      if (sub.ews === false) continue;
      if (Array.isArray(sub.jenis) && sub.jenis.length && !sub.jenis.includes(ev.kind)) continue;
      let jarak = null;
      if (sub.lat != null && sub.lon != null && ev.lat != null && ev.lon != null) {
        jarak = haversineKm(sub.lat, sub.lon, ev.lat, ev.lon);
      }
      const level = tentukanLevelMdEws(ev.type, ev.alertlevel, jarak, sub.radius || 0);
      if (!level) continue;
      const text = formatMdEwsWarning(ev, { level, jarak, city: sub.city });
      await s.sendMessage(chatId, { text });
      sent++;
    } catch (e) {
      errors++;
      console.error(`[bencana] ❌ [mdEws] kirim ke ${chatId} gagal:`, e?.message || e);
      logger.error?.("bencana", `[mdEws] kirim ke ${chatId} gagal: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return { sent, errors };
}

/**
 * Multi-disaster EWS tick — GDACS non-gempa tiap 60 dtk.
 * Dedup: st.mdEws.seen = id GDACS; dipersist SETELAH kirim sukses
 * (aturan owner #4 — kirim gagal → dicoba lagi tick berikutnya).
 * Baseline boot: event yang udah ada dicatat tanpa kirim (anti spam).
 */
async function mdEwsTick(sendSock) {
  const s = sendSock || sock;
  if (!s) { console.error("[bencana] ❌ [mdEwsTick] koneksi WhatsApp TIDAK ADA — siklus dilewati"); return; }
  try {
    console.log(`[bencana] 🔄 [mdEwsTick] cek EWS multi-bencana GDACS (tsunami/topan/banjir/gunung api/kekeringan/kebakaran) tiap ${MD_EWS_POLL_MS / 1000}s…`);
    const events = (await _gdacsFn(2)).filter((e) => !MD_EWS_SKIP_TYPES.includes(e.type));
    const st = loadState();
    st.mdEws ??= { bootstrapped: false, seen: [] };
    st.mdEws.seen ??= [];

    if (!st.mdEws.bootstrapped) {
      st.mdEws.bootstrapped = true;
      st.mdEws.seen = events.map((e) => e.id).slice(-300);
      saveState(st);
      console.log(`[bencana] 🔄 [mdEwsTick] baseline boot: ${st.mdEws.seen.length} event GDACS non-gempa tercatat tanpa kirim (anti spam)`);
      return;
    }

    // dedup GANDA: mdEws.seen (milik tick ini) + st.gdacs (share dengan
    // slowTick) → event yang udah dikirim jalur mana pun gak dobel
    st.gdacs ??= [];
    const fresh = events.filter((e) => !st.mdEws.seen.includes(e.id) && !st.gdacs.includes(e.id));
    if (!fresh.length) return;

    for (const e of fresh) {
      const t = GDACS_TYPES[e.type] ?? { label: e.type, icon: "⚠️" };
      const a = ALERT_STYLE[e.alertlevel] ?? ALERT_STYLE.Green;
      const ev = {
        type: e.type,
        kind: KIND_BY_TYPE[e.type] || "default",
        jenis: t.label,
        icon: t.icon,
        level: `${a.label} (${a.icon})`,
        waktu: e.fromdate ? `mulai ${jamWib(e.fromdate)} WIB` : "baru terdeteksi",
        lat: e.lat, lon: e.lon,
        desc: e.desc || e.name || "",
        country: shortCountry(e.country) || null,
        alertlevel: e.alertlevel,
        report: e.report,
      };
      const res = await dispatchMdEws(s, ev);
      if (res.errors > 0 && res.sent === 0) {
        console.error(`[bencana] ❌ [mdEwsTick] ${ev.jenis} GAGAL terkirim (${res.errors} error) — id ${e.id} BELUM ditandai seen, dicoba lagi ${MD_EWS_POLL_MS / 1000}s lagi`);
        continue; // jangan tandai seen → retry
      }
      const st2 = loadState();
      st2.mdEws.seen.push(e.id);
      st2.mdEws.seen = st2.mdEws.seen.slice(-300);
      // tandai JUGA di st.gdacs → slowTick (3 mnt) gak kirim ulang event yang
      // udah dikirim EWS multi-bencana ini (dedup lintas-jalur)
      st2.gdacs ??= [];
      st2.gdacs.push(e.id);
      st2.gdacs = st2.gdacs.slice(-200);
      saveState(st2);
      if (res.sent > 0) console.log(`[bencana] ✅ [mdEwsTick] ${ev.jenis} (${e.alertlevel}) → ${res.sent} chat, dedup dipersist`);
      else console.log(`[bencana] 🔄 [mdEwsTick] ${ev.jenis} (${e.alertlevel}) — tidak ada subscriber relevan, dicatat seen`);
    }
  } catch (e) {
    console.error("[bencana] ❌ [mdEwsTick] error:", e?.message || e, e?.stack || "");
    logger.error?.("bencana", "mdEws tick error: " + e.message);
  }
}

export async function dispatchEwsEvent(ev, subs, sockOverride = null) {
  return dispatchEws(sockOverride || sock, ev, subs);
}

/** Riwayat event EWS (buat .bencanawatch riwayat). */
export function getEwsHistory(limit = 10) {
  return (loadState().ews?.history ?? []).slice(0, limit);
}

/** Toggle EWS per subscriber (default ON — pengaman darurat). */
export function setWatcherEws(chatId, on) {
  const subs = getWatchers();
  if (!subs[chatId]) throw new Error("Aktifkan dulu .bencanawatch on.");
  subs[chatId].ews = !!on;
  saveWatchers(subs);
  return subs[chatId];
}

/** Filter provider EWS per subscriber: bmkg/usgs/jepang/global ("all" = reset). */
export function setWatcherProvider(chatId, list) {
  const subs = getWatchers();
  if (!subs[chatId]) throw new Error("Aktifkan dulu .bencanawatch on.");
  const valid = ["bmkg", "usgs", "jepang", "jma", "global", "china", "all"];
  const wanted = (Array.isArray(list) ? list : [list]).map((x) => String(x).toLowerCase().trim());
  for (const w of wanted) if (!valid.includes(w)) throw new Error(`Provider "${w}" gak dikenal. Pilihan: bmkg / usgs / jepang / global / all`);
  if (wanted.includes("all")) {
    delete subs[chatId].provider;
  } else {
    subs[chatId].provider = [...new Set(wanted.map((w) =>
      w === "jma" ? "jepang" : w === "china" ? "global" : w // alias: script owner nyebut CHINA → sekarang GLOBAL (EMSC)
    ))];
  }
  saveWatchers(subs);
  return subs[chatId];
}

/**
 * SYARAT OWNER #1 (15 Sep 2026) — VERIFIKASI PENJADWALAN:
 * Fungsi ini adalah SATU-SATUNYA titik registrasi scheduler bencana.
 * Dipanggil dari index.js saat koneksi WhatsApp terbuka:
 *   index.js → initBencanaMonitor(sock) → syncBencanaMonitor(sock)
 *   → startBencanaMonitor(sock) → setInterval(...) TIAP sumber.
 * Interval closure membaca binding `sock` modul pada TIAP siklus, jadi
 * koneksi yang di-update lewat syncBencanaMonitor(sock) otomatis kepakai.
 * Tiap siklus cek menulis console.log — bukti scheduler hidup di log PM2.
 */
export function startBencanaMonitor(sockParam = null) {
  if (sockParam) sock = sockParam; // SYARAT OWNER #2: injeksi koneksi WA eksplisit
  if (isRunning()) {
    console.log("[bencana] ⚙️ monitor sudah jalan — start ulang di-skip");
    return false;
  }
  if (watcherCount() === 0) {
    console.log("[bencana] ⚙️ monitor belum bisa nyala — belum ada subscriber (.bencanawatch on)");
    return false;
  }
  if (!getBencanaAutoEnabled()) {
    console.log("[bencana] ⚙️ monitor dipause via .switch auto bencanawatch off");
    return false;
  }
  if (!sock) console.error("[bencana] ⚠️ monitor nyala TANPA koneksi WhatsApp — notifikasi GAGAL dikirim sampai initBencanaMonitor(sock)/syncBencanaMonitor(sock) dipanggil");
  fastTick(sock);
  slowTick(sock);
  ewsTick(sock);
  mdEwsTick(sock);
  mdEwsTimer = setInterval(() => mdEwsTick(sock), MD_EWS_POLL_MS); // EWS multi-bencana GDACS tiap 60 dtk
  fastTimer = setInterval(() => fastTick(sock), POLL_FAST_MS);
  slowTimer = setInterval(() => slowTick(sock), POLL_SLOW_MS);
  jadwalTimer = setInterval(() => jadwalTick(sock), 60_000); // cek jadwal tiap menit (mode jadwal)
  ewsTimer = setInterval(() => ewsTick(sock), EWS_POLL_MS); // peringatan dini 4 provider tiap 10 dtk
  volcanoTick(sock);
  volcanoTimer = setInterval(() => volcanoTick(sock), VOLCANO_POLL_MS); // status gunung api PVMBG tiap 10 mnt
  console.log(`[bencana] ✅ [SCHEDULER TERDAFTAR] ${watcherCount()} subscriber — BMKG tiap ${POLL_FAST_MS / 1000}s, GDACS+USGS tiap ${POLL_SLOW_MS / 1000}s, EWS gempa 4-provider tiap ${EWS_POLL_MS / 1000}s (level MERAH/KUNING/HIJAU), EWS multi-bencana GDACS tiap ${MD_EWS_POLL_MS / 1000}s (tsunami/topan/banjir/gunung api), jadwal tiap 60s, gunung api PVMBG tiap ${VOLCANO_POLL_MS / 1000}s — koneksi WhatsApp: ${sock ? "TERSAMBUNG ✅" : "NULL ❌"}`);
  logger.success?.("bencana", `Monitor aktif (${watcherCount()} chat — BMKG ${POLL_FAST_MS / 1000}s, GDACS+USGS ${POLL_SLOW_MS / 1000}s, jadwal 60s, EWS ${EWS_POLL_MS / 1000}s)`);
  return true;
}

/**
 * Flag global auto-alert bencanawatch — diintegrasikan ke .switch auto
 * (request owner 8 Sep 2026). Default ON biar perilaku lama gak berubah.
 * OFF = polling dipause, subscriber & pengaturan (lokasi/radius/mode/jadwal)
 * TETAP tersimpan — begitu di-ON balik, monitor nyala lagi sendirinya.
 */
export function getBencanaAutoEnabled() {
  try {
    return getDatabase().setting("bencanaWatchEnabled") ?? true;
  } catch (e) { console.error("[bencana] ❌ Gagal baca flag bencanaWatchEnabled (default ON):", e?.message || e); return true; }
}

export function setBencanaAutoEnabled(on) {
  const db = getDatabase();
  db.setting("bencanaWatchEnabled", !!on);
  db.save?.();
  if (on) {
    syncBencanaMonitor(); // nyalain balik kalau ada subscriber
    logger.success?.("bencana", "Auto-alert bencanawatch: ON via .switch (subscriber tetap)");
  } else {
    stopBencanaMonitor();
    logger.success?.("bencana", "Auto-alert bencanawatch: PAUSED via .switch (subscriber & pengaturan tetap)");
  }
  return !!on;
}

/** Stop timer — dipanggil pas subscriber terakhir off. */
export function stopBencanaMonitor() {
  if (fastTimer) clearInterval(fastTimer);
  if (slowTimer) clearInterval(slowTimer);
  if (volcanoTimer) clearInterval(volcanoTimer);
  if (ewsTimer) clearInterval(ewsTimer);
  if (jadwalTimer) clearInterval(jadwalTimer);
  if (mdEwsTimer) clearInterval(mdEwsTimer);
  // FIX BUG 15 Sep 2026: dulu volcanoTimer TIDAK di-null → isRunning()
  // selalu true → startBencanaMonitor selalu skip → monitor GAK PERNAH
  // bisa nyala lagi setelah stop (.bencanawatch off → on = mati permanen).
  fastTimer = slowTimer = volcanoTimer = ewsTimer = jadwalTimer = mdEwsTimer = null;
  console.log("[bencana] ⚙️ monitor dihentikan — SEMUA timer dibersihkan (bisa restart)");
  return true;
}

/** Sinkron state monitor dengan jumlah subscriber. */
export function syncBencanaMonitor(_sock) {
  if (_sock) sock = _sock;
  console.log(`[bencana] ⚙️ syncBencanaMonitor dipanggil — koneksi WA ${_sock ? "diterima ✅" : "(pakai sock lama)"}, subscriber: ${watcherCount()}`);
  if (watcherCount() > 0) startBencanaMonitor(_sock);
  else if (isRunning()) stopBencanaMonitor();
}

/**
 * Dipanggil sekali saat boot (index.js). Simpan sock, lalu nyalakan
 * monitor hanya kalau sudah ada subscriber dari sesi sebelumnya.
 */
export function initBencanaMonitor(_sock) {
  console.log(`[bencana] ⚙️ initBencanaMonitor: koneksi WhatsApp ${_sock ? "diterima dari index.js ✅" : "NULL ❌ (notifikasi gak bisa dikirim)"} — subscriber tersimpan: ${watcherCount()}`);
  sock = _sock;
  syncBencanaMonitor(_sock);
  return true;
}

/**
 * FIX OWNER 2026-09-07: kesehatan monitor buat debugging "kok gak masuk
 * alertnya" — status polling per sumber + jalan/gak, biar owner bisa
 * verifikasi monitor beneran hidup tanpa nebak.
 */
/** Seam e2e — atur/hapus sock internal modul (uji jalur tanpa koneksi). */
export function _setBencanaSockForTest(s) { sock = s || null; }

/** Seam e2e — jalankan satu tick spesifik secara deterministik. */
export async function _bencanaRunTickForTest(which, sendSock) {
  if (which === "fast") return fastTick(sendSock);
  if (which === "slow") return slowTick(sendSock);
  if (which === "ews") return ewsTick(sendSock);
  if (which === "volcano") return volcanoTick(sendSock);
  if (which === "jadwal") return jadwalTick(sendSock);
  if (which === "mdews") return mdEwsTick(sendSock);
  throw new Error("tick tidak dikenal: " + which);
}

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
    ewsRunning: !!ewsTimer,
    ewsPollSec: EWS_POLL_MS / 1000,
    ewsProviders: ["BMKG", "USGS", "JEPANG (JMA)", "GLOBAL (EMSC)"],
    ewsMinMag: EWS_MIN_MAG,
    ewsHistoryCount: (st.ews?.history ?? []).length,
    mdEwsRunning: !!mdEwsTimer,
    mdEwsPollSec: MD_EWS_POLL_MS / 1000,
    ewsProviderHealth: getEwsProviderHealth(),
  };
}
