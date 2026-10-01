// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-movie-notifier.js — Auto Movie Notifier (request owner 9 Sep 2026, ala
// script standalone "movie notifier free" — IMDbOT tanpa API key).
//
// RANTAI PROVIDER (anti mati total — IMDbOT sempat down SERVER_FAILURE_25):
//   1. IMDbOT  https://imdb.iamidiotareyoutoo.com  (script owner — utama)
//   2. Cinemeta https://v3-cinemeta.strem.io       (Stremio, gratis no key — fallback LIVE)
//
// 3 TIPE KONTEN (bisa on/off sendiri via .movienotify info <tipe>):
//   • trending   🔥 Film populer       (IMDbOT search "popular" → Cinemeta top)
//   • upcoming   📅 Film terbaru      (IMDbOT search <tahun> → Cinemeta year)
//   • nowplaying 🎥 Film rating tinggi (IMDbOT search "best" → Cinemeta imdbRating)
//
// Format card PER-FILM persis contoh owner: poster jadi GAMBAR ASLI + caption
// (rating/genre/durasi/sutradara/pemain/🔗 IMDb) + sinopsis di balik ℅readmore
// + banner externalAdReply renderLargerThumbnail (thumbnail = poster).
//
// Cap anti-spam ala script: max 3 film baru per tipe per check, jeda 1.5 dtk.
// Cache dedup per tipe 200 → keep 100 (gak kirim ulang).
// Interval cek bisa diset: .movienotify interval <menit> (5–720, default 60).

import axios from "axios";
import fs from "fs";
import path from "path";
import { mergeAutoTargets } from "./rara-auto-target.js";
import { logger } from "./rara-logger.js";
import config from "../../config.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "automovienotifier.json");

const IMDBOT_API = "https://imdb.iamidiotareyoutoo.com";
const CINEMETA_API = "https://v3-cinemeta.strem.io";

const DEFAULT_INTERVAL_MENIT = 60; // ala script: cek tiap 1 jam
const PER_TYPE_LIMIT = 3; // cap card per tipe per check (ala script)
const CAP_DELAY_MS = 1500; // jeda antar card (ala script sleep 1500)

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  Accept: "application/json",
};

// ℅readmore WhatsApp: teks setelah tanda ini ke-collapse jadi "Baca selengkapnya"
const READMORE = "\u200E".repeat(4001);

export const MOVIE_TYPES = {
  trending: { label: "Trending", emoji: "🔥", header: "FILM TRENDING!", desc: "Film populer IMDb" },
  upcoming: { label: "Terbaru", emoji: "📅", header: "FILM TERBARU!", desc: "Film rilis tahun ini" },
  nowplaying: { label: "Rating Tinggi", emoji: "🎥", header: "FILM RATING TINGGI!", desc: "Film rating tinggi IMDb" },
  new: { label: "Hasil Cari", emoji: "🎬", header: "FILM DITEMUKAN!", desc: "Hasil pencarian film" },
};

// ───────────────────────────── state ─────────────────────────────

function defaultState() {
  return {
    enabled: false,
    targets: [],
    intervalMenit: DEFAULT_INTERVAL_MENIT,
    initDone: false,
    caches: { trending: [], upcoming: [], nowplaying: [] },
    contentTypes: { trending: true, upcoming: true, nowplaying: true },
    lastCheck: null,
    lastSources: {},
  };
}

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const st = { ...defaultState(), ...JSON.parse(raw) };
    st.caches = { ...defaultState().caches, ...st.caches };
    st.contentTypes = { ...defaultState().contentTypes, ...st.contentTypes };
    return st;
  } catch {
    return defaultState();
  }
}

function saveState(st) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
  } catch (e) {
    logger.error?.("movie-notifier", `saveState gagal: ${e.message}`);
  }
}

let sock = null;
let timer = null;
let running = false;

export function setSock(_sock) {
  if (_sock) sock = _sock;
}

// ───────────────────────────── provider: IMDbOT (script owner) ─────────────────────────────

