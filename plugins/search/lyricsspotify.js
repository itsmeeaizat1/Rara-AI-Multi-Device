// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// lyricsspotify.js — Lirik lagu versi Spotify via LRCLIB
// Request owner 12 Sep 2026: "tmbah fitur baru lirik versi spotify .lirikspotify"
// Engine: lrclib.net (src/scraper/spotify-lyrics.js — port kode owner) —
// input judul ATAU link track spotify, exact match dulu → fuzzy search.
// Lirik plain diprioritasin; kalau cuma ada synced (LRC), timestamp-nya
// dibersihin biar enak dibaca di chat.
import { claraWrap, novaGuide, novaError } from "../../src/lib/nova-menu-style.js";
import { getLyrics } from "../../src/scraper/spotify-lyrics.js";
import { lyricsCaption } from "../../src/lib/nova-lyrics-format.js";

const pluginConfig = {
  name: "lirikspotify",
  alias: ["lirikspotify"],
  category: "search",
  description: "Cari lirik lagu versi Spotify (LRCLIB — judul/link track)",
  usage: ".lirikspotify <judul lagu / link spotify>",
  example: ".lirikspotify komang raisa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// LRC [00:12.34] baris → teks polos
function stripLrc(synced) {
  return String(synced || "")
    .replace(/\[[^\]]*\]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

async function handler(m, { sock }) {
  const input = (m.args || []).join(" ").trim();

  if (!input) {
    return m.reply(
      claraWrap("LirikSpotify", [
        `📌 Cari lirik lagu versi Spotify:`,
        ``,
        `💡 Contoh:`,
        `${m.prefix}lirikspotify komang raisa`,
        `${m.prefix}lirikspotify https://open.spotify.com/track/xxxx`,
      ])
    );
  }

  try {
    await m.react("🕒");

    const r = await getLyrics(input);
    if (!r.status || (!r.plainLyrics && !r.syncedLyrics)) {
      await m.react("❌");
      return m.reply(novaError("LirikSpotify", `Lirik untuk \`${input}\` gak ketemu nih`));
    }

    // Lirik plain diprioritasin; cuma ada LRC → bersihin timestamp
    let lyrics = r.plainLyrics || stripLrc(r.syncedLyrics);
    // Cap panjang biar gak meledak di chat
    const MAX = 3800;
    if (lyrics.length > MAX) lyrics = lyrics.slice(0, MAX) + "\n... (dipotong)";

    await m.react("🐣");
    // format owner 19 Sep: judul/artis/album/durasi → lirik (satu pintu nova-lyrics-format)
    return m.reply(
      lyricsCaption({
        title: r.trackName || input,
        artist: r.artistName,
        album: r.albumName,
        duration: r.duration,
        lyrics,
      }) + `\n\n🔗 Sumber: LRCLIB`
    );
  } catch (err) {
    console.error("[LirikSpotify]", err.message || err);
    await m.react("❌");
    return m.reply(novaError("LirikSpotify", "Gagal ambil lirik — coba lagi sebentar ya"));
  }
}

export { pluginConfig as config, handler };
