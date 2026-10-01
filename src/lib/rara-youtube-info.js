// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-youtube-info.js — info YouTube jadi AI RICH ala contoh owner (10 Sep 2026:
// script "!youtube" rich bot — thumbnail + table info + deskripsi, Piped API
// TANPA KEY). Dipakai .yts (plugins/search/yts.js).
// Rantai: Piped instances (4, verbatim contoh owner) → fallback yt-search.
// Rich build via rara-rich-response.js (GenAI primitives + relayMessage).
import { buildRichResponse } from "./rara-rich-response.js";
import { logger } from "./rara-logger.js";

// ===== PIPED API (TANPA KEY) — verbatim contoh owner =====
// Urutan: live-verified 10 Sep 2026 duluan (ducks.party + private.coffee),
// daftar asli script owner di belakang (kalau hidup lagi otomatis kepakai).
const PIPED_INSTANCES = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
  "https://pipedapi.reallyaweso.me",
];
const PIPED_TIMEOUT_MS = 15_000;

// seam http buat e2e — (url, timeoutMs) => json
let pipedHttp = defaultPipedHttp;
let ytsSearch = null; // injectable fallback search (query) => {videos:[...]} ala yt-search
export function setPipedHttp(fn) { pipedHttp = fn || defaultPipedHttp; }
export function setYtsSearch(fn) { ytsSearch = fn; }
export function resetYouTubeDeps() { pipedHttp = defaultPipedHttp; ytsSearch = null; }

async function defaultPipedHttp(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(PIPED_TIMEOUT_MS),
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Search YouTube via Piped (filter: videos) — return items[] | []. */
export async function pipedSearch(query, filter = "videos") {
  for (const instance of PIPED_INSTANCES) {
    try {
      const data = await pipedHttp(`${instance}/search?q=${encodeURIComponent(query)}&filter=${filter}`);
      if (data?.items?.length) return data.items;
    } catch (e) {
      logger.debug?.("piped", `${instance} failed, trying next...`);
    }
  }
  return [];
}

/** Detail video (views/likes/deskripsi/duration detik) via Piped — objek | null. */
export async function pipedVideoDetails(videoId) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const data = await pipedHttp(`${instance}/streams/${videoId}`);
      if (data?.title) return data;
    } catch (e) {
      logger.debug?.("piped", `${instance} streams failed, trying next...`);
    }
  }
  return null;
}

/** Ekstrak video ID dari URL youtube / youtu.be / ID mentah. */
export function extractVideoId(input) {
  const s = String(input || "").trim();
  const m = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|\/watch\?v=|\/shorts\/)([^&\s/?#]+)/);
  return m ? m[1] : (/^[a-zA-Z0-9_-]{11}$/.test(s) ? s : null);
}

// ===== helper format — verbatim contoh owner =====
export function formatNumber(num) {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return String(num);
}

export function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Ambil info video lengkap: query ATAU link youtube.
 * 1) link → pipedVideoDetails langsung.
 * 2) query → pipedSearch → item pertama → pipedVideoDetails (enrich likes/desc).
 * 3) Piped mati semua → fallback yt-search (lazy import, hasil terbatas).
 * Return { video, source } | null. video = {
 *   title, uploaderName, viewCount, duration (detik), uploadedDate,
 *   likeCount, description, thumbnailUrl, url, id }
 */
export async function getYouTubeInfo(queryOrUrl) {
  const q = String(queryOrUrl || "").trim();
  if (!q) return null;

  // ── mode LINK ──
  const linkId = extractVideoId(q);
  if (linkId) {
    const d = await pipedVideoDetails(linkId);
    if (d) return {
      source: "piped",
      video: {
        title: d.title,
        uploaderName: d.uploader,
        viewCount: d.views,
        duration: d.duration,
        uploadedDate: d.uploadDate,
        likeCount: d.likes,
        description: d.description,
        thumbnailUrl: d.thumbnailUrl,
        url: `https://youtube.com/watch?v=${linkId}`,
        id: linkId,
      },
    };
    return null;
  }

  // ── mode QUERY ──
  const items = await pipedSearch(q);
  if (items.length) {
    const first = items.find((it) => extractVideoId(it.url || it.id)) || items[0];
    const id = extractVideoId(first.url || first.id);
    const d = id ? await pipedVideoDetails(id) : null;
    const videoData = d || first;
    return {
      source: "piped",
      video: {
        title: videoData.title,
        uploaderName: videoData.uploader || videoData.uploaderName,
        viewCount: videoData.views || videoData.viewCount,
        duration: videoData.duration,
        uploadedDate: videoData.uploadDate || videoData.uploadedDate,
        likeCount: videoData.likes,
        description: videoData.description,
        thumbnailUrl: videoData.thumbnailUrl,
        url: `https://youtube.com/watch?v=${id}`,
        id,
      },
    };
  }

  // ── fallback yt-search (piped mati semua) ──
  try {
    const search = ytsSearch || (await import("yt-search")).default;
    const res = await search(q);
    const v = res?.videos?.[0];
    if (v) return {
      source: "yt-search",
      video: {
        title: v.title,
        uploaderName: v.author?.name,
        viewCount: v.views,
        duration: null, // yt-search cuma punya timestamp string
        uploadedDate: v.ago,
        likeCount: null,
        description: null,
        thumbnailUrl: v.image || v.thumbnail,
        url: v.url,
        id: extractVideoId(v.url),
      },
    };
  } catch {}
  return null;
}