// FIX v24.2.2 — IMDbOT: endpoint LAMA sudah MATI.
//   /search?q=…  → HTTP 400 (selalu)    /title/<id> → balas teks non-JSON
// Karena itu rantai IMDbOT dulu SELALU gagal dan fitur cuma hidup dari
// fallback Cinemeta. Endpoint yang masih hidup: /justwatch?q=… → item punya
// `imdbId` (tt…), poster, backdrop. Mapping dibuat TOLERAN: mendukung bentuk
// /justwatch ASLI maupun fixture lama (/search) biar test lama tetap jalan.
function mapImdbotItem(x) {
  const poster = Array.isArray(x.photo_url) ? x.photo_url[0] : (x.photo_url || x.poster || null);
  const backdrop = Array.isArray(x.backdrops) ? x.backdrops[0] : (x.backdrop || null);
  return {
    ...x,
    id: x.imdbId || x.imdb_id || x.id || x.tconst || null,
    title: x.title || x.name || "Unknown",
    poster: poster || x.poster || null,
    backdrop,
    // /justwatch gak punya rating IMDb (jwRating 0-1, bukan IMDb) → biar
    // diisi enrichMovie dari Cinemeta.
    rating: x.rating || null,
    genres: x.genres || (Array.isArray(x.genre) ? x.genre : x.genre ? [x.genre] : []),
    runtime: x.runtime || x.duration || null,
    director: x.directors || (Array.isArray(x.director) ? x.director : x.director ? [x.director] : []),
    actors: x.actors || x.cast || [],
    description: x.plot || x.overview || x.description || "",
  };
}

async function imdbotSearch(q) {
  const res = await axios.get(`${IMDBOT_API}/justwatch?q=${encodeURIComponent(q)}`, { headers: HEADERS, timeout: 15_000 });
  const raw = res.data?.description || res.data?.results || [];
  const list = (Array.isArray(raw) ? raw : []).map(mapImdbotItem).filter((x) => x.id);
  if (!list.length) throw new Error("IMDbOT justwatch kosong");
  return list;
}

async function imdbotDetails(imdbId) {
  const res = await axios.get(`${IMDBOT_API}/justwatch?q=${encodeURIComponent(imdbId)}`, { headers: HEADERS, timeout: 15_000 });
  if (!res.data || res.data.error || res.data.ok === false) throw new Error("IMDbOT justwatch error");
  const raw = res.data?.description || res.data?.results || [];
  const hit = (Array.isArray(raw) ? raw : [])
    .find((x) => (x.imdbId || x.imdb_id || x.id) === imdbId) || raw[0];
  if (!hit) throw new Error("IMDbOT detail kosong");
  return mapImdbotItem({ ...hit, id: hit.imdbId || hit.imdb_id || hit.id || imdbId });
}

// ───────────────────────────── provider: Cinemeta (fallback live) ─────────────────────────────

async function cinemetaGet(url) {
  // v3-cinemeta menjawab 302 ke cinemeta-catalogs.strem.io — follow redirect
  const res = await axios.get(url, { headers: HEADERS, timeout: 15_000, maxRedirects: 3 });
  return res.data;
}

async function cinemetaCatalog(kind, limit = 10) {
  // kind: top | imdbRating | year=<YYYY>
  const url = kind.startsWith("year=")
    ? `${CINEMETA_API}/catalog/movie/year/${kind}.json`
    : `${CINEMETA_API}/catalog/movie/${kind}.json`;
  const data = await cinemetaGet(url);
  const metas = data?.metas || [];
  if (!metas.length) throw new Error("Cinemeta katalog kosong");
  return metas.slice(0, limit);
}

async function cinemetaSearch(q, limit = 5) {
  const data = await cinemetaGet(`${CINEMETA_API}/catalog/movie/top/search=${encodeURIComponent(q)}.json`);
  const metas = data?.metas || [];
  if (!metas.length) throw new Error("Cinemeta search kosong");
  return metas.slice(0, limit);
}

async function cinemetaMeta(ttId) {
  const data = await cinemetaGet(`${CINEMETA_API}/meta/movie/${ttId}.json`);
  if (!data?.meta) throw new Error("Cinemeta meta kosong");
  return data.meta;
}

// ───────────────────────────── normalize ─────────────────────────────

