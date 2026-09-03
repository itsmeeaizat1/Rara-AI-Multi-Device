// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// playvideo.js — Search YouTube → download video → kirim langsung
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { toWhatsAppVideo } from "../../src/lib/nova-ffmpeg.js";
import { novaGuide, novaError } from "../../src/lib/nova-menu-style.js";

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
  description: "Cari & download video YouTube",
  usage: ".playvideo <query>",
  example: ".playvideo komang",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

async function searchYoutube(query) {
  // Try 1: IkyyXD search
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

async function downloadVideo(url) {
  // Try 1: IkyyXD ytmp4 (pakai "q" param)
  try {
    const { data } = await axios.get(`${IKYY}/download/ytmp4`, {
      params: { q: url, apikey: "kyzz" },
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

  // Try 2: ytdl.js mp4
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

async function handler(m, { sock, text }) {
  const query = (text || m.text || "").trim();
  if (!query) {
    return m.reply(novaGuide("PlayVideo", "Kirim judul video yang mau dicari!", `${m.prefix}playvideo komang`));
  }

  try {
    await m.react("🕒");

    // Step 1: Search
    const video = await searchYoutube(query);
    if (!video) {
      await m.react("❌");
      return m.reply(novaError("PlayVideo", "Video tidak ditemukan, coba kata kunci lain ya!"));
    }
    console.log(`[PlayVideo] Found: ${video.title} → ${video.url}`);

    // Step 2: Download video
    const vid = await downloadVideo(video.url);
    if (!vid?.buffer || vid.buffer.length < 10000) {
      await m.react("❌");
      return m.reply(novaError("PlayVideo", "Gagal download video, coba lagi nanti ya!"));
    }
    console.log(`[PlayVideo] Video OK: ${vid.buffer.length} bytes`);

    // Step 2.5: Pastikan H.264+AAC (banyak sumber savetube/ytdl diam-diam kasih
    // AV1/VP9 yang gagal diputar di WhatsApp walau ekstensinya .mp4)
    try {
      vid.buffer = await toWhatsAppVideo(vid.buffer);
      console.log(`[PlayVideo] Video setelah convert: ${vid.buffer.length} bytes`);
    } catch (convErr) {
      console.error("[PlayVideo] Convert error, kirim buffer asli:", convErr.message);
    }

    // Step 3: Ambil lirik (best-effort, gak block kalau gagal/timeout)
    const titleForLyrics = vid.title || video.title;
    const lyricsData = await fetchLyricsSnippet(titleForLyrics);

    // Step 4: Info section lengkap
    const captionLines = [
      `*YouTube Play — Video*`,
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

    const caption = captionLines.join("\n");

    await m.react("🐣");
    await sock.sendMessage(
      m.chat,
      {
        video: vid.buffer,
        caption,
        mimetype: "video/mp4",
        fileName: `${(vid.title || video.title).replace(/[^\w\s-]/g, "").substring(0, 50)}.mp4`,
      },
      { quoted: m },
    );
  } catch (err) {
    console.error("[PlayVideo]", err.message || err);
    await m.react("❌");
    return m.reply(novaError("PlayVideo", err.message || "Gagal download video, coba lagi nanti ya!"));
  }
}

export { pluginConfig as config, handler };
