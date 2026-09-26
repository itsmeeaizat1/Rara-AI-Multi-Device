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
import { mergeAutoTargets } from "./nova-auto-target.js";
import config from "../../config.js";
import { logger } from "./nova-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "autoanimenotifier.json");
const DEFAULT_INTERVAL_MENIT = 30; // default 30 menit — bisa diset .animenotify interval <menit>
const MAX_SEEN = 300; // ala script: cache limit 500 → keep 300 terbaru
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
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(
        type: ANIME,
        sort: [UPDATED_AT_DESC, POPULARITY_DESC],
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
        coverImage { extraLarge large medium }
        description
        bannerImage
        trailer { id site thumbnail }
        externalLinks { site url }
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
        coverImage { extraLarge large medium }
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
    // ── TIPE KONTEN (request owner 8 Sep 2026: "banyak opsi yg mau di on") ──
    // episode: notif episode baru rilis (AniList)
    // baru   : anime baru masuk watchlist genre favorit (AniList → Kitsu)
    // terbaru: info anime baru mulai tayang (Kitsu — hidup walau AniList down)
    // hangat : anime paling diminati musim ini (Kitsu season)
    // berita : berita anime terbaru (RSS MyAnimeList — independen)
    // video  : episode/video hangat terbaru siap tonton (winbu.net)
    contentTypes: { episode: true, baru: true, terbaru: true, hangat: true, berita: true, video: false },
    digestIntervals: { terbaru: 12, hangat: 12, berita: 6, video: 6 }, // jam
    lastDigest: {}, // { terbaru: { ts, hash }, ... } — dedup konten digest
    // ── MODE LIST (request owner 10 Sep 2026: "klo anime notifier aktif jd
    // yg dikirim cm 1 info anime terbaru aja jgn spam smpe 5 info anime,
    // bentuk list jg off kecuali di on") ──
    // false (DEFAULT) = digest anime (terbaru/hangat) cuma kirim 1 CARD
    // anime TERBARU — gak ada spam 4-6 card + rangkuman.
    // true = mode lama: beberapa card + rangkuman sisa.
    listMode: false,
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
    st.contentTypes ??= d.contentTypes;
    st.digestIntervals ??= d.digestIntervals;
    st.lastDigest ??= d.lastDigest;
    st.listMode ??= d.listMode;
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
    score: m.averageScore ?? "N/A", // mentah 0-100 ala AniList (contoh owner: 85)
    startDate: m.startDate?.year ? `${m.startDate.day}/${m.startDate.month}/${m.startDate.year}` : "TBA",
    nextEpisode: m.nextAiringEpisode
      ? { episode: m.nextAiringEpisode.episode, timeUntil: Math.floor(m.nextAiringEpisode.timeUntilAiring / 3600) }
      : null,
    status: m.status || "Unknown",
    format: m.format || "Unknown",
    genres: m.genres || [],
    studios: m.studios?.nodes?.map((s) => s.name).join(", ") || "Unknown",
    cover: m.coverImage?.extraLarge || m.coverImage?.large || m.coverImage?.medium || null,
    description: m.description ? String(m.description).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "",
    banner: m.bannerImage || null,
    trailerThumb: m.trailer?.thumbnail || null,
    malUrl: m.externalLinks?.find?.((l) => l.site === "MyAnimeList")?.url || null,
    source: "AniList",
    pageUrl: m.id ? `https://anilist.co/anime/${m.id}` : null,
  };
}

