// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// igmp3.js — Download audio dari Instagram (pakai scraper ig.js lokal)
import { PinDL } from "../../src/scraper/pindl.js";
import { igDownload } from "../../src/scraper/ig.js";
import { raraError, raraGuide, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

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
  name: "igmp3",
  alias: ["igmp3"],
  category: "download",
  description: "Download audio dari Instagram",
  usage: ".igmp3 <url_instagram>",
  example: ".igmp3 https://www.instagram.com/reel/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.text?.trim();
    if (!url || !url.includes("instagram.com")) {
      return m.reply(raraGuide("IG MP3", "Kirim URL Instagram yang valid!", ".igmp3 https://www.instagram.com/reel/xxx"));
    }

    await m.react("🕒");

    // Pakai scraper IG lokal
    let result;
    try {
      result = await igDownload(url);
    } catch (e) {
      console.error("[igmp3.js] ig scraper:", e.message);
      await m.react("❌");
      return m.reply(raraGagal("IG MP3"));
    }

    if (!result || (!result.url && !result.download)) {
      await m.react("❌");
      return m.reply(raraError("IG MP3", "Media tidak ditemukan atau private!"));
    }

    const mediaUrl = result.url || result.download;
    const title = result.title || "Instagram Audio";

    // Download sebagai audio
    const axios = (await import("axios")).default;
    const audioRes = await axios.get(mediaUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(audioRes.data);

    const caption = mediaCaption({
      platformIcon: "📸",
      platformName: "Instagram",
      title,
      format: "🎵 Audio",
      method: "Scraper Lokal",
    });

    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${title}.mp3`,
    }, { quoted: m });
    await m.reply(caption);
    await m.react("🐣");
    await m.reply(raraBerhasil("igmp3"));
  } catch (err) {
    console.error("[IG MP3]", err);
    await m.react("❌");
    m.reply(raraGagal("IG MP3"));
  }
}

export { pluginConfig as config, handler };