function normImdbot(x) {
  return {
    id: x.id || x.imdb_id || x.tconst || null,
    title: x.title || x.original_title || x.name || "Unknown",
    year: x.year || x.release_date || "N/A",
    rating: x.rating || x.imdb_rating || null,
    genres: x.genres || (Array.isArray(x.genre) ? x.genre : x.genre ? [x.genre] : []) || [],
    runtime: x.runtime || x.duration || null,
    director: x.directors || (Array.isArray(x.director) ? x.director : x.director ? [x.director] : []) || [],
    actors: x.actors || x.cast || [],
    description: x.plot || x.overview || "",
    poster: x.poster || x.image || x.cover || null,
    source: "IMDbOT",
  };
}

function normCinemeta(m) {
  return {
    id: m.id || m.imdb_id || null,
    title: m.name || "Unknown",
    year: String(m.releaseInfo || m.year || "N/A"),
    rating: m.imdbRating ? Number(m.imdbRating) : null,
    genres: m.genres || m.genre || [],
    runtime: m.runtime ? parseInt(String(m.runtime)) : null,
    director: m.director || [],
    actors: m.cast || [],
    description: m.description || "",
    poster: m.poster || null,
    source: "Cinemeta",
  };
}

/** Rantai daftar film: **Cinemeta (utama)** → IMDbOT (cadangan).
 * FIX v24.2.2 — dulu IMDbOT di depan. Sisa pakai endpoint `/search` yang sudah
 * MATI, dan setelah dibenerin ke `/justwatch` ternyata endpoint itu PENCARIAN
 * JUDUL, bukan katalog: query "popular"/"best"/<tahun> mengembalikan item yang
 * JUDULNYA kebetulan berbunyi begitu (contoh nyata: acara berjudul "Popular"
 * tahun 1999 muncul sebagai "film trending"). Cinemeta punya katalog asli
 * (top / year / imdbRating) + rating IMDb + kru, jadi hasilnya BENAR. */
async function fetchList(type, limit = 10) {
  const year = new Date().getFullYear();
  const queries = {
    trending: { imdbot: "popular", cinemeta: "top" },
    upcoming: { imdbot: String(year), cinemeta: `year=${year}` },
    nowplaying: { imdbot: "best", cinemeta: "imdbRating" },
  }[type];
  if (!queries) throw new Error(`tipe gak dikenal: ${type}`);
  try {
    const list = await cinemetaCatalog(queries.cinemeta, limit);
    return { list: list.map(normCinemeta), source: "Cinemeta" };
  } catch (e) {
    logger.warn?.("movie-notifier", `Cinemeta ${type} gagal (${e.message}) — fallback IMDbOT`);
    const list = await imdbotSearch(queries.imdbot);
    return { list: list.slice(0, limit).map(normImdbot), source: "IMDbOT" };
  }
}

/** Detail film rantai: Cinemeta /meta (paling lengkap) → IMDbOT justwatch.
 * FIX v24.2.2: dulu IMDbOT `/title` di depan — endpoint itu MATI, jadi tiap
 * enrich kena throw dulu. Sekarang Cinemeta duluan (rating IMDb + kru +
 * sinopsis lengkap), IMDbOT cuma cadangan. */
async function getMovieDetails(ttId) {
  try {
    const m = await cinemetaMeta(ttId);
    return normCinemeta(m);
  } catch {
    const d = await imdbotDetails(ttId);
    return { ...normImdbot(d), id: ttId };
  }
}

/** Lengkapi data parsial (rating/durasi/sinopsis/dll) via detail chain. */
export async function enrichMovie(m) {
  if (!m?.id) return m;
  const need = !m.rating || !m.description || !m.runtime || !(m.director?.length) || !(m.actors?.length);
  if (!need) return m;
  try {
    const d = await getMovieDetails(m.id);
    return {
      ...m,
      rating: m.rating || d.rating,
      description: m.description || d.description,
      runtime: m.runtime || d.runtime,
      director: m.director?.length ? m.director : d.director,
      actors: m.actors?.length ? m.actors : d.actors,
      genres: m.genres?.length ? m.genres : d.genres,
      year: (m.year && m.year !== "N/A") ? m.year : d.year,
      poster: m.poster || d.poster,
    };
  } catch {
    return m;
  }
}

