// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// songs.js — Cari & play lagu (iTunes)
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBox, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

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


const pluginConfig = {
  name: "songs",
  alias: ["songs", "play", "playmusic"],
  category: "download",
  description: "Cari dan preview lagu dari iTunes",
  usage: ".songs <judul_lagu>",
  example: ".songs Bohemian Rhapsody",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(raraWrap("songs", `Masukkan judul lagu!\n\nContoh: .songs Bohemian Rhapsody`, "guide"));

    const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=5&media=music`);
    const results = res.data?.results || [];
    if (!results.length) return m.reply(raraWrap("songs", "Lagu tidak ditemukan!", "error"));

    // Send first result preview
    const track = results[0];
    if (track.previewUrl) {
      const _cap = mediaCaption({
        platformIcon: "🎵", platformName: "iTunes",
        title: track.trackName,
        author: track.artistName,
        description: track.collectionName || null,
        format: "Preview (30s)",
        method: "iTunes",
      });
      await m.reply(_cap);
      await sock.sendMessage(from, {
        audio: { url: track.previewUrl },
        mimetype: "audio/mpeg",
      }, { quoted: m });
    }

    let _lines = [];
      _lines.push(`Hasil: ${query}`);
    results.forEach((t, i) => {
      _lines.push(`${i + 1}. ${t.trackName} - ${t.artistName}`);
      _lines.push(`Album: ${t.collectionName || "Unknown"}`);
    });
    let msg = raraBox("SONGS", _lines);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("songs error:", err);
    await m.react("❌");
    return m.reply(raraGangguan("songs"));
  }
}

export { pluginConfig as config, handler };
