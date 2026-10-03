// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import * as timeHelper from '../../src/lib/rara-time.js'
import path from 'path'
import fs from 'fs'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

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

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-RaraMD";

const pluginConfig = {
  name: "pixeldraindl",
  alias: ["pixeldraindl"],
  category: "download",
  description: "Download file dari Pixeldrain",
  usage: ".pixeldraindl <url>",
  example: ".pixeldraindl https://pixeldrain.com/u/xxxxx",
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const url = args[0]?.trim();

  if (!url || !url.includes("pixeldrain.com")) {
    return m.reply( `📥 *pixeldrain download*\n\n` +
        `Download file dari Pixeldrain\n\n` +
        `*format:*\n` +
        `\`${m.prefix}pixeldraindl <url>\`\n\n` +
        `*contoh:*\n` +
        `\`${m.prefix}pixeldraindl https://pixeldrain.com/u/xxxxx\``, "pixeldraindl");
  }
  try {
        await m.react("🕒");
    const apiUrl = `https://api.neoxr.eu/api/pixeldrain?url=${encodeURIComponent(url)}&apikey=${NEOXR_APIKEY}`;
    const data = await f(apiUrl)

    if (!data?.status || !data?.data) {
      return m.reply(
        raraError("PixelDrain", "File gak nemu nih — cek linknya ya"),
      );
    }

    const file = data.data;

    const sizeMatch = file.size?.match(/([\d.]+)\s*(MB|GB|KB)/i);
    let sizeInMB = 0;
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      if (unit === "GB") sizeInMB = value * 1024;
      else if (unit === "MB") sizeInMB = value;
      else if (unit === "KB") sizeInMB = value / 1024;
    }

    if (sizeInMB > 0 && sizeInMB <= 100) {

      const _cap = mediaCaption({ platformIcon: "🟦", platformName: "PixelDrain", title: file.name || "PixelDrain File", format: "File", method: "pixeldrain" });
      await sock.sendMessage(m.chat, {
        document: { url: file.url }, caption: _cap,
        fileName: file.filename,
        mimetype: 'application/octet-stream',
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m })
    } else if (sizeInMB > 100) {
      await m.reply(raraWrap("Pixeldraindl", `⚠️ *file terlalu besar*\n\nFile ${file.size} terlalu besar untuk dikirim\nGunakan link download di atas`));
    }
      await m.react("🐣"); await m.react("🐣"); m.reply(raraBerhasil("pixeldraindl"));
  } catch (error) {
    m.reply(raraGangguan("PixelDrain"));
  }
}

export { pluginConfig as config, handler }