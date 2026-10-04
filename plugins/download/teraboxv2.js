// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// teraboxv2.js — Download TeraBox v2 (pakai scraper terabox.js lokal)
import { TeraBoxDL } from "../../src/scraper/terabox.js";
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
  name: "teraboxv2",
  alias: ["teraboxv2", "tbdl2", "tb2"],
  category: "download",
  description: "Download dari TeraBox v2 (scraper lokal)",
  usage: ".teraboxv2 <url_terabox>",
  example: ".teraboxv2 https://terabox.com/s/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.text?.trim();
    if (!url || (!url.includes("terabox") && !url.includes("teraboxapp"))) {
      return m.reply(raraGuide("TeraBox v2", "Kirim URL TeraBox yang valid!", ".teraboxv2 https://terabox.com/s/xxx"));
    }

    await m.react("🕒");

    const result = await TeraBoxDL(url);
    if (!result || result.status === false || result.error) {
      await m.react("❌");
      return m.reply(raraError("TeraBox v2", result?.error || "Gagal download dari TeraBox!"));
    }

    const dlUrl = result.download || result.url || result.dl;
    if (!dlUrl) {
      await m.react("❌");
      return m.reply(raraError("TeraBox v2", "Link download tidak ditemukan!"));
    }

    const axios = (await import("axios")).default;
    const fileRes = await axios.get(dlUrl, {
      responseType: "arraybuffer", timeout: 120000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(fileRes.data);

    const caption = mediaCaption({
      platformIcon: "📁",
      platformName: "TeraBox",
      title: result.title || result.filename || "TeraBox File",
      format: result.type || "File",
      method: "Scraper Lokal",
    });

    // Cek apakah video atau file
    const isVideo = (result.type || result.filename || "").match(/mp4|avi|mkv|mov/i);
    if (isVideo) {
      await sock.sendMessage(m.chat, {
        video: buffer,
        caption,
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, {
        document: buffer,
        fileName: result.title || result.filename || "terabox_file",
        mimetype: result.mimetype || "application/octet-stream",
        caption,
      }, { quoted: m });
    }

    await m.react("🐣");
    await m.reply(raraBerhasil("teraboxv2"));
  } catch (err) {
    console.error("[TeraBox v2]", err);
    await m.react("❌");
    m.reply(raraGagal("TeraBox v2"));
  }
}

export { pluginConfig as config, handler };
