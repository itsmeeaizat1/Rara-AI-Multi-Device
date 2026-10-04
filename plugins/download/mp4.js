// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { tipText, raraWrap, raraCaption, raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";

// Caption builder LOKAL (bukan shared lib - owner: tiap fitur punya sendiri, 14 Sep 2026)
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
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `mp4_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const url = m.text?.trim();

    if (!url) {
      await m.reply(raraNoInput("MP4 Downloader", "Masukkan link langsung video MP4!", `${prefix}mp4 https://example.com/video.mp4`));
      return { handled: true };
    }

    const response = await axios.get(url, { responseType: "arraybuffer", maxRedirects: 5 });
    const buffer = Buffer.from(response.data);
    const fileName = url.split("/").pop() || `video_${Date.now()}.mp4`;
    const fileSize = (buffer.length / 1024 / 1024).toFixed(2);

    let card = "";
    try {
      const info = await probeBuffer(buffer, { mime: "video/mp4" });
      card = mediaResultCard({
        header: pluginConfig.name,
        type: "video",
        title: fileName,
        platform: "Direct MP4",
        request: [["Nama File", fileName]],
        size: info.size, mime: info.mime, width: info.width, height: info.height, duration: info.duration,
      });
    } catch { /* best-effort */ }
    const _cap = mediaCaption({
      platformIcon: "🎬", platformName: "MP4",
      title: fileName,
      format: `${fileSize} MB`,
      method: "direct",
    });

    await m.react("🐣");
    await sock.sendMessage(m.chat, {
      video: buffer,
      caption: card || _cap,
    }, { quoted: m });
    await m.reply(raraBerhasil("mp4"));
  } catch (error) {
    await m.reply(raraGagal("MP4 Downloader"));
  }

  return { handled: true };
}

const pluginConfig = {
  name: "mp4",
  alias: ["mp4"],
  category: "download",
  description: "Download file MP4 dari link",
  usage: ".mp4 <link>",
  example: ".mp4 https://example.com/video.mp4",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }