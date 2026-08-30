// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// spotifyplay2.js — Spotify Play v2 (nexray API + spotify search)
import axios from "axios";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spotifyplay2",
  alias: ["spotifyplay2", "spotplay2", "sp2"],
  category: "download",
  description: "Cari & download lagu Spotify v2 (nexray API)",
  usage: ".spotifyplay2 <judul lagu / artist>",
  example: ".spotifyplay2 blinding lights the weeknd",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

// Search Spotify track via public API
async function spotifySearch(query) {
  try {
    const { data } = await axios.get(`https://api.spotifydown.org/metadata/search/${encodeURIComponent(query)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (data && data.tracks && data.tracks.length > 0) return data.tracks[0];
  } catch (e) {
    console.error("spotify search:", e.message);
  }
  // Fallback: spsearch
  try {
    const { data } = await axios.get(`https://api.nexray.web.id/search/spotify?query=${encodeURIComponent(query)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (data && (data.result || data.data) && (data.result[0] || data.data[0])) {
      return (data.result || data.data)[0];
    }
  } catch (e) {
    console.error("spotify nexray search:", e.message);
  }
  return null;
}

// Download via nexray
async function spotifyDownload(spotifyUrl) {
  try {
    const { data } = await axios.get(`https://api.nexray.web.id/downloader/spotify?url=${encodeURIComponent(spotifyUrl)}`, {
      timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (data && (data.result || data.data)) {
      const r = data.result || data.data;
      return {
        title: r.title || r.name,
        artist: r.artist || r.artists,
        album: r.album,
        cover: r.cover || r.thumbnail || r.image,
        downloadUrl: r.link || r.url || r.download || r.audio,
        duration: r.duration,
      };
    }
  } catch (e) {
    console.error("spotify nexray download:", e.message);
  }

  // Fallback: spotifydown.org
  try {
    const trackId = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)?.[1];
    if (trackId) {
      const { data } = await axios.get(`https://api.spotifydown.org/download/${trackId}`, {
        timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (data && data.link) {
        return {
          title: data.metadata?.title,
          artist: data.metadata?.artists,
          cover: data.metadata?.cover,
          downloadUrl: data.link,
          duration: data.metadata?.duration,
        };
      }
    }
  } catch (e) {
    console.error("spotifydown fallback:", e.message);
  }
  return null;
}

async function handler(m, { sock }) {
  try {
    const query = m.args.join(" ").trim();
    if (!query) {
      return m.reply(claraWrap("spotifyplay2", `Mau cari lagu apa?\n\nContoh: ${m.prefix}spotifyplay2 blinding lights the weeknd`, "guide"));
    }

    await m.react("🕒");

    // Search track
    const track = await spotifySearch(query);
    if (!track) {
      await m.react("❌");
      return m.reply(claraWrap("spotifyplay2", `Lagu "${query}" tidak ditemukan.`, "error"));
    }

    const spotifyUrl = track.url || track.external_urls?.spotify || track.link;
    const title = track.title || track.name;
    const artist = track.artist || track.artists?.map(a => a.name).join(", ") || "Unknown";
    const cover = track.cover || track.album?.images?.[0]?.url || track.thumbnail;
    const album = track.album?.name || track.album;
    const duration = track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}` : track.duration || "-";

    // Download
    const dl = await spotifyDownload(spotifyUrl);
    if (!dl || !dl.downloadUrl) {
      await m.react("❌");
      return m.reply(claraWrap("spotifyplay2", "Gagal download lagu. API mungkin down.", "error"));
    }

    // Download audio buffer
    const audRes = await axios.get(dl.downloadUrl, {
      responseType: "arraybuffer", timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(audRes.data);

    await m.react("🐣");

    let _lines = [];
      _lines.push(`Judul: *${dl.title || title}*`);
      _lines.push(`Artist: *${dl.artist || artist}*`);
    let msg = novaBox("sᴘᴏᴛɪғʏ ᴘʟᴀʏ v2", _lines);
    if (dl.album || album) _lines.push(`Album: *${dl.album || album}*`);
    _lines.push(`Durasi: *${duration}*`);
    _lines.push(`Size: *${(buffer.length / 1024 / 1024).toFixed(1)} MB*`);
    _lines.push(`Engine: nexray API`);
    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mp4",
      ptt: false,
      contextInfo: {
        externalAdReply: {
          title: (dl.title || title).slice(0, 50),
          body: dl.artist || artist,
          thumbnailUrl: dl.cover || cover,
          sourceUrl: spotifyUrl,
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    });
    return m.reply(msg);
  } catch (err) {
    console.error("spotifyplay2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("spotifyplay2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
