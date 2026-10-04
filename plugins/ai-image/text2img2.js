// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import { raraWrap, toSC, raraGuide } from "../../src/lib/rara-menu-style.js";

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
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}


const pluginConfig = {
  name: "text2img2",
  alias: ["text2img2"],
  category: 'ai image',
  description: 'Generate image from text using AI',
  usage: '.text2img2 <prompt>',
  example: '.text2img2 a futuristic city in mars',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
}

async function handler(m, { sock }) {
  if (!m.fullArgs) { return await m.reply(raraGuide(m.command, {
 kaomoji: "(◕ᴗ◕)",
 sapaan: "bikin gambar dari teks, deskripsikan aja yang kamu mau!",
    cara: "ketik prompt/deskripsi gambarnya sesudah command",
    contoh: `${m.prefix + m.command} car`,
    spec: ["⚡ energi 5", "⏱ 10dtk", "💸 gratis"],
  })); }
  try {
  await m.react("🕒");
    const url = `https://api-abztech.zone.id/ai/genimg?text=${encodeURIComponent(m.fullArgs)}`
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.data || response.data.length < 100) {
      throw new Error('Invalid image data received')
    }

    await sock.sendMedia(m.chat, response.data, m.fullArgs, m, { type: 'image' })
  } catch (e) {
    console.error(e)
    return m.reply(raraWrap("text2img2", te(m.prefix, m.command, m.pushName), "error"))
  }
}

export { pluginConfig as config, handler }