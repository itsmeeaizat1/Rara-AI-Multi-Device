// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// spotifydl.js — Download lagu Spotify (spotifydown API)
import path from "node:path";
import axios from "axios";
import { raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { ikyyDl } from "../../src/scraper/ikyydl.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  return lines.join("\n");
}


const SPOTIFYDOWN_API = "https://api.spotifydown.org";
const ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

const pluginConfig = {
  name: "spotifydl",
  alias: ["spotifydl", "spdl"],
  category: "download",
  description: "Download lagu dari Spotify",
  usage: ".spotifydl <url_spotify>",
  example: ".spotifydl https://open.spotify.com/track/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function getTrackId(url) {
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  throw new Error("URL Spotify tidak valid");
}

async function getMetadata(trackId) {
  try {
    const { data } = await axios.get(`${SPOTIFYDOWN_API}/metadata/track/${trackId}`, {
      headers: { "User-Agent": ua }, timeout: 10000
    });
    return data || {};
  } catch { return {}; }
}

async function downloadTrack(trackId) {
  const { data } = await axios.get(`${SPOTIFYDOWN_API}/download/${trackId}`, {
    headers: { "User-Agent": ua }, timeout: 30000,
    maxRedirects: 5,
  });
  if (!data?.link) throw new Error("Gagal mendapatkan link download");
  return data.link;
}

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuide("Spotify DL", "Kirim URL lagu Spotify yang mau kamu download!", `${m.prefix}spotifydl https://open.spotify.com/track/xxx`));
  }
  if (!url.includes("spotify.com") && !url.includes("spoti.fi")) {
    return m.reply(raraGuide("Spotify DL", "Link harus URL Spotify yang valid!", `${m.prefix}spotifydl https://open.spotify.com/track/xxx`));
  }

  try {
    // Try IkyyXD spotifydl first
    const ikyyResult = await ikyyDl("spotifydl", url);
    if (ikyyResult?.medias?.length) {
      const audio = ikyyResult.medias.find(m => m.type === "audio") || ikyyResult.medias[0];
      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "Spotify",
        title: ikyyResult.title || "Spotify Track",
        author: ikyyResult.author || null,
        format: "🎶 MP3", method: "IkyyXD",
      });
      await m.reply(caption);
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        audio: { url: audio.url },
        mimetype: "audio/mpeg",
      }, { quoted: m });
      return;
    }

    await m.react("🕒");
    const trackId = await getTrackId(url);
    const meta = await getMetadata(trackId);
    const downloadUrl = await downloadTrack(trackId);

    // Download audio buffer
    const audioRes = await axios.get(downloadUrl, {
      responseType: "arraybuffer", timeout: 60000,
      headers: { "User-Agent": ua },
    });
    const buffer = Buffer.from(audioRes.data);

    const title = meta?.title || meta?.name || "Spotify Track";
    const artist = meta?.artists || meta?.artist || null;
    const thumbnail = meta?.cover || meta?.image || null;

    const caption = mediaCaption({
      platformIcon: "🎵",
      platformName: "Spotify",
      title,
      author: artist,
      format: "🎶 MP3 320kbps",
      method: "SpotifyDown",
    });

    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${title}.mp3`,
      contextInfo: thumbnail ? {
        externalAdReply: {
          title, body: artist || "Spotify Downloader",
          thumbnailUrl: thumbnail, sourceUrl: url,
        }
      } : {},
    }, { quoted: m });
    await m.reply(caption);
    await m.react("🐣");
    await m.reply(raraBerhasil("spotifydl"));
  } catch (err) {
    console.error("[SpotifyDL]", err);
    await m.react("❌");
    m.reply(raraGagal("Spotify DL"));
  }
}

export { pluginConfig as config, handler };