/** Search manual (.movie <judul>) — rantai IMDbOT → Cinemeta. */
export async function searchMovies(query, limit = 5) {
  // FIX v24.2.2: Cinemeta dulu (ID IMDb + rating lengkap), IMDbOT cadangan.
  try {
    const list = await cinemetaSearch(query, limit);
    return { list: list.map(normCinemeta), source: "Cinemeta" };
  } catch {
    const list = await imdbotSearch(query);
    return { list: list.slice(0, limit).map(normImdbot), source: "IMDbOT" };
  }
}

export const fetchTrending = (limit = 10) => fetchList("trending", limit);
export const fetchUpcoming = (limit = 10) => fetchList("upcoming", limit);
export const fetchNowPlaying = (limit = 10) => fetchList("nowplaying", limit);

// ───────────────────────────── diff & cache ─────────────────────────────

/** Pure diff: film baru = id belum ada di cache tipe itu. TIDAK mutasi state. */
export function diffMovies(list, cache) {
  const seen = new Set(cache || []);
  return list.filter((m) => m.id && !seen.has(m.id));
}

function pushCache(st, type, ids) {
  // union dedup (id yang udah ada gak numpuk dobel) + limit ala script 200 → keep 100
  const merged = [...new Set([...(st.caches[type] || []), ...ids])];
  st.caches[type] = merged.slice(-200).slice(-100);
}

// ───────────────────────────── format & kirim ─────────────────────────────

export function formatMovieCard(m, { type = "new", index = 1, total = 1 } = {}) {
  if (!m) return null;
  const t = MOVIE_TYPES[type] || MOVIE_TYPES.new;
  const title = m.title || "Unknown";
  const year = m.year || "N/A";
  const rating = m.rating ? `${m.rating}/10` : "N/A";
  const genres = m.genres?.join(", ") || "N/A";
  const runtime = m.runtime ? `${m.runtime} menit` : "N/A";
  const director = m.director?.join(", ") || "N/A";
  const actors = m.actors?.slice(0, 3).join(", ") || "N/A";
  const desc = m.description ? String(m.description).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";

  let msg = `${t.emoji} *${t.header}*\n\n`;
  msg += `${index}. *${title}* (${year})\n\n`;
  msg += `⭐ Rating: ${rating}\n`;
  msg += `🎭 Genre: ${genres}\n`;
  msg += `⏱️ Durasi: ${runtime}\n`;
  msg += `🎥 Sutradara: ${director}\n`;
  msg += `👥 Pemain: ${actors}\n\n`;
  if (m.id) msg += `🔗 IMDb: https://www.imdb.com/title/${m.id}/\n\n`;
  // sinopsis full plain text di balik ℅readmore biar gak kepanjangan ke bawah
  if (desc) msg += `📖 Sinopsis:${READMORE}\n\n${desc}`;
  return msg;
}

async function downloadPoster(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 15_000, responseType: "arraybuffer" });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

/**
 * Card per-film (pola anime preview card): poster jadi GAMBAR ASLI + caption +
 * banner externalAdReply renderLargerThumbnail (thumbnail = poster).
 * Poster gagal di-download → fallback text + banner card biasa.
 */
export async function sendMovieCardTo(_sock, chatId, m, { type = "new", index = 1, total = 1 } = {}) {
  if (!_sock || !chatId) return false;
  const caption = formatMovieCard(m, { type, index, total });
  if (!caption) return false;
  const buf = m.poster ? await downloadPoster(m.poster) : null;
  const banner = {
    title: m.title || "Movie Update",
    body: m.rating ? `⭐ ${m.rating}/10` : "Film Baru",
    sourceUrl: m.id ? `https://www.imdb.com/title/${m.id}/` : "https://www.imdb.com",
    mediaType: 1,
    renderLargerThumbnail: true,
    showAdAttribution: false,
    ...(buf ? { thumbnail: buf } : {}),
  };
  try {
    if (buf) {
      await _sock.sendMessage(chatId, { image: buf, caption, contextInfo: { externalAdReply: banner } });
    } else {
      await _sock.sendMessage(chatId, { text: caption, contextInfo: { externalAdReply: banner } });
    }
  } catch (e) {
    logger.error?.("movie-notifier", `Gagal kirim card ke ${chatId}: ${e.message}`);
    try { await _sock.sendMessage(chatId, { text: caption }); } catch { }
  }
  await new Promise((r) => setTimeout(r, CAP_DELAY_MS));
  return true;
}

