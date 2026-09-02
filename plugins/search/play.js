// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// play.js — Search YouTube → download audio → kirim langsung
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
import { novaGuide, novaError } from "../../src/lib/nova-menu-style.js";

const IKYY = "https://api.ikyyxd.my.id";

const pluginConfig = {
  name: "play",
  alias: ["play"],
  category: "search",
  description: "Cari & download audio YouTube",
  usage: ".play <query>",
  example: ".play komang",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

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

async function downloadAudio(url) {
  // Try 1: ytdl.js (ymcdn)
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

  // Try 2: IkyyXD ytmp3
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

async function handler(m, { sock, text }) {
  const query = (text || m.text || "").trim();
  if (!query) {
    return m.reply(novaGuide("Play", "Kirim judul lagu yang mau diputar!", `${m.prefix}play komang`));
  }

  try {
    await m.react("🕒");

    // Step 1: Search
    const video = await searchYoutube(query);
    if (!video) {
      await m.react("❌");
      return m.reply(novaError("Play", "Lagu tidak ditemukan, coba kata kunci lain ya!"));
    }
    console.log(`[Play] Found: ${video.title} → ${video.url}`);

    // Step 2: Download audio
    const audio = await downloadAudio(video.url);
    if (!audio?.buffer || audio.buffer.length < 10000) {
      await m.react("❌");
      return m.reply(novaError("Play", "Gagal download audio, coba lagi nanti ya!"));
    }
    console.log(`[Play] Audio OK: ${audio.buffer.length} bytes`);

    // Step 3: Send
    const caption = [
      `*YouTube Play — Audio*`,
      ``,
      `*Judul:* ${audio.title || video.title}`,
      `*Channel:* ${video.author}`,
      `*Durasi:* ${video.duration}`,
    ].join("\n");

    await m.react("🐣");
    await sock.sendMessage(
      m.chat,
      {
        audio: audio.buffer,
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${(audio.title || video.title).replace(/[^\w\s-]/g, "").substring(0, 50)}.mp3`,
        caption,
      },
      { quoted: m },
    );
  } catch (err) {
    console.error("[Play]", err.message || err);
    await m.react("❌");
    return m.reply(novaError("Play", err.message || "Gagal memutar lagu, coba lagi nanti ya!"));
  }
}

export { pluginConfig as config, handler };
