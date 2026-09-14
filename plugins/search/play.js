// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// play.js — Search YouTube → download audio → kirim langsung
// Bitrate: 128 / 256 (default) / 320 kbps
// REVISI 14 Sep 2026 (owner: "variasi menu chat card — bagian
// Judul/Album/Genre/Durasi/Artis/Link DIBAWAH setelah media dikirim"):
// card info dipindah dari SEBELUM audio → SETELAH audio, field diseragamin
// jadi 5 (Judul/Album/Genre/Durasi/Artis) + baris kosong + Link. Album &
// Genre gak ada di data YouTube — di-enrich best-effort dari iTunes Search
// API (gratis, no key, sama seperti yang dipakai plugins/download/songs.js).
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { downloadAudio as downloadAudioYtDlp } from "../../src/scraper/nova-ytdlp.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan, novaDlUsage } from "../../src/lib/nova-menu-style.js";
import { mediaPreviewCard } from "../../src/lib/nova-media-card.js";
import { offerConvert } from "../../src/lib/nova-convert.js";

const IKYY = "https://api.ikyyxd.my.id";

let _itunesForTest = null;
function _setItunesFnForTest(fn) { _itunesForTest = fn; }

// Card info — field PERSIS request owner (14 Sep 2026): Judul/Album/Genre/
// Durasi/Artis/Format, baris kosong, Link — dikirim DIBAWAH media (bukan
// sebelum, WhatsApp gak support caption di pesan audio). Diekstrak jadi
// fungsi murni biar testable tanpa mock seluruh chain download/search.
export function buildPlayInfoCard({ title, album, genre, duration, artist, kbps, url, lyricsSnippet, lyricsCommand }) {
  const lines = [
    `*Judul:* ${title || "-"}`,
    `*Album:* ${album || "-"}`,
    `*Genre:* ${genre || "-"}`,
    `*Durasi:* ${duration || "-"}`,
    `*Artis:* ${artist || "-"}`,
    `*Format:* Audio MP3 ${kbps}Kbps`,
    ``,
    `*Link:* ${url || "-"}`,
  ];
  if (lyricsSnippet) {
    lines.push(``, `*Lirik:*`, lyricsSnippet, ``, `Lirik lengkap: ${lyricsCommand}`);
  }
  return lines.join("\n");
}

// Enrich Album + Genre dari iTunes Search (best-effort, gak block kalau gagal).
async function fetchItunesMeta(title, artist) {
  try {
    if (_itunesForTest) return await _itunesForTest(title, artist);
    const term = artist ? `${title} ${artist}` : title;
    const { data } = await axios.get("https://itunes.apple.com/search", {
      params: { term, limit: 1, media: "music" },
      timeout: 8000,
    });
    const track = data?.results?.[0];
    if (track) return { album: track.collectionName || null, genre: track.primaryGenreName || null };
  } catch (e) {
    console.error("[Play] iTunes meta error:", e.message);
  }
  return { album: null, genre: null };
}

async function fetchLyricsSnippet(title) {
  try {
    const { data } = await axios.get(`https://api.nexray.eu.cc/search/lyrics`, {
      params: { q: title },
      timeout: 8000,
    });
    if (data?.status && data?.result?.lyrics?.plain_lyrics) {
      const artist = data.result.artist || data.result.lyrics?.artist_name || null;
      const plain = data.result.lyrics.plain_lyrics.trim();
      const snippet = plain.length > 200 ? plain.slice(0, 200).trim() + "..." : plain;
      return { snippet, artist };
    }
  } catch (e) {
    console.error("[Play] Lyrics fetch error:", e.message);
  }
  return null;
}