// ───────────────────────────── core check ─────────────────────────────

let queue = Promise.resolve();
function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => { });
  return run;
}

export function runCheck(opts = {}) {
  return enqueue(() => doRunCheck(opts));
}

async function doRunCheck({ force = false, chatId = null } = {}) {
  let st = loadState();
  const targetsSnapshot = await mergeAutoTargets(sock, "automovienotifier", [...st.targets]);
  st = loadState();
  st.lastCheck = new Date().toISOString();
  saveState(st);

  const targets = chatId ? [chatId] : targetsSnapshot;
  const types = st.contentTypes || {};
  let sent = 0;
  const summary = {};

  // First-run: baseline semua cache + kirim pesan aktivasi
  if (!st.initDone && !force) {
    st.initDone = true;
    const activeTypes = Object.keys(MOVIE_TYPES).filter((t) => t !== "new" && types[t] !== false);
    for (const type of activeTypes) {
      try {
        const { list, source } = await fetchList(type, 10);
        if (list.length) {
          pushCache(st, type, list.map((m) => m.id).filter(Boolean));
          st.lastSources[type] = source;
        }
      } catch (e) {
        logger.warn?.("movie-notifier", `First-run ${type} gagal: ${e.message}`);
      }
    }
    saveState(st);
    if (targets.length && sock) {
      try {
        await sock.sendMessage(targets[0], {
          text: "🎬 *MOVIE NOTIFIER AKTIF*\n\n" +
            "📌 Aku bakal kirim notifikasi otomatis:\n" +
            "• 🔥 Film populer (Trending)\n" +
            "• 📅 Film terbaru (Upcoming)\n" +
            "• 🎥 Film rating tinggi (Now Playing)\n" +
            "• Dengan POSTER + preview card\n\n" +
            `⏰ Cek tiap ${getIntervalMs() / 60000} menit\n🔑 100% GRATIS, tanpa API key\n\n` +
            "💡 Ketik .movie <judul> buat cari film manual",
          contextInfo: { externalAdReply: { title: "MOVIE NOTIFIER", body: "aktif — sumber IMDb", sourceUrl: "https://www.imdb.com", mediaType: 1, renderLargerThumbnail: true, showAdAttribution: false } },
        });
        sent++;
      } catch { }
    }
  }

  // Diff per tipe + kirim card per-film (cap PER_TYPE_LIMIT, delay anti-spam)
  for (const type of Object.keys(MOVIE_TYPES)) {
    if (type === "new") continue;
    if (!force && types[type] === false) continue;
    let list = [], source = null;
    try {
      const r = await fetchList(type, 10);
      list = r.list;
      source = r.source;
    } catch (e) {
      logger.warn?.("movie-notifier", `Fetch ${type} gagal: ${e.message}`);
      summary[type] = 0;
      continue;
    }
    if (!list.length) { summary[type] = 0; continue; }

    const ids = list.map((m) => m.id).filter(Boolean);
    let fresh = [];
    if (force) {
      // .movienotify now → kirim sample teratas TANPA nyentuh cache
      fresh = list.slice(0, 2);
    } else {
      fresh = diffMovies(list, st.caches[type] || []);
      pushCache(st, type, ids); // semua id masuk cache → sisa cap gak dikirim ulang
      st.lastSources[type] = source;
      saveState(st);
    }
    if (!fresh.length) { summary[type] = 0; continue; }

    const capped = fresh.slice(0, PER_TYPE_LIMIT);
    for (const t of targets) {
      for (let i = 0; i < capped.length; i++) {
        const m = await enrichMovie(capped[i]);
        try { await sendMovieCardTo(sock, t, m, { type, index: i + 1, total: fresh.length }); sent++; }
        catch (e) { logger.error?.("movie-notifier", `Gagal kirim card ${type} ke ${t}: ${e.message}`); }
      }
    }
    summary[type] = fresh.length;
    logger.success?.("movie-notifier", `${fresh.length} film ${type} baru terkirim ke ${targets.length} chat (sumber ${source})`);
  }

  return { sent, summary, source: st.lastSources };
}

