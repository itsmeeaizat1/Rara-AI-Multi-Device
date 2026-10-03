// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ptv.js — Download video Pinterest (pakai scraper pindl.js lokal)
import { PinDL } from "../../src/scraper/pindl.js";
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
  name: "ptv",
  alias: ["ptv", "pinterestvideo"],
  category: "download",
  description: "Download video dari Pinterest",
  usage: ".ptv <url_pinterest>",
  example: ".ptv https://pin.it/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.text?.trim();
    if (!url || (!url.includes("pinterest.") && !url.includes("pin.it"))) {
      return m.reply(raraGuide("Pinterest Video", "Kirim URL Pinterest yang valid!", ".ptv https://pin.it/xxx"));
    }

    await m.react("🕒");

    const result = await PinDL(url);
    if (!result || result.error) {
      await m.react("❌");
      return m.reply(raraError("Pinterest Video", result?.error || "Gagal download video Pinterest!"));
    }

    const mediaUrl = result.url || result.download;
    if (!mediaUrl) {
      await m.react("❌");
      return m.reply(raraError("Pinterest Video", "Media tidak ditemukan!"));
    }

    const caption = mediaCaption({
      platformIcon: "📌",
      platformName: "Pinterest",
      title: result.title || "Pinterest Video",
      format: "📹 Video",
      method: "Scraper Lokal",
    });

    await sock.sendMessage(m.chat, {
      video: { url: mediaUrl },
      caption,
    }, { quoted: m });
    await m.react("🐣");
    await m.reply(raraBerhasil("ptv"));
  } catch (err) {
    console.error("[PTV]", err);
    await m.react("❌");
    m.reply(raraGagal("Pinterest Video"));
  }
}

export { pluginConfig as config, handler };