const pluginConfig = {
  name: "play",
  alias: ["play"],
  category: "search",
  description: "Cari & download audio YouTube (128/256/320 kbps)",
  usage: ".play [128/256/320] <query>",
  example: ".play komang / .play 320 komang",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

// Parse bitrate dari argumen — bisa di posisi AWAL (".play 256 faded")
// ATAU AKHIR (".play faded 256"), default 256 kalau gak disebut sama sekali
function parseBitrateArgs(args) {
  const norm = (s) => String(s || "").toLowerCase().replace(/kbps$/, "").replace(/p$/, "");
  const list = [...args];
  let kbps = "256";

  if (list.length && /^(128|192|256|320)$/.test(norm(list[0]))) {
    kbps = norm(list.shift());
  } else if (list.length && /^(128|192|256|320)$/.test(norm(list[list.length - 1]))) {
    kbps = norm(list.pop());
  }

  return { kbps, query: list.join(" ").trim() };
}

async function searchYoutube(query) {
  // Try 1: IkyyXD search (always works)
  try {
    const { data } = await axios.get(`${IKYY}/search/youtube`, {
      params: { query, apikey: "kyzz" },
      timeout: 15000,
    });
    if (data?.status && data?.result?.length) {
      const v = data.result[0];
      return {
        title: v.title,
        author: v.channel,
        duration: v.duration,
        views: 0,
        thumbnail: v.imageUrl || "",
        url: v.link,
      };
    }
  } catch (e) {
    console.error("[Play] IkyyXD search error:", e.message);
  }

  // Try 2: yt-search (works on VPS, may fail in sandbox)
  try {
    const yts = (await import("yt-search")).default;
    const search = await yts(query);
    if (search.videos?.length) {
      const v = search.videos[0];
      return {
        title: v.title,
        author: v.author.name,
        duration: v.duration.timestamp,
        views: v.views,
        thumbnail: v.thumbnail || "",
        url: v.url,
      };
    }
  } catch (e) {
    console.error("[Play] yt-search error:", e.message);
  }

  return null;
}

async function downloadAudio(url, kbps) {
  // Try 1: yt-dlp / cobalt (nova-ytdlp) — kontrol bitrate persis
  try {
    const result = await downloadAudioYtDlp(url, kbps);
    if (result?.buffer?.length > 10000) {
      return { buffer: result.buffer, title: result.title };
    }
  } catch (e) {
    console.error("[Play] nova-ytdlp error:", e.message);
  }

  // Try 2: ytdl.js (ymcdn)
  try {
    const result = await ytdl(url, "mp3");
    if (result?.status && result?.dl) {
      const buf = await fallbackToMp3Buffer(result.dl);
      if (buf?.length > 10000) {
        return { buffer: buf, title: result.title };
      }
    }
  } catch (e) {
    console.error("[Play] ytdl.js error:", e.message);
  }

  // Try 3: IkyyXD ytmp3
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp3`, {
      params: { url, apikey: "kyzz" },
      timeout: 60000,
    });
    if (data?.status && data?.result?.audio?.url) {
      const dlUrl = data.result.audio.url;
      const { data: buf } = await axios.get(dlUrl, {
        responseType: "arraybuffer",
        timeout: 120000,
      });
      const buffer = Buffer.from(buf);
      if (buffer.length > 10000) {
        return { buffer, title: data.result.title };
      }
    }
  } catch (e) {
    console.error("[Play] IkyyXD ytmp3 error:", e.message);
  }

  return null;
}

// Kirim audio hasil download
async function sendPlayAudio(sock, m, video, kbps) {
  await m.react("🕒");

  const audio = await downloadAudio(video.url, kbps);
  if (!audio?.buffer || audio.buffer.length < 10000) {
    await m.react("❌");
    return m.reply(novaGagal("Play"));
  }
  console.log(`[Play] Audio OK: ${audio.buffer.length} bytes (${kbps}kbps)`);

  const titleForLyrics = audio.title || video.title;

  // Enrich Album + Genre (iTunes, best-effort) + lirik — paralel, gak saling block
  const [itunesMeta, lyricsData] = await Promise.all([
    fetchItunesMeta(titleForLyrics, video.author),
    fetchLyricsSnippet(titleForLyrics),
  ]);
  const artist = lyricsData?.artist || video.author || "-";

  // 1. Notifikasi sukses dulu
  await m.react("🐣");

  // 2. File audionya DULU (sesuai request owner: card info dibawah media)
  await sock.sendMessage(
    m.chat,
    {
      audio: audio.buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${(audio.title || video.title).replace(/[^\w\s-]/g, "").substring(0, 50)}.mp3`,
      contextInfo: mediaPreviewCard({
        title: titleForLyrics,
        body: `YouTube Audio • ${kbps}kbps`,
        sourceUrl: video.url,
        thumbnailUrl: video.thumbnail,
      }),
    },
    { quoted: m },
  );

  // 3. Card info DIBAWAH media — field persis request owner:
  //    Judul / Album / Genre / Durasi / Artis / Format, baris kosong, Link.
  const cardText = buildPlayInfoCard({
    title: titleForLyrics,
    album: itunesMeta.album,
    genre: itunesMeta.genre,
    duration: video.duration,
    artist,
    kbps,
    url: video.url,
    lyricsSnippet: lyricsData?.snippet,
    lyricsCommand: `${m.prefix}lirik ${titleForLyrics}`,
  });
  await m.reply(cardText);

  // 4. Tawaran convert di bawahnya
  await offerConvert(sock, m, { buffer: audio.buffer, type: "audio", platform: "YouTube", title: titleForLyrics, sourceUrl: video.url });
  await m.reply(novaBerhasil("Play"));
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const { kbps, query } = parseBitrateArgs(args);

  // Usage: pilihan bitrate (default 256kbps)
  if (!query) {
    return m.reply(novaDlUsage("Play", {
      prefix: m.prefix,
      command: "play",
      cara: [`${m.prefix}play [judul]`],
      contoh: [
        `${m.prefix}play Faded Alan Walker`,
        `${m.prefix}play 320 Faded Alan Walker`,
      ],
    }));
  }

  try {
    await m.react("🕒");

    // Step 1: Search
    const video = await searchYoutube(query);
    if (!video) {
      await m.react("❌");
      return m.reply(novaGagal("Play"));
    }
    console.log(`[Play] Found: ${video.title} → ${video.url} (${kbps}kbps)`);

    // Langsung proses & kirim — bitrate eksplisit kalau disebut, default 256kbps kalau gak
    await sendPlayAudio(sock, m, video, kbps);
  } catch (err) {
    console.error("[Play]", err.message || err);
    await m.react("❌");
    return m.reply(novaGangguan("Play"));
  }
}

export { pluginConfig as config, handler, _setItunesFnForTest };
