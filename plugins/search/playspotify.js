// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// playspotify.js — Play versi Spotify: cari lagu Spotify → download mp3 → kirim
// Request owner 11 Sep 2026: "buat fitur play tp versi spotify .playspotify"
// Engine: spotidown.app (src/scraper/spotidown.js) — meta lengkap dari Spotify
// (judul/artis/album/durasi/cover) + file mp3, dikirim pola .play.
// REVISI 14 Sep 2026 (owner: "fitur spotify diginiin juga" — samain sama
// .play): card info dipindah dari SEBELUM audio → SETELAH audio, field
// diseragamin jadi Judul/Album/Genre/Durasi/Artis/Format + baris kosong +
// Link. Genre gak ada di data Spotify/spotidown — di-enrich best-effort
// dari iTunes Search API (sama seperti .play). Format TIDAK diklaim kbps
// spesifik (spotidown.app gak expose bitrate — STRICT, gak boleh ngarang).
import axios from "axios";
import { searchSpotiDown, downloadSpotiAudio } from "../../src/scraper/spotidown.js";
import { getLyrics } from "../../src/scraper/spotify-lyrics.js";
import { novaGagal, novaGangguan, novaDlUsage, novaBerhasil } from "../../src/lib/nova-menu-style.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { offerConvert } from "../../src/lib/nova-convert.js";

const pluginConfig = {
  name: "playspotify",
  alias: ["playspotify"],
  category: "search",
  description: "Cari & kirim lagu versi Spotify (mp3, meta asli Spotify)",
  usage: ".playspotify <judul lagu>",
  example: ".playspotify faded alan walker",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

let _itunesForTest = null;
function _setItunesFnForTest(fn) { _itunesForTest = fn; }

// Enrich Genre dari iTunes Search (best-effort, gak block kalau gagal).
// Album/Durasi/Artis udah dapet asli dari Spotify (spotidown) — cuma Genre
// yang gak ada di sana.
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
    console.error("[Playspotify] iTunes genre error:", e.message);
    return null;
  }
}

// Cuplikan lirik LRCLIB (best-effort, gak block kalau gagal/timeout)
async function fetchLyricsSnippet(title, artist) {
  try {
    const r = await getLyrics(title, artist || "");
    if (r.status && r.plainLyrics) {
      const plain = r.plainLyrics.trim();
      const snippet = plain.length > 200 ? plain.slice(0, 200).trim() + "..." : plain;
      return { snippet, artist: r.artistName || artist };
    }
  } catch (e) {
    console.error("[Playspotify] Lyrics fetch error:", e.message);
  }
  return null;
}

// Card info — field PERSIS pola .play (14 Sep 2026): Judul/Album/Genre/
// Durasi/Artis/Format, baris kosong, Link — dikirim DIBAWAH media. Diekstrak
// jadi fungsi murni biar testable tanpa mock seluruh chain search+download.
export function buildPlaySpotifyInfoCard({ title, album, genre, duration, artist, url, lyricsSnippet, lyricsCommand }) {
  const lines = [
    `*Judul:* ${title || "-"}`,
    `*Album:* ${album || "-"}`,
    `*Genre:* ${genre || "-"}`,
    `*Durasi:* ${duration || "-"}`,
    `*Artis:* ${artist || "-"}`,
    `*Format:* Audio MP3`,
    ``,
    `*Link:* ${url || "-"}`,
  ];
  if (lyricsSnippet) {
    lines.push(``, `*Lirik:*`, lyricsSnippet, ``, `Lirik lengkap: ${lyricsCommand}`);
  }
  return lines.join("\n");
}

async function handler(m, { sock }) {
  const query = (m.args || []).join(" ").trim();

  if (!query) {
    return m.reply(
      novaDlUsage("Playspotify", {
        prefix: m.prefix,
        command: "playspotify",
        cara: [`${m.prefix}playspotify [judul lagu]`],
        contoh: [`${m.prefix}playspotify Faded Alan Walker`],
      })
    );
  }

  try {
    await m.react("🕒");

    // Step 1: Cari lagu (spotidown.app — meta asli Spotify)
    const track = await searchSpotiDown(query);
    console.log(`[Playspotify] Found: ${track.title} — ${track.artist} (${track.duration})`);
    await m.react("🎨");

    // Step 2: Download mp3
    const buffer = await downloadSpotiAudio(track.download_url);
    console.log(`[Playspotify] Audio OK: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

    const title = track.title || query;

    // Enrich Genre (iTunes, best-effort) + lirik — paralel, gak saling block
    const [genre, lyricsData] = await Promise.all([
      fetchItunesGenre(title, track.artist),
      fetchLyricsSnippet(title, track.artist),
    ]);
    const artist = lyricsData?.artist || track.artist || "-";

    // Step 3: File audionya DULU (card info dibawah — pola .play)
    await sock.sendMessage(
      m.chat,
      {
        audio: buffer,
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${title.replace(/[^\w\s-]/g, "").substring(0, 50)}.mp3`,
        contextInfo: mediaPreviewCard({
          title,
          body: `Spotify Audio • ${track.artist || ""}`,
          sourceUrl: "https://open.spotify.com/",
          thumbnailUrl: track.image,
        }),
      },
      { quoted: m }
    );

    // Step 4: Card info DIBAWAH media
    const cardText = buildPlaySpotifyInfoCard({
      title,
      album: track.album,
      genre,
      duration: track.duration,
      artist,
      url: "https://open.spotify.com/",
      lyricsSnippet: lyricsData?.snippet,
      lyricsCommand: `${m.prefix}lirikspotify ${title}`,
    });
    await m.reply(cardText);

    // Step 5: Tawaran convert di bawahnya
    await offerConvert(sock, m, { buffer, type: "audio", platform: "Spotify", title, sourceUrl: "https://spotidown.app/" });
    await m.react("🐣");
    await m.reply(novaBerhasil("Playspotify"));
  } catch (err) {
    console.error("[Playspotify]", err.message || err);
    await m.react("❌");
    if (/tidak ditemukan|gak ketemu/i.test(err.message || "")) {
      return m.reply(
        novaGagal("Playspotify") + `\nLagu \`${query}\` gak ketemu — coba judul lengkapnya atau kata kunci lain.`
      );
    }
    if (/Link download gak ketemu|kosong/i.test(err.message || "")) {
      return m.reply(
        novaGagal("Playspotify") + "\nKetemu lagunya tapi file audionya gagal diambil — coba lagi sebentar ya."
      );
    }
    return m.reply(novaGangguan("Playspotify"));
  }
}

export { pluginConfig as config, handler, _setItunesFnForTest };
