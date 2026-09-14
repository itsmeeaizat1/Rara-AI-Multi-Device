// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-spotify-play-card.js — BARU 14 Sep 2026
// Request owner: ".playspotify / .spotifyplay2 / .spotplay beda endpoint tp
// pas dichat harus SAMA". 3 plugin Spotify play (engine beda: spotidown.app,
// spotifydown.org, azbry) sekarang pakai SATU builder card yang sama biar
// output di chat identik strukturnya, walau data mentah dari sumber beda.
//
// Field & urutan PERSIS pola .play (YouTube): Judul/Album/Genre/Durasi/
// Artis/Format, baris kosong, Link (+ lirik bonus di bawah kalau ada).
import axios from "axios";

let _itunesForTest = null;
export function _setItunesFnForTest(fn) { _itunesForTest = fn; }

/**
 * Card info Spotify play — dikirim DIBAWAH media (WhatsApp gak bisa caption
 * di pesan audio). Fungsi murni, testable tanpa mock network.
 */
export function buildSpotifyPlayCard({ title, album, genre, duration, artist, format, url, lyricsSnippet, lyricsCommand }) {
  const lines = [
    `*Judul:* ${title || "-"}`,
    `*Album:* ${album || "-"}`,
    `*Genre:* ${genre || "-"}`,
    `*Durasi:* ${duration || "-"}`,
    `*Artis:* ${artist || "-"}`,
    `*Format:* ${format || "Audio MP3"}`,
    ``,
    `*Link:* ${url || "-"}`,
  ];
  if (lyricsSnippet) {
    lines.push(``, `*Lirik:*`, lyricsSnippet, ``, `Lirik lengkap: ${lyricsCommand}`);
  }
  return lines.join("\n");
}

function formatMsToDuration(ms) {
  if (!ms || !Number.isFinite(ms)) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Enrich metadata yang KOSONG dari engine asli via iTunes Search (best-effort,
 * gak block, gak nimpa data yang udah ada). STRICT: gak pernah ngarang angka
 * kalau iTunes juga gak nemu — biarin null/fallback "-" di card.
 * @param {string} title
 * @param {string} artist
 * @param {{needAlbum?:boolean, needGenre?:boolean, needDuration?:boolean}} need
 */
export async function enrichSpotifyMeta(title, artist, need = {}) {
  const out = { album: null, genre: null, duration: null };
  if (!need.needAlbum && !need.needGenre && !need.needDuration) return out;
  try {
    if (_itunesForTest) return await _itunesForTest(title, artist, need);
    const term = artist ? `${title} ${artist}` : title;
    const { data } = await axios.get("https://itunes.apple.com/search", {
      params: { term, limit: 1, media: "music" },
      timeout: 8000,
    });
    const track = data?.results?.[0];
    if (track) {
      if (need.needAlbum) out.album = track.collectionName || null;
      if (need.needGenre) out.genre = track.primaryGenreName || null;
      if (need.needDuration) out.duration = formatMsToDuration(track.trackTimeMillis);
    }
  } catch (e) {
    console.error("[SpotifyPlayCard] iTunes enrich error:", e.message);
  }
  return out;
}