// FIX v24.2.2 — `genre_in` AniList berperilaku AND (bukan OR): mengirim 11
// genre favorit membuat hasilnya 0 item → sumber UTAMA selalu kosong dan tiap
// check jatuh ke Kitsu (notif kurang kaya: skor N/A, tanpa info episode
// berikutnya). Sekarang query TANPA genre, preferensi genre disaring di sisi
// kita, dan kalau tak ada yang cocok tetap kirim (jangan sampai nol).
async function checkAniList(genres = []) {
  const res = await axios.post(
    ANILIST_ENDPOINT,
    { query: ANILIST_QUERY, variables: { page: 1, perPage: PER_PAGE } },
    { headers: HEADERS, timeout: 20_000 },
  );
  const list = (res.data?.data?.Page?.media || []).map(normAnilist);
  const want = (genres || []).map((g) => String(g).toLowerCase());
  if (want.length && list.length) {
    const cocok = list.filter((m) => (m.genres || []).some((g) => want.includes(String(g).toLowerCase())));
    if (cocok.length) return cocok;
  }
  return list;
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
      score: a.averageRating ? Math.round(parseFloat(a.averageRating)) : "N/A", // mentah 0-100 (selaras AniList)
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
          malUrl: a.malUrl || null, trailerThumb: a.trailerThumb || null,
          description: a.description || "",
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
    if (a.nextEpisode) msg += `   🕒 Episode ${a.nextEpisode.episode} rilis dalam ~${a.nextEpisode.timeUntil} jam\n`;
    const link = a.malUrl || a.pageUrl;
    if (link) msg += `   🔗 ${link}\n`;
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
    const st = a.status === "RELEASING" ? "🟢" : "🕒";
    msg += `${i + 1}. ${st} *${a.title}*\n`;
    msg += `   ⭐ ${a.score} | 📺 ${a.episodes} eps\n`;
    msg += `   🎭 ${a.genres?.slice(0, 3).join(", ") || "N/A"}\n`;
    if (a.nextEpisode) msg += `   🕒 Episode ${a.nextEpisode.episode} ~${a.nextEpisode.timeUntil} jam\n`;
    msg += `\n`;
  });
  msg += `📌 *${list.length} anime dipantau* — genre favorit\n`;
  msg += `📱 Sumber: ${source}`;
  return msg;
}

// ───────────────────── TIPE KONTEN DIGEST (8 Sep 2026) ─────────────────────
// AniList down → episode/baru bisu. Digest pakai sumber HIDUP:
// Kitsu (terbaru/hangat), RSS MyAnimeList (berita), winbu (video).

const DIGEST_TYPES = ["terbaru", "hangat", "berita", "video"];

// Label buat menu .animenotify info
export const DIGEST_LABELS = {
  episode: "Notif episode baru rilis (AniList)",
  baru: "Anime baru masuk watchlist genre favorit (AniList → Kitsu)",
  terbaru: "Info anime terbaru mulai tayang (Kitsu)",
  hangat: "Anime paling diminati musim ini (Kitsu)",
  berita: "Berita anime & manga terbaru (MyAnimeList)",
  video: "Episode & video hangat terbaru siap tonton (winbu)",
};
const DEFAULT_DIGEST_IV = { terbaru: 12, hangat: 12, berita: 6, video: 6 }; // jam

// Musim saat ini (penamaan Kitsu: winter/spring/summer/fall)
function currentSeasonInfo() {
  const now = new Date();
  const m = now.getMonth() + 1;
  let year = now.getFullYear();
  let season;
  if (m === 12 || m <= 2) { season = "winter"; if (m === 12) year += 1; }
  else if (m <= 5) season = "spring";
  else if (m <= 8) season = "summer";
  else season = "fall";
  return { season, year };
}

let kitsuHttp = null; // seam inject buat e2e (digest card 10 Sep 2026)
export function setKitsuHttp(fn) { kitsuHttp = fn; }
export function resetKitsuHttp() { kitsuHttp = null; }

async function kitsuGet(url) {
  if (kitsuHttp) return kitsuHttp(url);
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.api+json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Kitsu HTTP ${res.status}`);
  return res.json();
}

function mapKitsuAnime(x) {
  const a = x.attributes || {};
  return {
    title: a.canonicalTitle || a.titles?.en_jp || a.titles?.ja_jp || "N/A",
    startDate: a.startDate || "?",
    episodeCount: a.episodeCount || null,
    subtype: (a.subtype || "TV").toUpperCase(),
    rating: a.averageRating ? (Number(a.averageRating) / 10).toFixed(1) + "/10" : "N/A",
    userCount: a.userCount || 0,
    synopsis: a.synopsis || "",
    poster: a.posterImage?.large || a.posterImage?.medium || a.posterImage?.small || null,
    url: `https://kitsu.app/anime/${x.id}`,
  };
}

