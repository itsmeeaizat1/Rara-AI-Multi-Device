// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-anime-notifier.js — Auto Anime Notifier (request owner 8 Sep 2026)
// Sumber: AniList GraphQL (utama, ala script owner) → Kitsu (fallback pas
// AniList down — verified live 8 Sep 2026 pas AniList outage global).
// Jikan/MAL hanya buat command manual .animenotify season.
// Poll tiap 1 jam (CHECK_INTERVAL ala script owner 3600000ms) — anime RELEASING
// baru dikirim ke semua chat subscriber. First-run: tandain semua seen + kirim
// contoh 5 teratas sebagai bukti pipeline jalan (konvensi activation sample).
// Default OFF (aturan automasi bot) — dinyalakan via .switch auto autoanimenotifier on.

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import config from "../../config.js";
import { logger } from "./nova-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "data", "autoanimenotifier.json");
const CHECK_INTERVAL_MS = 3600_000; // 1 jam — ala script owner
const MAX_SEEN = 500;
const PER_PAGE = 20; // ala script owner (perPage: 20)

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const KITSU_ENDPOINT = "https://kitsu.io/api/edge";
const JIKAN_ENDPOINT = "https://api.jikan.moe/v4";

const ANILIST_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: START_DATE_DESC, status: RELEASING) {
        id
        title { romaji english native }
        episodes
        averageScore
        startDate { year month day }
        nextAiringEpisode { episode timeUntilAiring }
        status
        format
        coverImage { medium }
        studios { nodes { name } }
      }
    }
  }
`;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
};

let sock = null;
let timer = null;
let checkChain = Promise.resolve(); // serialisasi runCheck — anti race condition

/** Jalanin fn satu-per-satu (gak pernah concurrent). Return hasil fn. */
function enqueueCheck(fn) {
  const run = checkChain.then(fn, fn);
  checkChain = run.catch(() => {}); // antrean lanjut walau satu check gagal
  return run;
}

// ───────────────────────────── state ─────────────────────────────

function defaultState() {
  return { enabled: false, targets: [], seenIds: [], initDone: false, lastCheck: null, lastSource: null };
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return defaultState();
    const st = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    st.enabled ??= false;
    st.targets ??= [];
    st.seenIds ??= [];
    st.initDone ??= false;
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
    logger.error?.("anime-notifier", `Save state gagal: ${e.message}`);
  }
}

// ───────────────────────────── sumber data ─────────────────────────────

/** AniList GraphQL — anime RELEASING, sort tanggal mulai terbaru (ala script). */
async function checkAniList() {
  const res = await axios.post(
    ANILIST_ENDPOINT,
    { query: ANILIST_QUERY, variables: { page: 1, perPage: PER_PAGE } },
    { headers: HEADERS, timeout: 20_000 },
  );
  const media = res.data?.data?.Page?.media || [];
  return media.map((m) => ({
    id: `al-${m.id}`,
    title: m.title?.english || m.title?.romaji || m.title?.native || "N/A",
    episodes: m.episodes || "?",
    score: m.averageScore ? (m.averageScore / 10).toFixed(1) : "N/A",
    startDate: m.startDate?.year ? `${m.startDate.day}/${m.startDate.month}/${m.startDate.year}` : "TBA",
    nextEpisode: m.nextAiringEpisode
      ? { episode: m.nextAiringEpisode.episode, timeUntil: Math.floor(m.nextAiringEpisode.timeUntilAiring / 3600) }
      : null,
    status: m.status || "Unknown",
    format: m.format || "Unknown",
    cover: m.coverImage?.medium || null,
    studios: m.studios?.nodes?.map((s) => s.name).join(", ") || "Unknown",
    source: "AniList",
    pageUrl: m.id ? `https://anilist.co/anime/${m.id}` : null,
  }));
}

