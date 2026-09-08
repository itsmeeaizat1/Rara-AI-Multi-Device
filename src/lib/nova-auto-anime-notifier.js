// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-auto-anime-notifier.js — Auto Anime Notifier V2 (rombak 8 Sep 2026,
// request owner: "tdk hanya notif anime terbaru tp biar ada notifikasi episode
// terbaru serta cmd manual .carianime" — ala script standalone owner).
//
// NOWEDANI (ala script owner):
//   • Notif ANIME BARU (genre favorit, status RELEASING/NOT_YET_RELEASED,
//     sort UPDATED_AT_DESC + description + cover)
//   • Notif EPISODE BARU (track nextAiringEpisode per anime — countdown rilis)
//   • Genre favorit configurable (.animenotify genre add/del/list)
//   • Search manual buat .carianime (export searchAnime)
//
// Sumber: AniList GraphQL (utama — satu2nya yang kasih data episode) →
// Kitsu (fallback pas AniList down — verified live 8 Sep 2026 pas AniList
// outage global; TANPA data episode → notif episode otomatis skip).
// Poll tiap 30 menit (ala script owner 1800000ms). Per-chat opt-in.
// Default OFF — dinyalakan via .switch auto autoanimenotifier on
// atau otomatis nyala kalau ada subscriber.

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import config from "../../config.js";
import { logger } from "./nova-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "data", "autoanimenotifier.json");
const CHECK_INTERVAL_MS = 1800_000; // 30 menit — ala script owner
const MAX_SEEN = 800;
const PER_PAGE = 20;

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const KITSU_ENDPOINT = "https://kitsu.io/api/edge";
const JIKAN_ENDPOINT = "https://api.jikan.moe/v4";

// Genre favorit default — persis script owner (bisa diubah via .animenotify genre)
const GENRE_DEFAULT = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Thriller",
];

const ANILIST_QUERY = `
  query ($page: Int, $perPage: Int, $genre: [String]) {
    Page(page: $page, perPage: $perPage) {
      media(
        type: ANIME,
        sort: [UPDATED_AT_DESC, START_DATE_DESC],
        genre_in: $genre,
        status_in: [RELEASING, NOT_YET_RELEASED]
      ) {
        id
        title { romaji english native }
        episodes
        averageScore
        status
        format
        startDate { year month day }
        nextAiringEpisode { episode timeUntilAiring }
        genres
        studios { nodes { name } }
        coverImage { medium }
        description
      }
    }
  }
`;