/** Suggest pencarian YouTube (ala autocomplete) — string[] | []. */
export async function pipedSuggestions(query) {
  const q = String(query || "").trim();
  if (!q) return [];
  for (const instance of PIPED_INSTANCES) {
    try {
      const data = await pipedHttp(`${instance}/suggestions?query=${encodeURIComponent(q)}`);
      if (Array.isArray(data)) return data.filter((s) => typeof s === "string").slice(0, 8);
    } catch {
      // instance berikutnya
    }
  }
  return [];
}

/**
 * Feed hasil pencarian YouTube ala halaman search YouTube asli
 * (request owner 10 Sep 2026: ".web youtube yg kebuka ai rich youtube —
 * tampilan asli di YouTube"). Sumber: Piped /search → fallback yt-search.
 * Return { items, source } | null.
 * item = { id, url, title, thumbnail, channel, views, durationSec,
 *          durationText, uploadedDate, live }
 */
export async function getYouTubeFeed(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  // ── Piped search (data kaya) ──
  const raw = await pipedSearch(q);
  if (raw.length) {
    const items = raw
      .filter((it) => it.type === "stream" || it.title)
      .slice(0, 8)
      .map((it) => {
        const id = extractVideoId(it.url || it.id);
        const live = it.duration === -1;
        return {
          id,
          url: id ? `https://youtube.com/watch?v=${id}` : (it.url || ""),
          title: it.title || "(tanpa judul)",
          thumbnail: it.thumbnail || null,
          channel: it.uploaderName || it.uploader || "Unknown",
          views: it.views || 0,
          durationSec: live ? null : it.duration,
          durationText: live ? "🔴 LIVE" : formatDuration(it.duration),
          uploadedDate: it.uploadedDate || (it.uploaded > 0 ? new Date(it.uploaded).toLocaleDateString("id-ID") : null),
          live,
        };
      });
    if (items.length) return { items, source: "piped" };
  }

  // ── fallback yt-search ──
  try {
    const search = ytsSearch || (await import("yt-search")).default;
    const res = await search(q);
    const vids = (res?.videos || []).slice(0, 8).map((v) => ({
      id: extractVideoId(v.url),
      url: v.url,
      title: v.title,
      thumbnail: v.image || v.thumbnail || null,
      channel: v.author?.name || "Unknown",
      views: v.views || 0,
      durationSec: null,
      durationText: v.timestamp || null,
      uploadedDate: v.ago || null,
      live: false,
    }));
    if (vids.length) return { items: vids, source: "yt-search" };
  } catch {}
  return null;
}

/**
 * Rich feed hasil YouTube — MIRIP TAMPILAN SEARCH YOUTUBE ASLI:
 * tiap video = [thumbnail] + [judul + channel • N x ditonton • durasi • tanggal].
 * owner 10 Sep 2026: "youtube kyk tampilan asli di youtube".
 */
export function formatYouTubeFeedRich(items, { query = "", chips = [] } = {}) {
  const parts = [];
  const top = (items || []).slice(0, 5);
  for (const it of top) {
    if (it.thumbnail) parts.push({ type: "image", url: it.thumbnail });
    const meta = [
      `${it.channel} • ${formatNumber(it.views)}x ditonton`,
      it.durationText,
      it.uploadedDate,
    ].filter(Boolean).join(" • ");
    parts.push({ type: "text", content: `${it.title}\n${meta}` });
  }
  if (items?.length > 5) {
    parts.push({ type: "text", content: `+${items.length - 5} video lagi — ketik .web youtube ${query} judul spesifik buat lihat lainnya` });
  }
  if (chips.length) parts.push({ type: "suggest", prompts: chips.slice(0, 4) });
  return buildRichResponse(parts, `▶️ YouTube — ${query.slice(0, 30)}`, "");
}

/**
 * Bangun richData video YouTube — verbatim contoh owner:
 * [image thumbnail] [text judul] [table Channel/Views/Duration/Uploaded/Likes]
 * [text deskripsi 500 char] [text link] (+ suggest chips opsional).
 */
export function formatYouTubeRich(video, { chips = [] } = {}) {
  const parts = [];
  if (video.thumbnailUrl) parts.push({ type: "image", url: video.thumbnailUrl });
  parts.push({ type: "text", content: `🎬 ${video.title}` });
  const infoRows = [
    ["Channel", video.uploaderName || "Unknown"],
    ["Views", formatNumber(video.viewCount)],
    ["Duration", video.duration ? formatDuration(video.duration) : "N/A"],
    ["Uploaded", video.uploadedDate || "N/A"],
  ];
  if (video.likeCount) infoRows.push(["Likes", formatNumber(video.likeCount)]);
  parts.push({ type: "table", rows: infoRows });
  if (video.description) {
    const desc = video.description.slice(0, 500);
    parts.push({
      type: "text",
      content: `📝 Deskripsi:\n${desc}${video.description.length > 500 ? "..." : ""}`,
    });
  }
  parts.push({ type: "text", content: `🔗 Tonton: ${video.url || `https://youtube.com/watch?v=${video.id}`}` });
  if (chips.length) parts.push({ type: "suggest", prompts: chips.slice(0, 4) });
  return buildRichResponse(parts, `🎬 ${video.title ? video.title.slice(0, 40) : "YouTube Video Info"}`, "");
}