// INFO ANIME TERBARU — anime baru mulai tayang (sort -startDate, status current)
export async function getNewAiringAnime(limit = 10) {
  const j = await kitsuGet(
    `https://kitsu.io/api/edge/anime?filter[status]=current&sort=-startDate&page[limit]=${limit}`
  );
  return (j.data || []).map(mapKitsuAnime);
}

// ANIME HANGAT — paling diminati musim berjalan (season sort -userCount)
export async function getHotSeasonAnime(limit = 10) {
  const { season, year } = currentSeasonInfo();
  let j = { data: [] };
  try {
    j = await kitsuGet(
      `https://kitsu.io/api/edge/anime?filter[season]=${season}&filter[seasonYear]=${year}&sort=-userCount&page[limit]=${limit}`
    );
  } catch { /* fallback di bawah */ }
  if (!j.data?.length) {
    j = await kitsuGet(
      `https://kitsu.io/api/edge/anime?filter[status]=current&sort=-userCount&page[limit]=${limit}`
    );
  }
  return (j.data || []).map(mapKitsuAnime);
}

// decode entity XML/HTML (&#039; &amp; dll) — RSS MAL pake banyak entity
function decodeEntities(s) {
  return String(s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// BERITA ANIME — RSS MyAnimeList (independen dari AniList/Kitsu)
export async function getAnimeNews(limit = 8) {
  const res = await fetch("https://myanimelist.net/rss/news.xml", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NovaBot/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < limit) {
    const block = m[1];
    const pick = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return mm ? mm[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim() : "";
    };
    const title = pick("title");
    const link = pick("link");
    const date = pick("pubDate");
    if (title && link) items.push({ title: decodeEntities(title), link, date: decodeEntities(date) });
  }
  return items;
}

// VIDEO HANGAT — episode terbaru winbu.net (siap tonton/download)
export async function getLatestEpisodesInfo(limit = 5) {
  const wa = await import("./nova-auto-anime.js");
  const list = await wa.getOngoingAnimeList();
  if (!list?.length) return [];
  const out = [];
  for (const anime of list.slice(0, limit)) {
    try {
      const ep = await wa.getLatestEpisodeLink(anime.url);
      if (ep) out.push({ title: anime.title, number: ep.number, text: ep.text, url: ep.url, cover: anime.cover });
    } catch { /* skip 1 anime gagal */ }
  }
  return out;
}

function digestHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

export function formatTerbaruMessage(items) {
  if (!items?.length) return null;
  let msg = "🆕 *INFO ANIME TERBARU!\n";
  msg += `Sedang & Baru Mulai Tayang*\n\n`;
  items.slice(0, 8).forEach((a, i) => {
    msg += `${i + 1}. *${a.title}*\n`;
    msg += `   📅 Mulai tayang: ${a.startDate}\n`;
    msg += `   📺 ${a.subtype}${a.episodeCount ? ` | ${a.episodeCount} eps` : ""} | ⭐ ${a.rating}\n`;
    if (a.synopsis) msg += `   📖 ${a.synopsis.slice(0, 90).replace(/\n/g, " ")}...\n`;
    msg += `\n`;
  });
  msg += `📱 Sumber: Kitsu (realtime — jalan walau AniList down)`;
  return msg;
}

export function formatHangatMessage(items) {
  if (!items?.length) return null;
  let msg = "🔥 *ANIME HANGAT MUSIM INI!*\n\n";
  items.slice(0, 8).forEach((a, i) => {
    msg += `${i + 1}. *${a.title}*\n`;
    msg += `   ⭐ ${a.rating} | 👥 ${a.userCount.toLocaleString("id-ID")} peminat\n`;
    msg += `   📺 ${a.subtype}${a.episodeCount ? ` | ${a.episodeCount} eps` : ""}\n`;
    msg += `   🔗 ${a.url}\n\n`;
  });
  msg += `📱 Sumber: Kitsu (paling diminati musim ini)`;
  return msg;
}

export function formatBeritaMessage(items) {
  if (!items?.length) return null;
  let msg = "📰 *BERITA ANIME TERBARU!\n";
  msg += `Update Dunia Anime & Manga*\n\n`;
  items.slice(0, 8).forEach((n, i) => {
    msg += `${i + 1}. *${n.title}*\n`;
    msg += `   🔗 ${n.link}\n`;
    if (n.date) msg += `   📅 ${n.date}\n`;
    msg += `\n`;
  });
  msg += `📱 Sumber: MyAnimeList News`;
  return msg;
}

export function formatVideoMessage(items) {
  if (!items?.length) return null;
  let msg = "🎬 *EPISODE & VIDEO HANGAT TERBARU!\n";
  msg += `Siap Ditonton / Download*\n\n`;
  items.forEach((v, i) => {
    msg += `${i + 1}. *${v.title}*\n`;
    msg += `   📺 ${v.text} (Episode ${v.number})\n`;
    msg += `   ▶️ ${v.url}\n\n`;
  });
  msg += `📱 Sumber: winbu.net — ketik .winbu <judul> untuk cari/download`;
  return msg;
}

/**
 * CARD PER-ANIME untuk digest terbaru/hangat (request owner 10 Sep 2026:
 * "kn p g ada deskripsi ... cm mncul list doang tp 1 info thumbnail dan
 * info anime berserta deksripsi g muncul"). Sebelumnya kedua tipe ini dikirim
 * sebagai SATU pesan list — hangat bahkan tanpa sinopsis sama sekali.
 * Sekarang tiap anime = card sendiri: poster + info + SINOPSIS PENUH
 * di balik ℅readmore (bukan potongan 90 karakter).
 */
export function formatDigestCard(a, type = "terbaru", { index = 1, total = 1 } = {}) {
  if (!a) return null;
  const desc = String(a.synopsis || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  let msg = (type === "hangat" ? "🔥 ANIME HANGAT MUSIM INI!" : "🆕 INFO ANIME TERBARU!") + "\n\n";
  msg += `${index}. *${a.title}*\n`;
  msg += `   📅 Mulai tayang: ${a.startDate || "?"}\n`;
  msg += `   📺 ${a.subtype || "TV"}${a.episodeCount ? ` | ${a.episodeCount} eps` : ""} | ⭐ ${a.rating || "N/A"}\n`;
  if (type === "hangat") msg += `   👥 ${Number(a.userCount || 0).toLocaleString("id-ID")} peminat\n`;
  if (a.url) msg += `   🔗 ${a.url}\n`;
  msg += `📖 Deskripsi:${READMORE}${desc || "Sinopsis belum tersedia di sumber."}\n\n`;
  msg += `📌 ${type === "hangat" ? "Anime hangat" : "Info anime terbaru"} ${index}/${total} — Kitsu`;
  return msg;
}

export async function buildDigest(type, limit = 10) {
  try {
    if (type === "terbaru") {
      const items = await getNewAiringAnime(limit);
      if (!items.length) return null;
      const pic = items.find((i) => i.poster) || {};
      // sort=-StartDate sering item baru tanpa poster — fallback banner dari
      // anime hangat musim ini biar card tetep ada gambar anime
      let thumb = pic.poster || null;
      if (!thumb) {
        try { thumb = (await getHotSeasonAnime(1))[0]?.poster || null; } catch { thumb = null; }
      }
      return { text: formatTerbaruMessage(items), hash: digestHash(items.map((i) => i.title + i.startDate).join("|")), thumb, sourceUrl: pic.url || items[0].url, tagline: "Info anime terbaru", items };
    }
    if (type === "hangat") {
      const items = await getHotSeasonAnime(limit);
      if (!items.length) return null;
      const pic = items.find((i) => i.poster) || {};
      return { text: formatHangatMessage(items), hash: digestHash(items.map((i) => i.title + i.userCount).join("|")), thumb: pic.poster || null, sourceUrl: pic.url || items[0].url, tagline: "Anime hangat musim ini", items };
    }
    if (type === "berita") {
      const items = await getAnimeNews(limit);
      if (!items.length) return null;
      return { text: formatBeritaMessage(items), hash: digestHash(items.map((i) => i.title).join("|")), thumb: null, sourceUrl: "https://myanimelist.net/news", tagline: "Berita anime terbaru" };
    }
    if (type === "video") {
      const items = await getLatestEpisodesInfo(Math.min(limit, 5));
      if (!items.length) return null;
      const pic = items.find((i) => i.cover) || {};
      return { text: formatVideoMessage(items), hash: digestHash(items.map((i) => i.title + i.number + i.url).join("|")), thumb: pic.cover || null, sourceUrl: pic.url || items[0].url, tagline: "Episode & video hangat" };
    }
  } catch (e) {
    logger.error?.("anime-notifier", `Digest ${type} gagal: ${e.message}`);
    return null;
  }
  return null;
}

// API tipe konten buat command .animenotify info
export function getContentTypes() {
  const d = defaultState().contentTypes;
  return { ...d, ...loadState().contentTypes };
}

/** Mode list (request owner 10 Sep): OFF = cuma 1 info anime terbaru per digest. */
export function getListMode() {
  return loadState().listMode === true;
}

export function setListMode(on) {
  const st = loadState();
  st.listMode = !!on;
  saveState(st);
  return st.listMode;
}

export function setContentType(type, on) {
  const st = loadState();
  st.contentTypes ??= { ...defaultState().contentTypes };
  const all = ["episode", "baru", ...DIGEST_TYPES];
  if (type === "semua" || type === "all") {
    for (const t of all) st.contentTypes[t] = !!on;
  } else if (all.includes(type)) {
    st.contentTypes[type] = !!on;
  } else return null;
  saveState(st);
  syncMonitor();
  return st.contentTypes;
}

// ℅readmore WhatsApp: teks setelah tanda ini ke-collapse jadi "Baca selengkapnya"
const READMORE = "\u200E".repeat(4001);

// ─────────── caption PER-ANIME (preview card ala script owner 9 Sep) ───────────

export function formatNewAnimeCard(a, { index = 1, total = 1, source = "AniList" } = {}) {
  if (!a) return null;
  let msg = "🎌 ANIME BARU RILIS!\n\n";
  msg += `${index}. *${a.title}*\n`;
  msg += `   📺 ${a.format || "Unknown"} | ${a.status || "Unknown"}\n`;
  msg += `   📅 ${a.startDate || "TBA"}\n`;
  msg += `   ⭐ Score: ${a.score ?? "N/A"}\n`;
  msg += `   🎭 ${a.genres?.join(", ") || "N/A"}\n`;
  msg += `   🏢 ${a.studios || "Unknown"}\n`;
  const link = a.malUrl || a.pageUrl;
  if (link) msg += `   🔗 ${link}\n`;
  // deskripsi plain text di balik ℅readmore biar caption gak panjang ke bawah
  const desc = a.description ? String(a.description).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
  if (desc) msg += `   📖 Deskripsi:${READMORE}\n\n${desc}\n\n`;
  if (a.nextEpisode) msg += `   🕒 Episode ${a.nextEpisode.episode} rilis dalam ~${a.nextEpisode.timeUntil} jam\n\n`;
  msg += `📌 ${total} anime baru ditambahkan (ketersediaan sumber ${source}: ${total})`;
  return msg;
}

export function formatEpisodeCard(ep, { index = 1, total = 1, source = "AniList" } = {}) {
  if (!ep) return null;
  const time = ep.timeUntil > 24 ? `${Math.floor(ep.timeUntil / 24)} hari` : `${ep.timeUntil} jam`;
  let msg = "🎬 EPISODE BARU RILIS!\n\n";
  msg += `${index}. *${ep.title}*\n`;
  msg += `   📺 Episode ${ep.episode} rilis dalam ~${time}\n`;
  msg += `   ⭐ ${ep.score ?? "N/A"} | 🎭 ${ep.genres}\n`;
  msg += `   🏢 ${ep.studios}\n`;
  const link = ep.malUrl || ep.pageUrl;
  if (link) msg += `   🔗 ${link}\n`;
  const desc = ep.description ? String(ep.description).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
  if (desc) msg += `   📖 Deskripsi:${READMORE}\n\n${desc}\n\n`;
  msg += `📌 Total ${total} episode baru (ketersediaan sumber ${source}: ${total})`;
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
  // BANNER PREVIEW (request owner 8 Sep 2026): gambar anime yang diinfoin
  // dirender BESAR di atas card (renderLargerThumbnail), bukan thumbnail
  // kecil pojok. Thumb = poster/cover anime pertama di daftar.
  msg.contextInfo = {
    externalAdReply: {
      title: tagline || "ANIME NOTIFIER",
      body: "nova anime notifier • info anime & manga realtime",
      sourceUrl: sourceUrl || "https://anilist.co",
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: false,
      ...(thumb ? { thumbnail: thumb } : {}),
    },
  };
  await sock.sendMessage(chatId, msg);
  return true;
}

/**
 * PREVIEW CARD PER-ANIME (upgrade 9 Sep 2026, perpaduan script owner):
 * cover anime dikirim sebagai GAMBAR ASLI + caption info lengkap, plus
 * externalAdReply renderLargerThumbnail (banner besar, thumbnail = cover
 * sendiri). Cover gagal di-download → fallback ke trailer thumbnail →
 * fallback text + banner card biasa. Jeda antar-kirim 1 dtk (anti-spam WA).
 */
async function sendAnimeCard(chatId, a, type = "new", meta = {}) {
  if (!sock) return false;
  const isDigest = type === "terbaru" || type === "hangat";
  const caption = type === "episode"
    ? formatEpisodeCard(a, { index: meta.index || 1, total: meta.total || 1, source: meta.source || "AniList" })
    : isDigest
    ? formatDigestCard(a, type, { index: meta.index || 1, total: meta.total || 1 })
    : formatNewAnimeCard(a, { index: meta.index || 1, total: meta.total || 1, source: meta.source || "AniList" });
  if (!caption) return false;
  const url = a.cover || a.poster || a.banner || a.trailerThumb || null;
  const buf = url ? await downloadThumb(url) : null;
  const genreLine = Array.isArray(a.genres) ? a.genres.slice(0, 3).join(", ") : String(a.genres || "Anime").split(", ").slice(0, 3).join(", ");
  const bodyLine = isDigest
    ? (type === "hangat"
        ? `👥 ${Number(a.userCount || 0).toLocaleString("id-ID")} peminat musim ini`
        : `📺 ${a.subtype || "TV"} • mulai ${a.startDate || "tayang"}`)
    : `🎌 ${genreLine || "Anime"}`;
  try {
    if (buf) {
      await sock.sendMessage(chatId, {
        image: buf,
        caption,
        contextInfo: {
          externalAdReply: {
            title: a.title || "Anime Update",
            body: bodyLine,
            thumbnail: buf,
            sourceUrl: a.pageUrl || a.url || (a.anilistId ? `https://anilist.co/anime/${a.anilistId}` : "https://anilist.co"),
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: false,
          },
        },
      });
    } else {
      // fallback: text + banner card biasa (tanpa gambar asli)
      await sendAnimeNotification(chatId, caption, { thumbUrl: null, sourceUrl: a.pageUrl || a.url || null, tagline: a.title || null });
    }
  } catch (e) {
    logger.error?.("anime-notifier", `Gagal kirim card ke ${chatId}: ${e.message}`);
    try { await sendAnimeNotification(chatId, caption, { thumbUrl: null, sourceUrl: a.pageUrl || null }); } catch { }
  }
  await new Promise((r) => setTimeout(r, 1000));
  return true;
}

/**
 * Kirim digest konten. TERBARU & HANGAT = card PER-ANIME (request owner
 * 10 Sep 2026: tiap anime = poster + info + sinopsis penuh, bukan list
 * doang). BERITA & VIDEO tetap satu pesan text (kumpulan link).
 * Cap anti-spam: 4 card per digest per chat (6 kalau force/.animenotify now),
 * sisanya dirangkum 1 pesan judul.
 */
export async function dispatchDigest(type, dig, targets, { force = false } = {}) {
  if (!targets?.length || !dig) return 0;
  let sent = 0;
  if ((type === "terbaru" || type === "hangat") && Array.isArray(dig.items) && dig.items.length) {
    // MODE LIST (request owner 10 Sep): default OFF = cuma 1 card anime
    // TERBARU — gak spam 4-6 info. ON = beberapa card + rangkuman (mode lama).
    const listOn = loadState().listMode === true;
    const cap = listOn ? (force ? 6 : 4) : 1;
    const cards = dig.items.slice(0, cap);
    const sisa = listOn ? dig.items.slice(cap) : [];
    for (const t of targets) {
      for (let i = 0; i < cards.length; i++) {
        try { await sendAnimeCard(t, cards[i], type, { index: i + 1, total: dig.items.length }); sent++; }
        catch (e) { logger.error?.("anime-notifier", `Gagal kirim card ${type} ke ${t}: ${e.message}`); }
      }
      if (sisa.length) {
        const lines = sisa.map((a) => `• ${a.title}`).join("\n");
        try {
          await sendAnimeNotification(t, `${type === "hangat" ? "🔥" : "🆕"} *+${sisa.length} anime lainya:*\n\n${lines}`, { thumbUrl: null, sourceUrl: sisa[0]?.url || dig.sourceUrl, tagline: dig.tagline });
          sent++;
        } catch (e) {
          logger.error?.("anime-notifier", `Gagal kirim rangkuman ${type} ke ${t}: ${e.message}`);
        }
      }
    }
    return sent;
  }
  for (const t of targets) {
    try {
      await sendAnimeNotification(t, dig.text, { thumbUrl: dig.thumb, sourceUrl: dig.sourceUrl, tagline: dig.tagline });
      sent++;
    } catch (e) {
      logger.error?.("anime-notifier", `Gagal kirim digest ${type} ke ${t}: ${e.message}`);
    }
  }
  return sent;
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
  const targetsSnapshot = await mergeAutoTargets(sock, "autoanimenotifier", [...st.targets]);
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
    // JANGAN return — lanjut ke bawah biar digest konten (terbaru/hangat/
    // berita/video) langsung ikut terkirim saat aktivasi pertama.
    // Diff bakal kosong karena baseline barusan diset.
  }

  // Diff ala script — anime baru + episode baru
  // Tipe konten bisa dimatikan per-fitur (.animenotify info <tipe> off)
  const types = st.contentTypes || {};
  const diff = diffWatchlist(list, st.seenIds, st.episodes);
  const newAnime = types.baru === false ? [] : diff.newAnime;
  const newEpisodes = types.episode === false ? [] : diff.newEpisodes;

  // Merge-write race-safe: seenIds + episodes di-update di state fresh
  const fresh = loadState();
  fresh.seenIds = [...new Set([...fresh.seenIds, ...list.map((a) => a.id)])].slice(-MAX_SEEN);
  for (const a of list) if (a.nextEpisode) fresh.episodes[a.id] = a.nextEpisode.episode;
  for (const ep of newEpisodes) fresh.episodes[ep.id] = ep.episode;
  fresh.lastCheck = st.lastCheck;
  fresh.lastSource = st.lastSource;
  saveState(fresh);
  st = fresh;

  const targets = chatId ? [chatId] : targetsSnapshot;
  let sent = 0;

  // UPGRADE 9 Sep 2026 (perpaduan script owner): anime baru & episode baru
  // dikirim PER-ANIME sebagai preview card (gambar cover asli + caption +
  // banner externalAdReply) — bukan lagi satu pesan batch. Cap anti-spam
  // ala script: max 3 anime baru + 5 episode per check, jeda 1 dtk per card.
  if (newAnime.length > 0) {
    const capped = newAnime.slice(0, 3);
    for (const t of targets) {
      for (let i = 0; i < capped.length; i++) {
        try { await sendAnimeCard(t, capped[i], "new", { index: i + 1, total: newAnime.length, source }); sent++; }
        catch (e) { logger.error?.("anime-notifier", `Gagal kirim card anime ke ${t}: ${e.message}`); }
      }
    }
    if (newAnime.length > capped.length) {
      const sisa = newAnime.slice(3).map((a) => `• ${a.title}`).join("\n");
      for (const t of targets) {
        try { await sendAnimeNotification(t, `🎌 *+${newAnime.length - capped.length} anime baru lainya* masuk pantauan:\n\n${sisa}`, { thumbUrl: null, sourceUrl: newAnime[capped.length]?.pageUrl || null, tagline: "Anime baru masuk watchlist" }); sent++; }
        catch (e) { logger.error?.("anime-notifier", `Gagal kirim ringkasan ke ${t}: ${e.message}`); }
      }
    }
    logger.success?.("anime-notifier", `${capped.length} card anime baru (${newAnime.length} total) terkirim ke ${targets.length} chat`);
  }

  if (newEpisodes.length > 0) {
    const cappedEps = newEpisodes.slice(0, 5);
    for (const t of targets) {
      for (let i = 0; i < cappedEps.length; i++) {
        try { await sendAnimeCard(t, cappedEps[i], "episode", { index: i + 1, total: newEpisodes.length, source }); sent++; }
        catch (e) { logger.error?.("anime-notifier", `Gagal kirim card episode ke ${t}: ${e.message}`); }
      }
    }
    if (newEpisodes.length > cappedEps.length) {
      const sisaEp = newEpisodes.slice(5).map((e) => `• ${e.title} — Episode ${e.episode}`).join("\n");
      for (const t of targets) {
        try { await sendAnimeNotification(t, `🎬 *+${newEpisodes.length - cappedEps.length} episode baru lainya:*\n\n${sisaEp}`, { thumbUrl: null, sourceUrl: newEpisodes[cappedEps.length]?.pageUrl || null, tagline: "Episode baru rilis" }); sent++; }
        catch (e) { logger.error?.("anime-notifier", `Gagal kirim ringkasan episode ke ${t}: ${e.message}`); }
      }
    }
    logger.success?.("anime-notifier", `${cappedEps.length} card episode baru (${newEpisodes.length} total) terkirim ke ${targets.length} chat`);
  }

  // ── DIGEST KONTEN PERIODIK (terbaru/hangat/berita/video) ──
  // Sumber hidup walau AniList down. Tiap tipe punya interval + dedup hash
  // sendiri — konten sama gak dikirim ulang. force (`.animenotify now`) kirim
  // langsung semua tipe aktif ke chatId.
  const digestTargets = chatId ? [chatId] : await mergeAutoTargets(sock, "autoanimenotifier", st.targets);
  for (const type of DIGEST_TYPES) {
    if (types[type] === false) continue;
    const ivMs = ((st.digestIntervals || {})[type] || DEFAULT_DIGEST_IV[type]) * 3600e3;
    const last = (st.lastDigest || {})[type] || {};
    const due = force || !last.ts || Date.now() - last.ts >= ivMs;
    if (!due) continue;

    const dig = await buildDigest(type, force ? 6 : 10);
    if (!dig || !dig.text) continue; // fetch gagal → coba lagi tick berikutnya

    if (dig.hash === last.hash && !force) {
      // konten sama → geser timestamp biar gak dicek tiap tick
      const fresh = loadState();
      (fresh.lastDigest ??= {})[type] = { ts: Date.now(), hash: dig.hash };
      saveState(fresh);
      continue;
    }

    sent += await dispatchDigest(type, dig, digestTargets, { force });
    logger.success?.("anime-notifier", `Digest ${type} terkirim ke ${digestTargets.length} chat`);

    const fresh = loadState();
    (fresh.lastDigest ??= {})[type] = { ts: Date.now(), hash: dig.hash };
    saveState(fresh);
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

function getIntervalMs() {
  const st = loadState();
  const m = Number(st.intervalMenit) || DEFAULT_INTERVAL_MENIT;
  return Math.min(720, Math.max(5, m)) * 60_000; // 5 menit – 12 jam
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
  }, getIntervalMs());
  logger.success?.("anime-notifier", `Monitor aktif (${st.targets.length} chat — cek tiap ${getIntervalMs() / 60000} menit, AniList → Kitsu, notif anime + episode)`);
  return true;
}

/** Set interval cek (menit, 5–720). Restart monitor biar jalan. */
export function setIntervalMenit(menit) {
  const m = Number(menit);
  if (!m || m < 5 || m > 720) return null;
  const st = loadState();
  st.intervalMenit = m;
  saveState(st);
  // restart biar timer interval baru langsung kepakai
  if (isRunning()) {
    stopMonitor();
    syncMonitor();
  }
  return m;
}

function stopMonitor() {
  if (timer) clearInterval(timer);
  timer = null;
  autoRunning = false;
  return true;
}

export function syncMonitor() {
  const st = loadState();
  if (st.enabled && st.targets.length > 0) return { started: startMonitor() };
  if (isRunning()) stopMonitor();
  return { started: false };
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
    intervalMenit: getIntervalMs() / 60000,
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