/** Kitsu fallback — anime status current, sort startDate desc. Live 8 Sep 2026. */
async function checkKitsu() {
  const url = `${KITSU_ENDPOINT}/anime?filter[status]=current&sort=-startDate&page[limit]=${PER_PAGE}`;
  const res = await axios.get(url, { headers: { ...HEADERS, Accept: "application/vnd.api+json" }, timeout: 20_000 });
  const rows = res.data?.data || [];
  return rows.map((x) => {
    const a = x.attributes || {};
    const idNum = x.id;
    return {
      id: `k-${idNum}`,
      title: a.canonicalTitle || a.titles?.en_jp || "N/A",
      episodes: a.episodeCount || "?",
      score: a.averageRating ? (parseFloat(a.averageRating) / 10).toFixed(1) : "N/A",
      startDate: a.startDate || "TBA",
      nextEpisode: null, // Kitsu gak kasih info next airing
      status: "RELEASING",
      format: a.subtype || "Unknown",
      cover: a.posterImage?.medium || a.posterImage?.small || null,
      studios: "Unknown",
      source: "Kitsu",
      pageUrl: idNum ? `https://kitsu.io/anime/${idNum}` : null,
    };
  });
}

/** Rantai: AniList (utama) → Kitsu (fallback). Return { list, source }. */
async function getReleasing() {
  try {
    const list = await checkAniList();
    if (list.length) return { list, source: "AniList" };
    logger.warn?.("anime-notifier", "AniList kosong — fallback ke Kitsu");
  } catch (e) {
    logger.warn?.("anime-notifier", `AniList gagal (${e.message}) — fallback ke Kitsu`);
  }
  const list = await checkKitsu();
  return { list, source: "Kitsu" };
}

/** Jikan/MAL seasonal — buat command manual .animenotify season. */
export async function getSeasonPreview(limit = 10) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const season = month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "fall";
  const res = await axios.get(`${JIKAN_ENDPOINT}/seasons/${year}/${season}`, { headers: HEADERS, timeout: 15_000 });
  const data = res.data?.data || [];
  return {
    season, year,
    list: data.slice(0, limit).map((a) => ({
      title: a.title || "N/A",
      episodes: a.episodes || "?",
      score: a.score || "N/A",
      status: a.status || "Unknown",
      synopsis: String(a.synopsis || "Tidak ada synopsis").replace(/\s+/g, " ").slice(0, 120),
      image: a.images?.jpg?.image_url || null,
      year: a.year || year,
      genres: a.genres?.map((g) => g.name).join(", ") || "Unknown",
    })),
  };
}

// ───────────────────────────── format pesan ─────────────────────────────

/** Format ala script owner: emoji field per baris. */
export function formatAnimeMessage(animeList, { isNew = false, source = "AniList" } = {}) {
  if (!animeList || animeList.length === 0) return "Tidak ada anime baru ditemukan.";
  let msg = isNew ? "🎌 *ANIME BARU TAYANG*\n\n" : "🎌 *ANIME TERBARU / RELEASING*\n\n";
  animeList.slice(0, 5).forEach((a, i) => {
    msg += `${i + 1}. *${a.title}*\n`;
    msg += `   📺 Status: ${a.status} | ${a.format}\n`;
    msg += `   📅 Mulai: ${a.startDate}\n`;
    msg += `   🎬 Episode: ${a.episodes}\n`;
    msg += `   ⭐ Score: ${a.score}\n`;
    if (a.nextEpisode) {
      msg += `   ⏳ Episode ${a.nextEpisode.episode} tayang dalam ~${a.nextEpisode.timeUntil} jam\n`;
    }
    msg += `   🎨 Studio: ${a.studios}\n`;
    msg += `\n`;
  });
  msg += `📌 *${animeList.length} anime sedang tayang*\n`;
  msg += `📱 Sumber: ${source} — cek selengkapnya di AniList / MyAnimeList`;
  return msg;
}

export function formatSeasonMessage(season) {
  let reply = `📺 *Seasonal Anime — ${season.season.toUpperCase()} ${season.year}*\n\n`;
  season.list.forEach((a, i) => {
    reply += `${i + 1}. *${a.title}*\n`;
    reply += `   ⭐ Score: ${a.score} | 📅 ${a.year}\n`;
    reply += `   🎭 Genre: ${a.genres}\n`;
    reply += `   📖 ${a.synopsis}...\n\n`;
  });
  return reply;
}

