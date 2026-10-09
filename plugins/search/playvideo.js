// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// playvideo.js — Search YouTube → download video → kirim langsung
// Resolusi: 360p / 480p (default) / 720p / HD 1080p
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { downloadVideo as downloadVideoYtDlp } from "../../src/scraper/rara-ytdlp.js";
import { toWhatsAppVideo } from "../../src/lib/rara-ffmpeg.js";
import { raraGuide, raraSalah, raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { sendUsageCard } from "../../src/lib/rara-menu-card.js";
import { offerConvert } from "../../src/lib/rara-convert.js";
import { mediaPreviewCard } from "../../src/lib/rara-media-card.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";
// kartu info media (batch download) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


const IKYY = "https://api.ikyyxd.my.id";

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
    console.error("[PlayVideo] Lyrics fetch error:", e.message);
  }
  return null;
}

const pluginConfig = {
  name: "playvideo",
  alias: ["playvideo"],
  category: "search",
  description: "Cari & download video YouTube (360p/480p/720p/HD)",
  usage: ".playvideo [360/480/720/hd] <query>",
  example: ".playvideo komang / .playvideo 720 komang",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

// Parse resolusi dari argumen — bisa di posisi AWAL (".playvideo 720 faded")
// ATAU AKHIR (".playvideo faded 720"), default 480 kalau gak disebut sama sekali
function parseQualityArgs(args) {
  const norm = (s) => String(s || "").toLowerCase().replace(/p$/, "");
  const toQuality = (v) => (v === "hd" ? "1080" : v);
  const list = [...args];
  let quality = "480";

  if (list.length && /^(360|480|720|1080|hd)$/.test(norm(list[0]))) {
    quality = toQuality(norm(list.shift()));
  } else if (list.length && /^(360|480|720|1080|hd)$/.test(norm(list[list.length - 1]))) {
    quality = toQuality(norm(list.pop()));
  }

  return { quality, query: list.join(" ").trim() };
}

async function searchYoutube(query) {
  // Try 1: IkyyXD search
  try {
    const { data } = await axios.get(`${IKYY}/search/youtube`, {
      params: { query, apikey: getApiKey("kyzz") },
      timeout: 15000,
    });
    if (data?.status && data?.result?.length) {
      const v = data.result[0];
      return {
        title: v.title,
        author: v.channel,
        duration: v.duration,
        views: 0,
        description: v.description || null,
        thumbnail: v.imageUrl || "",
        url: v.link,
      };
    }
  } catch (e) {
    console.error("[PlayVideo] IkyyXD search error:", e.message);
  }

  // Try 2: yt-search
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
        description: v.description || null,
        thumbnail: v.thumbnail || "",
        url: v.url,
      };
    }
  } catch (e) {
    console.error("[PlayVideo] yt-search error:", e.message);
  }

  return null;
}