const ANILIST_SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(type: ANIME, search: $search) {
        id
        title { romaji english native }
        averageScore
        episodes
        status
        startDate { year month day }
        genres
        studios { nodes { name } }
        coverImage { medium }
        description
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

function enqueueCheck(fn) {
  const run = checkChain.then(fn, fn);
  checkChain = run.catch(() => {});
  return run;
}

// ───────────────────────────── state ─────────────────────────────

function defaultState() {
  return {
    enabled: false, targets: [], seenIds: [],
    episodes: {},           // { animeId: lastEpisode } — track episode baru
    genres: [...GENRE_DEFAULT], // genre favorit yang dipantau (ala script)
    initDone: false, lastCheck: null, lastSource: null,
  };
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return defaultState();
    const st = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const d = defaultState();
    st.enabled ??= d.enabled;
    st.targets ??= d.targets;
    st.seenIds ??= d.seenIds;
    st.episodes ??= d.episodes;
    st.genres ??= d.genres;
    st.initDone ??= d.initDone;
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

// ───────────────────────────── genre ─────────────────────────────

/** Kirim daftar watchlist TERKINI ke satu chat (manual: .animenotify anime). */
export async function previewWatchlist(chatId) {
  const { list, source } = await getWatchlist();
  const text = formatWatchlistMessage(list, { source });
  await sendAnimeNotification(chatId, text, { thumbUrl: list[0]?.cover, sourceUrl: list[0]?.pageUrl });
  return { count: list.length, source };
}

export function getGenres() {
  return [...loadState().genres];
}

/** Tambah genre (case-insensitive, Title Case). Return list baru. */
export function addGenre(name) {
  const st = loadState();
  const g = String(name || "").trim().replace(/\b\w/g, (c) => c.toUpperCase());
  if (!g) return { ok: false, genres: [...st.genres] };
  if (st.genres.map((x) => x.toLowerCase()).includes(g.toLowerCase())) {
    return { ok: false, dup: true, genres: [...st.genres] };
  }
  st.genres.push(g);
  saveState(st);
  return { ok: true, genres: [...st.genres] };
}

/** Hapus genre. Return { ok, genres }. */
export function removeGenre(name) {
  const st = loadState();
  const key = String(name || "").trim().toLowerCase();
  if (!st.genres.some((x) => x.toLowerCase() === key)) {
    return { ok: false, notfound: true, genres: [...st.genres] };
  }
  st.genres = st.genres.filter((x) => x.toLowerCase() !== key);
  saveState(st);
  return { ok: true, genres: [...st.genres] };
}

// ───────────────────────────── sumber data ─────────────────────────────

function normAnilist(m) {
  return {
    id: `al-${m.id}`,
    anilistId: m.id,
    title: m.title?.english || m.title?.romaji || m.title?.native || "N/A",
    episodes: m.episodes || "?",
    score: m.averageScore ? (m.averageScore / 10).toFixed(1) : "N/A",
    startDate: m.startDate?.year ? `${m.startDate.day}/${m.startDate.month}/${m.startDate.year}` : "TBA",
    nextEpisode: m.nextAiringEpisode
      ? { episode: m.nextAiringEpisode.episode, timeUntil: Math.floor(m.nextAiringEpisode.timeUntilAiring / 3600) }
      : null,
    status: m.status || "Unknown",
    format: m.format || "Unknown",
    genres: m.genres || [],
    studios: m.studios?.nodes?.map((s) => s.name).join(", ") || "Unknown",
    cover: m.coverImage?.medium || null,
    description: m.description ? String(m.description).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "",
    source: "AniList",
    pageUrl: m.id ? `https://anilist.co/anime/${m.id}` : null,
  };
}

async function checkAniList(genres) {
  const res = await axios.post(
    ANILIST_ENDPOINT,
    { query: ANILIST_QUERY, variables: { page: 1, perPage: PER_PAGE, genre: genres.length ? genres : null } },
    { headers: HEADERS, timeout: 20_000 },
  );
  return (res.data?.data?.Page?.media || []).map(normAnilist);
}

async function checkKitsu() {
  // GOTCHA: Kitsu nolak sort=-updatedAt (HTTP 500) — sort yang verified live: -startDate
  const url = `${KITSU_ENDPOINT}/anime?filter[status]=current&sort=-startDate&page[limit]=${PER_PAGE}`;
  const res = await axios.get(url, { headers: { ...HEADERS, Accept: "application/vnd.api+json" }, timeout: 20_000 });
  return (res.data?.data || []).map((x) => {
    const a = x.attributes || {};
    return {
      id: `k-${x.id}`,
      anilistId: null,
      title: a.canonicalTitle || a.titles?.en_jp || "N/A",
      episodes: a.episodeCount || "?",
      score: a.averageRating ? (parseFloat(a.averageRating) / 10).toFixed(1) : "N/A",
      startDate: a.startDate || "TBA",
      nextEpisode: null, // Kitsu gak kasih next airing — notif episode butuh AniList
      status: "RELEASING",
      format: a.subtype || "Unknown",
      genres: [],
      studios: "Unknown",
      cover: a.posterImage?.medium || a.posterImage?.small || null,
      description: a.synopsis ? String(a.synopsis).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "",
      source: "Kitsu",
      pageUrl: x.id ? `https://kitsu.io/anime/${x.id}` : null,
    };
  });
}

/** Rantai: AniList (utama) → Kitsu (fallback). Genre filter cuma di AniList. */
async function getWatchlist() {
  const st = loadState();
  try {
    const list = await checkAniList(st.genres);
    if (list.length) return { list, source: "AniList" };
    logger.warn?.("anime-notifier", "AniList kosong — fallback ke Kitsu");
  } catch (e) {
    logger.warn?.("anime-notifier", `AniList gagal (${e.message}) — fallback ke Kitsu`);
  }
  const list = await checkKitsu();
  return { list, source: "Kitsu" };
}

// ───────────────────────────── diff (ala script checkNewEpisodes) ─────────

/** Pure: deteksi anime baru + episode baru dari list terhadap state. TIDAK mutasi. */
export function diffWatchlist(list, seenIds, episodesMap) {
  const seen = new Set(seenIds || []);
  const eps = { ...(episodesMap || {}) };
  const newAnime = [];
  const newEpisodes = [];

  for (const a of list) {
    if (!seen.has(a.id)) newAnime.push(a);
    if (a.nextEpisode) {
      const lastEp = eps[a.id] || 0;
      if (a.nextEpisode.episode > lastEp) {
        newEpisodes.push({
          id: a.id, title: a.title, episode: a.nextEpisode.episode,
          timeUntil: a.nextEpisode.timeUntil,
          score: a.score, genres: a.genres?.join(", ") || "N/A",
          studios: a.studios, cover: a.cover, pageUrl: a.pageUrl,
        });
      }
    }
  }
  return { newAnime, newEpisodes };
}

// ───────────────────────────── search (.carianime) ─────────────────────────

/** Cari anime — AniList search → Kitsu text-search fallback. */
export async function searchAnime(query, limit = 5) {
  try {
    const res = await axios.post(
      ANILIST_ENDPOINT,
      { query: ANILIST_SEARCH_QUERY, variables: { search: query } },
      { headers: HEADERS, timeout: 15_000 },
    );
    const media = (res.data?.data?.Page?.media || []).slice(0, limit);
    if (media.length) return media.map(normAnilist);
  } catch (e) {
    logger.warn?.("anime-notifier", `AniList search gagal (${e.message}) — fallback Kitsu`);
  }
  const url = `${KITSU_ENDPOINT}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}`;
  const res = await axios.get(url, { headers: { ...HEADERS, Accept: "application/vnd.api+json" }, timeout: 15_000 });
  return (res.data?.data || []).map((x) => {
    const a = x.attributes || {};
    return {
      id: `k-${x.id}`, anilistId: null,
      title: a.canonicalTitle || a.titles?.en_jp || "N/A",
      episodes: a.episodeCount || "?",
      score: a.averageRating ? (parseFloat(a.averageRating) / 10).toFixed(1) : "N/A",
      startDate: a.startDate || "TBA", nextEpisode: null,
      status: a.status === "current" ? "RELEASING" : (a.status || "Unknown").toUpperCase(),
      format: a.subtype || "Unknown",
      genres: [],
      studios: "Unknown",
      cover: a.posterImage?.medium || a.posterImage?.small || null,
      description: a.synopsis ? String(a.synopsis).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "",
      source: "Kitsu",
      pageUrl: x.id ? `https://kitsu.io/anime/${x.id}` : null,
    };
  });
}

/** Jikan/MAL seasonal — buat command manual .animenotify season. */
export async function getSeasonPreview(limit = 10) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const season = month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "fall";
  // Jikan sering 504 pas MAL sibuk — 1x retry dengan jeda
  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await axios.get(`${JIKAN_ENDPOINT}/seasons/${year}/${season}`, { headers: HEADERS, timeout: 15_000 });
      break;
    } catch (e) {
      if (attempt === 0 && String(e?.response?.status) === "504") {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw e;
    }
  }
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

// ───────────────────────────── format pesan ─────────────────────────────

export function formatNewAnimeMessage(animeList) {
  if (!animeList?.length) return null;
  let msg = "🎌 *ANIME BARU TERDETEKSI!*\n\n";
  animeList.slice(0, 5).forEach((a, i) => {
    msg += `${i + 1}. *${a.title}*\n`;
    msg += `   📺 ${a.format} | ${a.status}\n`;
    msg += `   📅 ${a.startDate}\n`;
    msg += `   ⭐ Score: ${a.score}\n`;
    msg += `   🎭 ${a.genres?.join(", ") || "N/A"}\n`;
    msg += `   🏢 ${a.studios}\n`;
    if (a.description) msg += `   📖 ${a.description.slice(0, 150)}...\n`;
    if (a.nextEpisode) msg += `   ⏳ Episode ${a.nextEpisode.episode} rilis dalam ~${a.nextEpisode.timeUntil} jam\n`;
    msg += `\n`;
  });
  msg += `📌 *${animeList.length} anime baru* ditambahkan ke pantauan`;
  return msg;
}

export function formatEpisodeMessage(episodes) {
  if (!episodes?.length) return null;
  let msg = "🎬 *EPISODE BARU RILIS!*\n\n";
  episodes.slice(0, 7).forEach((ep, i) => {
    const time = ep.timeUntil > 24
      ? `${Math.floor(ep.timeUntil / 24)} hari`
      : `${ep.timeUntil} jam`;
    msg += `${i + 1}. *${ep.title}*\n`;
    msg += `   📺 Episode ${ep.episode} rilis dalam ~${time}\n`;
    msg += `   ⭐ ${ep.score} | 🎭 ${ep.genres}\n`;
    msg += `   🏢 ${ep.studios}\n\n`;
  });
  msg += `📌 Total ${episodes.length} episode baru`;
  return msg;
}

export function formatWatchlistMessage(list, { source = "AniList" } = {}) {
  if (!list?.length) return "Tidak ada anime ditemukan.";
  let msg = "🎌 *ANIME TERBARU / RELEASING*\n\n";
  list.slice(0, 10).forEach((a, i) => {
    const st = a.status === "RELEASING" ? "🟢" : "⏳";
    msg += `${i + 1}. ${st} *${a.title}*\n`;
    msg += `   ⭐ ${a.score} | 📺 ${a.episodes} eps\n`;
    msg += `   🎭 ${a.genres?.slice(0, 3).join(", ") || "N/A"}\n`;
    if (a.nextEpisode) msg += `   ⏳ Episode ${a.nextEpisode.episode} ~${a.nextEpisode.timeUntil} jam\n`;
    msg += `\n`;
  });
  msg += `📌 *${list.length} anime dipantau* — genre favorit\n`;
  msg += `📱 Sumber: ${source}`;
  return msg;
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

async function sendAnimeNotification(chatId, text, { thumbUrl = null, sourceUrl = null, tagline = null } = {}) {
  if (!sock) return false;
  const msg = { text };
  const thumb = thumbUrl ? await downloadThumb(thumbUrl) : null;
  msg.contextInfo = {
    externalAdReply: {
      title: "ANIME NOTIFIER",
      body: tagline || "Auto notifikasi anime & episode terbaru",
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
 * Cek watchlist — kirim notif ANIME BARU + EPISODE BARU ke subscriber.
 * RACE FIX: dijalain via enqueueCheck (serial) + merge-write state fresh.
 */
export function runCheck(opts = {}) {
  return enqueueCheck(() => doRunCheck(opts));
}

async function doRunCheck({ force = false, chatId = null } = {}) {
  let st = loadState();
  const { list, source } = await getWatchlist();
  const targetsSnapshot = [...st.targets];
  st = loadState(); // fresh
  st.lastCheck = new Date().toISOString();
  st.lastSource = source;

  // First-run: baseline semua seen + episodes, kirim contoh ke subscriber baru
  if (!st.initDone) {
    st.seenIds = list.map((a) => a.id);
    for (const a of list) if (a.nextEpisode) st.episodes[a.id] = a.nextEpisode.episode;
    st.initDone = true;
    saveState(st);
    const targets = chatId ? [chatId] : targetsSnapshot;
    const text = `🔔 *ANIME NOTIFIER AKTIF*\n\nBerikut anime yang sedang dipantau (${st.genres.length} genre favorit):\n\n${formatWatchlistMessage(list, { source })}\n\n— contoh daftar TERKINI. Mulai sekarang anime BARU & EPISODE BARU otomatis masuk ke chat ini tiap 30 menit.`;
    for (const t of targets) {
      try { await sendAnimeNotification(t, text, { thumbUrl: list[0]?.cover, sourceUrl: list[0]?.pageUrl }); }
      catch (e) { logger.error?.("anime-notifier", `Gagal kirim ke ${t}: ${e.message}`); }
    }
    return { sent: targets.length, newAnime: 0, newEpisodes: 0, sample: true, source };
  }

  // Diff ala script — anime baru + episode baru
  const { newAnime, newEpisodes } = diffWatchlist(list, st.seenIds, st.episodes);

  // Merge-write race-safe: seenIds + episodes di-update di state fresh
  const fresh = loadState();
  fresh.seenIds = [...new Set([...fresh.seenIds, ...list.map((a) => a.id)])].slice(-MAX_SEEN);
  for (const a of list) if (a.nextEpisode) fresh.episodes[a.id] = a.nextEpisode.episode;
  for (const ep of newEpisodes) fresh.episodes[ep.id] = ep.episode;
  fresh.lastCheck = st.lastCheck;
  fresh.lastSource = st.lastSource;
  saveState(fresh);
  st = fresh;

  const targets = chatId ? [chatId] : st.targets;
  let sent = 0;

  if (newAnime.length > 0) {
    const text = formatNewAnimeMessage(newAnime);
    for (const t of targets) {
      try { await sendAnimeNotification(t, text, { thumbUrl: newAnime[0]?.cover, sourceUrl: newAnime[0]?.pageUrl, tagline: "Anime baru masuk watchlist" }); sent++; }
      catch (e) { logger.error?.("anime-notifier", `Gagal kirim ke ${t}: ${e.message}`); }
    }
    logger.success?.("anime-notifier", `${newAnime.length} anime baru terkirim ke ${targets.length} chat`);
  }

  if (newEpisodes.length > 0) {
    const text = formatEpisodeMessage(newEpisodes);
    for (const t of targets) {
      try { await sendAnimeNotification(t, text, { thumbUrl: newEpisodes[0]?.cover, sourceUrl: newEpisodes[0]?.pageUrl, tagline: "Episode baru rilis" }); sent++; }
      catch (e) { logger.error?.("anime-notifier", `Gagal kirim ke ${t}: ${e.message}`); }
    }
    logger.success?.("anime-notifier", `${newEpisodes.length} episode baru terkirim ke ${targets.length} chat`);
  }

  if (sent === 0 && force && chatId) {
    const text = formatWatchlistMessage(list, { source });
    await sendAnimeNotification(chatId, text, { thumbUrl: list[0]?.cover, sourceUrl: list[0]?.pageUrl });
    return { sent: 1, newAnime: 0, newEpisodes: 0, sample: false, source };
  }

  return { sent, newAnime: newAnime.length, newEpisodes: newEpisodes.length, sample: false, source };
}

// ───────────────────────────── monitor ─────────────────────────────

let autoRunning = false;

function isRunning() {
  return autoRunning || timer !== null;
}

function startMonitor() {
  if (isRunning()) return false;
  const st = loadState();
  if (!st.enabled) return false;
  if (st.targets.length === 0) return false;
  autoRunning = true;
  runCheck().catch((e) => logger.error?.("anime-notifier", `runCheck gagal: ${e.message}`));
  timer = setInterval(() => {
    runCheck().catch((e) => logger.error?.("anime-notifier", `runCheck gagal: ${e.message}`));
  }, CHECK_INTERVAL_MS);
  logger.success?.("anime-notifier", `Monitor aktif (${st.targets.length} chat — cek tiap ${CHECK_INTERVAL_MS / 60000} menit, AniList → Kitsu, notif anime + episode)`);
  return true;
}

function stopMonitor() {
  if (timer) clearInterval(timer);
  timer = null;
  autoRunning = false;
  return true;
}

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
  return {
    ...st, running: isRunning(), seenCount: st.seenIds.length,
    trackedEpisodes: Object.keys(st.episodes).length,
    intervalMenit: CHECK_INTERVAL_MS / 60000,
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

export function setSock(_sock) {
  if (_sock) sock = _sock;
}

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
