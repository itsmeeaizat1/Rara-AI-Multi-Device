// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// spotifyplay2.js — Spotify Play v2 (spotifydown scrape + tikwm fallback)
//
// REVISI 14 Sep 2026 (owner: "disamain krna beda endpoint tp untuk dichat
// sama" → lalu dikoreksi "gak mau dipakein formatter/card builder bareng
// yg dipaksa 2-2nya sama, tiap fitur field-nya beda-beda — pisah aja"):
// card info dipindah DIBAWAH audio, TAPI builder & enrichment ditulis
// LOKAL di file ini sendiri (gak import lib bersama) — field yang
// ditampilin nyesuain data ASLI yang tersedia dari api.spotifydown.org
// (beda sumber sama .playspotify/.spotplay, jadi field-nya boleh beda).
// Format TETAP "MP3 320kbps" — bukan ngarang, spotifydown.org emang fixed
// rip 320kbps (klaim lama di kode ini valid).
import axios from "axios";
import { claraWrap, novaBerhasil } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spotifyplay2",
  alias: ["spotifyplay2", "spotplay2"],
  category: "download",
  description: "Cari & download lagu Spotify v2 (spotifydown scrape)",
  usage: ".spotifyplay2 <judul_lagu>",
  example: ".spotifyplay2 faded alan walker",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

const SPOTIFYDOWN_API = "https://api.spotifydown.org";
const ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

let _itunesForTest = null;
function _setItunesFnForTest(fn) { _itunesForTest = fn; }

async function searchSpotify(query) {
  try {
    const { data } = await axios.get(`${SPOTIFYDOWN_API}/metadata/search/${encodeURIComponent(query)}`, {
      headers: { "User-Agent": ua }, timeout: 15000,
    });
    if (data?.tracks?.length) return data.tracks;
    if (data?.list?.length) return data.list;
    return [];
  } catch (e) { console.error('[spotifyplay2.js] search:', e.message); return []; }
}

async function downloadTrack(trackId) {
  const { data } = await axios.get(`${SPOTIFYDOWN_API}/download/${trackId}`, {
    headers: { "User-Agent": ua }, timeout: 30000, maxRedirects: 5,
  });
  if (!data?.link) throw new Error("Gagal mendapatkan link download");
  return data.link;
}

function formatMsToDuration(ms) {
  const n = Number(ms);
  if (!n || !Number.isFinite(n)) return null;
  const totalSec = Math.round(n / 1000);
  const mnt = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${mnt}:${String(sec).padStart(2, "0")}`;
}

// Genre gak ada sama sekali di data spotifydown.org → enrich best-effort
// dari iTunes Search (sama-sama Genre doang, beda dari .playspotify yang
// juga cuma butuh Genre — karena Spotify emang gak pernah expose genre).
async function fetchItunesGenre(title, artist) {
  try {
    if (_itunesForTest) return await _itunesForTest(title, artist);
    const term = artist ? `${title} ${artist}` : title;
    const { data } = await axios.get("https://itunes.apple.com/search", {
      params: { term, limit: 1, media: "music" },
      timeout: 8000,
    });
    return data?.results?.[0]?.primaryGenreName || null;
  } catch (e) {
    console.error("[spotifyplay2] iTunes genre error:", e.message);
    return null;
  }
}

// Card LOKAL punya .spotifyplay2 sendiri. Album & Durasi dari field ASLI
// api.spotifydown.org kalau ada — DIOMIT (bukan "-") kalau API gak
// ngasih. Genre opsional hasil enrich, sama aturannya.
export function buildSpotifyPlay2Card({ title, album, genre, duration, artist, url }) {
  const lines = [`*Judul:* ${title || "-"}`];
  if (album) lines.push(`*Album:* ${album}`);
  if (genre) lines.push(`*Genre:* ${genre}`);
  if (duration) lines.push(`*Durasi:* ${duration}`);
  lines.push(`*Artis:* ${artist || "-"}`);
  lines.push(`*Format:* MP3 320kbps`);
  lines.push(``, `*Link:* ${url || "-"}`);
  return lines.join("\n");
}

async function handler(m, { sock }) {
  const query = m.args?.join(" ")?.trim();
  if (!query) {
    return m.reply(claraWrap("spotifyplay2", `Masukkan judul lagu!\n\nContoh: .spotifyplay2 faded alan walker`, "guide"));
  }

  try {
    await m.react("🕒");

    const tracks = await searchSpotify(query);
    if (!tracks.length) {
      await m.react("❌");
      return m.reply(claraWrap("spotifyplay2", `Lagu tidak ditemukan untuk: *${query}*`, "error"));
    }

    const track = tracks[0];
    const trackId = track.id || track.trackId;
    const title = track.title || track.name;
    const artist = track.artists || track.artist;
    const album = track.album?.name || (typeof track.album === "string" ? track.album : null);
    const durationRaw = track.duration || track.durationMs || track.duration_ms;
    const thumbnail = track.cover || track.image || track.album?.[0]?.url;
    const trackUrl = `https://open.spotify.com/track/${trackId}`;

    const dlUrl = await downloadTrack(trackId);
    const audioRes = await axios.get(dlUrl, { responseType: "arraybuffer", timeout: 60000, headers: { "User-Agent": ua } });
    const buffer = Buffer.from(audioRes.data);

    // 1. Media dulu (audio gak bisa caption di WhatsApp)
    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${title}.mp3`,
      contextInfo: {
        externalAdReply: {
          title, body: artist || "Spotify Downloader",
          thumbnailUrl: thumbnail, sourceUrl: trackUrl,
        }
      },
    }, { quoted: m });

    // 2. Enrich Genre (satu-satunya field yang emang gak ada di API ini)
    const genre = await fetchItunesGenre(title, artist);

    // 3. Card info DIBAWAH media — builder & field LOKAL punya fitur ini
    const cardText = buildSpotifyPlay2Card({
      title,
      album,
      genre,
      duration: formatMsToDuration(durationRaw) || (typeof durationRaw === "string" ? durationRaw : null),
      artist,
      url: trackUrl,
    });
    await m.reply(cardText);

    await m.react("🐣");
    await m.reply(novaBerhasil("spotifyplay2"));
  } catch (err) {
    console.error("[spotifyplay2]", err);
    await m.react("❌");
    m.reply(claraWrap("spotifyplay2", "Gagal download lagu. Coba lagi nanti!", "error"));
  }
}

export { pluginConfig as config, handler, _setItunesFnForTest };