async function downloadVideo(url, quality) {
  // Try 1: yt-dlp / cobalt (rara-ytdlp) — dukung pilihan resolusi persis
  try {
    const result = await downloadVideoYtDlp(url, quality);
    if (result?.buffer?.length > 10000) {
      return { buffer: result.buffer, title: result.title };
    }
  } catch (e) {
    console.error("[PlayVideo] rara-ytdlp error:", e.message);
  }

  // Try 2: IkyyXD ytmp4 (tanpa kontrol kualitas — biasanya 720p)
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp4`, {
      params: { q: url, apikey: getApiKey("kyzz") },
      timeout: 60000,
    });
    if (data?.status && data?.result) {
      const dl = data.result.VideoUrl?.url || data.result.download_url || data.result.url;
      if (dl) {
        const { data: buf } = await axios.get(dl, {
          responseType: "arraybuffer",
          timeout: 120000,
        });
        const buffer = Buffer.from(buf);
        if (buffer.length > 10000) {
          return { buffer, title: data.result.title };
        }
      }
    }
  } catch (e) {
    console.error("[PlayVideo] IkyyXD ytmp4 error:", e.message);
  }

  // Try 3: ytdl.js mp4
  try {
    const result = await ytdl(url, "mp4");
    if (result?.status && result?.dl) {
      const { data: buf } = await axios.get(result.dl, {
        responseType: "arraybuffer",
        timeout: 120000,
      });
      const buffer = Buffer.from(buf);
      if (buffer.length > 10000) {
        return { buffer, title: result.title };
      }
    }
  } catch (e) {
    console.error("[PlayVideo] ytdl.js error:", e.message);
  }

  return null;
}

// Kirim video hasil download
async function sendPlayVideo(sock, m, video, quality) {
  await m.react("🕒");

  const vid = await downloadVideo(video.url, quality);
  if (!vid?.buffer || vid.buffer.length < 10000) {
    await m.react("❌");
    return m.reply(raraGagal("PlayVideo"));
  }
  console.log(`[PlayVideo] Video OK: ${vid.buffer.length} bytes`);

  // Pastikan H.264+AAC (sumber savetube/ytdl diam-diam kasih AV1/VP9
  // yang gagal diputar di WA) + downscale ke resolusi yang diminta kalau perlu
  try {
    vid.buffer = await toWhatsAppVideo(vid.buffer, { maxHeight: parseInt(quality, 10) });
    console.log(`[PlayVideo] Video setelah convert ${quality}p: ${vid.buffer.length} bytes`);
  } catch (convErr) {
    console.error("[PlayVideo] Convert error, kirim buffer asli:", convErr.message);
  }

  // Ambil lirik (best-effort, gak block kalau gagal/timeout)
  const titleForLyrics = vid.title || video.title;
  const lyricsData = await fetchLyricsSnippet(titleForLyrics);

  const captionLines = [
    `*YouTube Play — Video ${quality === "1080" ? "HD" : quality + "p"}*`,
    ``,
    `*Judul:* ${titleForLyrics}`,
    `*Artis/Channel:* ${lyricsData?.artist || video.author}`,
    `*Durasi:* ${video.duration}`,
    `*Views:* ${video.views ? video.views.toLocaleString("id-ID") : "-"}`,
    `*Deskripsi:* ${video.description ? video.description.slice(0, 150) + (video.description.length > 150 ? "..." : "") : "-"}`,
    `*Link:* ${video.url}`,
  ];
  if (lyricsData?.snippet) {
    captionLines.push(``, `*Lirik:*`, lyricsData.snippet, ``, `Lirik lengkap: .lirik ${titleForLyrics}`);
  }

  // 1. Notifikasi sukses dulu (sesuai request owner)
  await m.react("🐣");

  // 2. Baru videonya (caption info nempel di situ)
  const vCard = await dlCard("video", { buffer: vid.buffer }, [["Judul", String(titleForLyrics).slice(0, 40)], ["Kualitas", quality === "1080" ? "HD" : quality + "p"]]);
  await sock.sendMessage(
    m.chat,
    {
      video: vid.buffer,
      caption: vCard || captionLines.join("\n"),
      mimetype: "video/mp4",
      fileName: `${(vid.title || video.title).replace(/[^\w\s-]/g, "").substring(0, 50)}.mp4`,
      contextInfo: mediaPreviewCard({
        title: titleForLyrics,
        body: `YouTube Video • ${quality === "1080" ? "HD" : quality + "p"}`,
        sourceUrl: video.url,
        thumbnailUrl: video.thumbnail,
        mediaType: 2,
      }),
    },
    { quoted: m },
  );

  // 3. Tawaran convert di bawahnya
  await offerConvert(sock, m, { buffer: vid.buffer, type: "video", platform: "YouTube", title: titleForLyrics, sourceUrl: video.url });
  if (!vCard) await m.reply(raraBerhasil("Playvideo"));
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const { quality, query } = parseQualityArgs(args);

  // Usage: pilihan resolusi (default 480p)
  if (!query) {
    return m.reply(raraGuide("playvideo", {
 kaomoji: "(๑•̀ㅂ•́)و✧",
 sapaan: "pengen sekalian videonya? ketik judulnya! (≧▽≦)b",
      cara: "ketik judul lagunya sesudah command",
      contoh: `${m.prefix}playvideo faded alan walker · ${m.prefix}playvideo hd faded alan walker`,
      note: "nanti bot carin videonya otomatis, resolusi bisa dipilih lewat contoh kedua",
      spec: ["⏱ 20dtk", "💸 gratis"],
    }));
  }

  // SALAH CMD CUTE (owner 25 Sep): link padahal .playvideo mau judul lagu
  if (/^(https?:\/\/|www\.)|\b(?:facebook|fb\.watch|tiktok|instagram|youtu\.?be)\.com/i.test(query)) {
    await m.react("🐣");
    return await sendUsageCard(sock, m, raraSalah("playvideo", {
 kaomoji: "(¬_¬;)",
      pesan: "kok yang diketik linknya kak? ini mah mau judul lagunya~",
      contoh: `${m.prefix}playvideo nama lagu`,
    }), { name: "playvideo" });
  }

  try {
    await m.react("🕒");

    // Step 1: Search
    const video = await searchYoutube(query);
    if (!video) {
      await m.react("❌");
      return m.reply(raraGagal("PlayVideo"));
    }
    console.log(`[PlayVideo] Found: ${video.title} → ${video.url} (${quality}p)`);

    // Langsung proses & kirim — resolusi eksplisit kalau disebut, default 480p kalau gak
    await sendPlayVideo(sock, m, video, quality);
  } catch (err) {
    console.error("[PlayVideo]", err.message || err);
    await m.react("❌");
    return m.reply(raraGangguan("PlayVideo"));
  }
}

export { pluginConfig as config, handler };
