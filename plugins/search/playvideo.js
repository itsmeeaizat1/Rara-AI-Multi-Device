// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// playvideo.js — Search YouTube → download video → kirim langsung
import axios from "axios";
import ytdl from "../../src/scraper/ytdl.js";
import { novaGuide, novaError } from "../../src/lib/nova-menu-style.js";

const IKYY = "https://api.ikyyxd.my.id";

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

    // Step 3: Send
    const caption = [
      `*YouTube Play — Video*`,
      ``,
      `*Judul:* ${vid.title || video.title}`,
      `*Channel:* ${video.author}`,
      `*Durasi:* ${video.duration}`,
    ].join("\n");

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