// ───────────────────────────── kirim ─────────────────────────────

async function downloadThumb(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 15_000, responseType: "arraybuffer" });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

async function sendAnimeNotification(chatId, text, { thumbUrl = null, sourceUrl = null } = {}) {
  if (!sock) return false;
  const msg = { text };
  const thumb = thumbUrl ? await downloadThumb(thumbUrl) : null;
  msg.contextInfo = {
    externalAdReply: {
      title: "ANIME NOTIFIER",
      body: "Auto notifikasi anime terbaru",
      sourceUrl: sourceUrl || "https://anilist.co",
      mediaType: 1,
      renderLargerThumbnail: false,
      ...(thumb ? { thumbnail: thumb } : {}),
    },
  };
  await sock.sendMessage(chatId, msg);
  return true;
}

// ───────────────────────────── core check ─────────────────────────────

/**
 * Cek anime releasing — kirim yang BARU ke semua target (ala script checkNewAnime).
 * RACE FIX: dijalain lewat enqueueCheck (serial) dan pas nyimpen seenIds/initDone
 * di-merge ke state FRESH dari disk — addTarget/setEnabled dari command lain yang
 * kejadian di sela fetch gak pernah ketimpa snapshot basi.
 */
export function runCheck(opts = {}) {
  return enqueueCheck(() => doRunCheck(opts));
}

async function doRunCheck({ force = false, chatId = null } = {}) {
  let st = loadState();
  const { list, source } = await getReleasing();
  const targetsSnapshot = [...st.targets]; // target di snapshot awal (kirim sample ke sini)
  st = loadState(); // state fresh — merge write di bawah gak nimpa perubahan lain
  st.lastCheck = new Date().toISOString();
  st.lastSource = source;

  // First-run: tandain semua seen + kirim contoh 5 teratas (activation sample)
  if (!st.initDone) {
    st.seenIds = list.map((a) => a.id);
    st.initDone = true;
    saveState(st);
    const targets = chatId ? [chatId] : targetsSnapshot;
    const text = `🔔 *ANIME NOTIFIER AKTIF*\n\nBerikut anime yang sedang tayang saat ini:\n\n${formatAnimeMessage(list, { source })}\n\n— contoh daftar TERKINI. Mulai sekarang anime BARU otomatis masuk ke chat ini tiap jam.`;
    for (const t of targets) {
      try { await sendAnimeNotification(t, text, { thumbUrl: list[0]?.cover, sourceUrl: list[0]?.pageUrl }); }
      catch (e) { logger.error?.("anime-notifier", `Gagal kirim ke ${t}: ${e.message}`); }
    }
    return { sent: targets.length, newCount: 0, sample: true, source };
  }

  // Cek yang benar-benar baru — merge seenIds ke state fresh (race-safe)
  const newAnime = list.filter((a) => !st.seenIds.includes(a.id));
  const fresh = loadState();
  fresh.seenIds = [...new Set([...fresh.seenIds, ...newAnime.map((a) => a.id)])].slice(-MAX_SEEN);
  fresh.lastCheck = st.lastCheck;
  fresh.lastSource = st.lastSource;
  saveState(fresh);
  st = fresh;

  if (newAnime.length > 0) {
    const targets = chatId ? [chatId] : st.targets;
    const text = formatAnimeMessage(newAnime, { isNew: true, source });
    for (const t of targets) {
      try { await sendAnimeNotification(t, text, { thumbUrl: newAnime[0]?.cover, sourceUrl: newAnime[0]?.pageUrl }); }
      catch (e) { logger.error?.("anime-notifier", `Gagal kirim ke ${t}: ${e.message}`); }
    }
    logger.success?.("anime-notifier", `${newAnime.length} anime baru terkirim ke ${targets.length} chat`);
    return { sent: targets.length, newCount: newAnime.length, sample: false, source };
  }

  // Force (command .animenotify now): gak ada yang baru → kirim daftar terkini
  if (force && chatId) {
    const text = formatAnimeMessage(list, { source });
    await sendAnimeNotification(chatId, text, { thumbUrl: list[0]?.cover, sourceUrl: list[0]?.pageUrl });
    return { sent: 1, newCount: 0, sample: false, source };
  }

  return { sent: 0, newCount: 0, sample: false, source };
}

