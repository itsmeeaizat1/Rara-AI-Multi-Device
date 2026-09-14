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
import { searchSpotiDown, downloadSpotiAudio } from "../../src/scraper/spotidown.js";
import { getLyrics } from "../../src/scraper/spotify-lyrics.js";
import { novaGagal, novaGangguan, novaDlUsage, novaBerhasil } from "../../src/lib/nova-menu-style.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { offerConvert } from "../../src/lib/nova-convert.js";
import { buildSpotifyPlayCard, enrichSpotifyMeta } from "../../src/lib/nova-spotify-play-card.js";

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

// Wrapper back-compat — builder asli sekarang di lib bersama (nova-spotify-play-card.js)
export const buildPlaySpotifyInfoCard = (args) => buildSpotifyPlayCard({ ...args, format: "Audio MP3" });

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
    const [meta, lyricsData] = await Promise.all([
      enrichSpotifyMeta(title, track.artist, { needGenre: true }),
      fetchLyricsSnippet(title, track.artist),
    ]);
    const genre = meta.genre;
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
    const cardText = buildSpotifyPlayCard({
      title,
      album: track.album,
      genre,
      duration: track.duration,
      artist,
      format: "Audio MP3",
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

export { pluginConfig as config, handler };
