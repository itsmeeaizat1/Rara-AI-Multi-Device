// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// spotifyplay2.js — Spotify Play v2 (spotifydown scrape + tikwm fallback)
// REVISI 14 Sep 2026 (owner: "disamain krna beda endpoint tp untuk dichat
// sama") — card info sekarang pakai buildSpotifyPlayCard bareng
// .playspotify/.spotplay (src/lib/nova-spotify-play-card.js), dikirim
// DIBAWAH media. Album/Genre gak ada dari spotifydown.org → di-enrich
// best-effort dari iTunes. Format TETAP "MP3 320kbps" (bukan ngarang —
// spotifydown.org emang fixed rip 320kbps, klaim lama di kode ini valid).
import axios from "axios";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { buildSpotifyPlayCard, enrichSpotifyMeta } from "../../src/lib/nova-spotify-play-card.js";

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
    const album = track.album?.name || track.album || null;
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

    // 2. Enrich Album/Genre/Durasi yang kosong dari engine (best-effort, gak nimpa yang udah ada)
    const meta = await enrichSpotifyMeta(title, artist, {
      needAlbum: !album,
      needGenre: true,
      needDuration: !track.duration,
    });

    // 3. Card info DIBAWAH media — field sama persis .playspotify/.spotplay
    const cardText = buildSpotifyPlayCard({
      title,
      album: album || meta.album,
      genre: meta.genre,
      duration: track.duration || meta.duration,
      artist,
      format: "MP3 320kbps",
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

export { pluginConfig as config, handler };
