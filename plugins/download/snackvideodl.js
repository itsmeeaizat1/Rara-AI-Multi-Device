// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { snackvideo } from 'btch-downloader'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

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
    name: "snackvideodl",
    alias: ["snackvideodl", "svdl"],
    category: 'download',
    description: 'Download video SnackVideo',
    usage: '.svdl <url>',
    example: '.svdl https://www.snackvideo.com/@xxx/video/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(novaNoInput("SnackVideo", "Kirim URL SnackVideo yang mau didownload!", `${m.prefix}svdl https://www.snackvideo.com/@xxx/video/xxx`))
    }
    
    if (!url.match(/snackvideo\.com/i)) {
        return m.reply(novaGuide("SnackVideo", "URL-nya gak valid nih! Pastikan dari SnackVideo ya.", `${m.prefix}svdl https://www.snackvideo.com/@xxx/video/xxx`))
    }
    try {
        await m.react("🕒")
        const data = await snackvideo(url)
        
        if (!data?.status || !data?.result?.videoUrl) {
            return m.reply(novaEmpty("SnackVideo", "Gagal mengambil video SnackVideo. Coba link lain ya!"))
        }
        
        const result = data.result
        
        const caption = mediaCaption({
            platformIcon: "🎬", platformName: "SnackVideo",
            title: result.title || result.author || "SnackVideo",
            author: result.author || null,
            format: "Video", method: "btch-downloader",
        })
        await m.react("🐣")
        await sock.sendMessage(m.chat, {
            video: { url: result.videoUrl },
            caption,
            contextInfo: { forwardingScore: 0, isForwarded: false },
        }, { quoted: m })
        
        await m.reply(novaBerhasil("snackvideodl"));
    } catch (err) {
        return m.reply(novaGagal("SnackVideo"))
    }
}

export { pluginConfig as config, handler }
