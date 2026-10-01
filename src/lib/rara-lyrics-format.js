// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-lyrics-format.js — SATU PINTU format hasil fitur lirik
// Request owner 19 Sep 2026: "cba format lirik ada field ini: jdul lagu,
// durasi, album, artis dibawahnya lirik" — contoh:
//   🎵 *Too Little Too Late*
//   👤 *Artis:* Jordana Bryant
//   💿 *Album:* Too Little Too Late
//   ⏱️ *Durasi:* 2:40
//   🎼 *Lirik:*
//   <lirik>
// Dipakai: .lirik (nexray+genius fallback), .lirik2 (genius scrape),
// .lirikv2 (genius npm+nexray), .lirikspotify (lrclib).
// Sumber yang gak punya album/durasi (nexray/genius) di-enrich otomatis
// dari LRCLIB (gratis tanpa key) — gagal → field dilewati senyap.

import axios from "axios";

// ── seam (pola repo): fn=mock, null=DISABLED, undefined=asli ──
let _metaHttp;
export function _setLyricsMetaHttpForTest(fn) { _metaHttp = fn; }

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; Win64)",
  Accept: "application/json",
};

/**
 * Detik → "m:ss" (160 → "2:40"). String "2:40" dipakai apa adanya.
 */
export function fmtDuration(sec) {
  if (typeof sec === "string" && /^\d+:\d{1,2}$/.test(sec.trim())) return sec.trim();
  const s = Number(sec) || 0;
  if (!s || s <= 0) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Ambil metadata pelengkap (album + durasi) dari LRCLIB — no key.
 * Hanya dipanggil kalau sumber utama gak punya field-nya.
 * @returns {Promise<{album?: string, duration?: number}|null>} null = gagal senyap
 */
export async function enrichLyricsMeta(title, artist = "") {
  const track = String(title || "").trim();
  if (!track) return null;
  try {
    const http = _metaHttp !== undefined ? _metaHttp : axios.get;
    if (http === null) return null;
    const res = await http("https://lrclib.net/api/get", {
      params: { track_name: track, artist_name: String(artist || "").trim() },
      timeout: 5000,
      headers: HEADERS,
    });
    const d = res?.data;
    if (d && typeof d === "object" && (d.albumName || d.duration)) {
      return { album: d.albumName || undefined, duration: d.duration || undefined };
    }
  } catch {}
  return null;
}

/**
 * Bangun caption lirik sesuai format owner (field hilang → baris dilewati).
 * @param {object} p — { title, artist, album, duration, lyrics }
 * @returns {string}
 */
export function lyricsCaption({ title, artist, album, duration, lyrics } = {}) {
  const t = String(title || "Tidak diketahui").trim();
  const body = String(lyrics || "").trim();

  // field metadata opsional — cuma yang ada isinya yang ikut (urutan fix)
  const meta = [
    artist ? `👤 *Artis:* ${String(artist).trim()}` : "",
    album ? `💿 *Album:* ${String(album).trim()}` : "",
    duration ? `⏱️ *Durasi:* ${fmtDuration(duration)}` : "",
  ].filter(Boolean);

  const head = meta.length
    ? `🎵 *${t}*\n\n${meta.join("\n")}\n\n🎼 *Lirik:*`
    : `🎵 *${t}*\n\n🎼 *Lirik:*`;

  return `${head}\n\n${body}`;
}