// ───────────────────────────── monitor ─────────────────────────────

function isRunning() {
  return timer !== null;
}

function startMonitor() {
  if (isRunning()) return false;
  const st = loadState();
  if (!st.enabled) return false; // dipause via .switch
  if (st.targets.length === 0) return false; // gak ada subscriber
  runCheck().catch((e) => logger.error?.("anime-notifier", `runCheck gagal: ${e.message}`));
  timer = setInterval(() => {
    runCheck().catch((e) => logger.error?.("anime-notifier", `runCheck gagal: ${e.message}`));
  }, CHECK_INTERVAL_MS);
  logger.success?.("anime-notifier", `Monitor aktif (${st.targets.length} chat — cek tiap ${CHECK_INTERVAL_MS / 60000} menit, AniList → Kitsu)`);
  return true;
}

function stopMonitor() {
  if (timer) clearInterval(timer);
  timer = null;
  return true;
}

/** Sinkron timer dengan state — dipanggil tiap subscriber/flag berubah. */
export function syncMonitor() {
  const st = loadState();
  if (st.enabled && st.targets.length > 0) startMonitor();
  else if (isRunning()) stopMonitor();
}

// ───────────────────────────── API switch/command ─────────────────────────────

function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (!ownerNumbers.length) return null;
  const num = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  return num ? `${num}@s.whatsapp.net` : null;
}

export function getStatus() {
  const st = loadState();
  return { ...st, running: isRunning(), seenCount: st.seenIds.length, intervalMenit: CHECK_INTERVAL_MS / 60000 };
}

export function isEnabled() {
  return loadState().enabled;
}

/** Toggle global dari .switch auto autoanimenotifier on/off.
 *  OFF = timer berhenti, subscriber TETAP tersimpan (kayak bencanawatch).
 *  ON dengan target kosong = auto-add owner (ala TARGET_NUMBER script owner). */
export function setEnabled(on) {
  const st = loadState();
  st.enabled = !!on;
  if (on && st.targets.length === 0) {
    const owner = getOwnerJid();
    if (owner) st.targets.push(owner); // TARGET_NUMBER ala script → owner default
  }
  saveState(st);
  if (on) {
    syncMonitor();
    logger.success?.("anime-notifier", "Auto anime notifier: ON via .switch (subscriber tetap)");
  } else {
    stopMonitor();
    logger.success?.("anime-notifier", "Auto anime notifier: OFF via .switch (subscriber & pengaturan tetap)");
  }
  return !!on;
}

export function addTarget(chatId) {
  const st = loadState();
  if (!st.targets.includes(chatId)) st.targets.push(chatId);
  saveState(st);
  syncMonitor(); // nyalain timer kalau flag ON & baru ada subscriber pertama
  return st.targets;
}

export function removeTarget(chatId) {
  const st = loadState();
  st.targets = st.targets.filter((t) => t !== chatId);
  saveState(st);
  syncMonitor(); // subscriber terakhir off → timer berhenti otomatis
  return st.targets;
}

export function isTarget(chatId) {
  return loadState().targets.includes(chatId);
}

export function setSock(_sock) {
  if (_sock) sock = _sock;
}

/** Dipanggil dari index.js schedulerInits pas bot start. */
export function initAnimeNotifier(_sock) {
  setSock(_sock);
  const st = loadState();
  if (st.enabled && st.targets.length > 0) {
    startMonitor();
    logger.success?.("anime-notifier", "Resume monitor (state tersimpan: ON)");
  } else {
    logger.info?.("anime-notifier", "Idle (default OFF — aktifin via .switch auto autoanimenotifier on)");
  }
  return true;
}