// ───────────────────────────── monitor & API switch/command ─────────────────────────────

function getIntervalMs() {
  const st = loadState();
  const m = Number(st.intervalMenit) || DEFAULT_INTERVAL_MENIT;
  return Math.min(720, Math.max(5, m)) * 60_000; // 5 menit – 12 jam
}

function isRunning() {
  return running || timer !== null;
}

function startMonitor() {
  if (isRunning()) return false;
  const st = loadState();
  if (!st.enabled || st.targets.length === 0) return false;
  running = true;
  runCheck().catch((e) => logger.error?.("movie-notifier", `runCheck gagal: ${e.message}`));
  timer = setInterval(() => {
    runCheck().catch((e) => logger.error?.("movie-notifier", `runCheck gagal: ${e.message}`));
  }, getIntervalMs());
  logger.success?.("movie-notifier", `Monitor aktif (${st.targets.length} chat — cek tiap ${getIntervalMs() / 60000} menit, IMDbOT → Cinemeta, 3 tipe film)`);
  return true;
}

function stopMonitor() {
  if (timer) clearInterval(timer);
  timer = null;
  running = false;
  return true;
}

export function syncMonitor() {
  const st = loadState();
  if (st.enabled && st.targets.length > 0) return { started: startMonitor() };
  if (isRunning()) stopMonitor();
  return { started: false };
}

function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

export function getStatus() {
  const st = loadState();
  return {
    ...st, running: isRunning(),
    intervalMenit: getIntervalMs() / 60000,
    cacheCounts: Object.fromEntries(Object.keys(st.caches).map((k) => [k, (st.caches[k] || []).length])),
  };
}

export function isEnabled() {
  return loadState().enabled;
}

export function setEnabled(on) {
  const st = loadState();
  st.enabled = !!on;
  if (on && st.targets.length === 0) {
    const owner = getOwnerJid();
    if (owner) st.targets.push(owner);
  }
  saveState(st);
  if (on) syncMonitor();
  else if (isRunning()) stopMonitor();
  return true;
}

export function addTarget(chatId) {
  const st = loadState();
  if (!st.targets.includes(chatId)) st.targets.push(chatId);
  saveState(st);
  syncMonitor();
  return st.targets;
}

export function removeTarget(chatId) {
  const st = loadState();
  st.targets = st.targets.filter((t) => t !== chatId);
  saveState(st);
  syncMonitor();
  return st.targets;
}

export function isTarget(chatId) {
  return loadState().targets.includes(chatId);
}

export function getContentTypes() {
  const d = defaultState().contentTypes;
  return { ...d, ...loadState().contentTypes };
}

export function setContentType(type, on) {
  const st = loadState();
  st.contentTypes ??= { ...defaultState().contentTypes };
  const all = ["trending", "upcoming", "nowplaying"];
  if (type === "semua" || type === "all") {
    for (const t of all) st.contentTypes[t] = !!on;
  } else if (all.includes(type)) {
    st.contentTypes[type] = !!on;
  } else return null;
  saveState(st);
  syncMonitor();
  return st.contentTypes;
}

/** Set interval cek (menit, 5–720). Restart monitor biar jalan. */
export function setIntervalMenit(menit) {
  const m = Number(menit);
  if (!m || m < 5 || m > 720) return null;
  const st = loadState();
  st.intervalMenit = m;
  saveState(st);
  if (isRunning()) {
    stopMonitor();
    syncMonitor();
  }
  return m;
}

export function initMovieNotifier(_sock) {
  setSock(_sock);
  const st = loadState();
  if (st.enabled && st.targets.length > 0) {
    startMonitor();
    logger.success?.("movie-notifier", "Resume monitor (state tersimpan: ON)");
  } else {
    logger.info?.("movie-notifier", "Idle (default OFF — aktifin via .switch auto automovienotifier on)");
  }
  return true;
}
