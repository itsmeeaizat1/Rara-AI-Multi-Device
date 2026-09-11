// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/spotify-lyrics.js — Lirik lagu Spotify-style via LRCLIB
// Request owner 12 Sep 2026: "tmbah fitur baru lirik versi spotify .lirikspotify"
// Port dari kode owner (Deno/TS → ESM JS):
//   - input: judul lagu ATAU link open.spotify.com/track/<id>
//     (link → oembed buat judul + embed page buat nama artis)
//   - 1) exact search lrclib.net/api/get (track_name + artist_name)
//   - 2) fallback fuzzy: lrclib.net/api/search?q=
//   - hasil: plainLyrics (teks polos) + syncedLyrics (LRC ber-timestamp)

import axios from "axios";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

/**
 * Ambil lirik lagu dari LRCLIB.
 * @param {string} queryOrTrack — judul lagu atau link track spotify
 * @param {string} [artist] — nama artis (opsional, ngepresisin hasil)
 * @returns {Promise<{status: boolean, message?: string, trackName?: string,
 *   artistName?: string, albumName?: string, duration?: number,
 *   plainLyrics?: string, syncedLyrics?: string}>}
 */
export async function getLyrics(queryOrTrack, artist = "") {
  let trackName = String(queryOrTrack || "").trim();
  let artistName = artist || "";

  // Link track spotify → judul via oembed + artis via embed page
  if (trackName.includes("spotify.com/track/")) {
    const match = trackName.match(/track\/([a-zA-Z0-9]+)/);
    if (match) {
      try {
        const oembed = await axios.get(
          `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${match[1]}`,
          { timeout: 5000, headers: HEADERS }
        );
        trackName = oembed.data?.title?.replace(/\(feat\..*?\)/i, "").trim() || trackName;
        const resEmbed = await axios.get(`https://open.spotify.com/embed/track/${match[1]}`, {
          timeout: 5000,
          headers: HEADERS,
        });
        const matchArtist = resEmbed.data.match(/"artists":\[\{"name":"([^"]+)"/);
        if (matchArtist) artistName = matchArtist[1];
      } catch {}
    }
  }

  // 1. Exact search via LRCLIB
  try {
    const res = await axios.get("https://lrclib.net/api/get", {
      params: { track_name: trackName, artist_name: artistName },
      timeout: 10000,
      headers: HEADERS,
    });
    if (res.data && (res.data.plainLyrics || res.data.syncedLyrics)) {
      return {
        status: true,
        trackName: res.data.trackName || trackName,
        artistName: res.data.artistName || artistName,
        albumName: res.data.albumName,
        duration: res.data.duration,
        plainLyrics: res.data.plainLyrics,
        syncedLyrics: res.data.syncedLyrics,
      };
    }
  } catch {}

  // 2. Fallback: fuzzy search — full query dulu, terus turun kata demi kata
  //    ("komang raisa" 0 hasil → "komang" 20 hasil — lagu cover versi artis
  //    lain sering gak terindeks dengan nama cover-nya)
  const queries = [`${trackName} ${artistName}`.trim()];
  const words = trackName.split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i > 0; i--) {
    queries.push(words.slice(0, i).join(" "));
  }
  try {
    for (const q of queries) {
      if (!q) continue;
      const searchRes = await axios.get("https://lrclib.net/api/search", {
        params: { q },
        timeout: 10000,
        headers: HEADERS,
      });
      if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const best = searchRes.data[0];
        if (best.plainLyrics || best.syncedLyrics) {
          return {
            status: true,
            trackName: best.trackName,
            artistName: best.artistName,
            albumName: best.albumName,
            duration: best.duration,
            plainLyrics: best.plainLyrics,
            syncedLyrics: best.syncedLyrics,
          };
        }
      }
    }
  } catch (err) {
    return { status: false, message: err.message || "Gagal mengambil lirik" };
  }

  return { status: false, message: "Lirik lagu tidak ditemukan" };
}
