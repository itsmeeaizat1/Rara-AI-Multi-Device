// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC } from "../../src/lib/rara-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";
import { live3d } from '../../src/scraper/seaart.js'
import te from '../../src/lib/rara-error.js'

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
    name: 'toisland',
    alias: ["toisland"],
    category: 'ai image',
    description: 'Ubah foto menjadi suasana pulau tropis',
    usage: '.toisland (reply/kirim gambar)',
    example: '.toisland',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 3,
    isEnabled: true
}

const PROMPT = `Transform this image into a tropical island scene. 
Place the subject in a beautiful island environment with clear blue ocean, palm trees, and warm sunlight. 
Add realistic lighting, shadows, and vibrant tropical colors. 
Keep the original identity, high detail, cinematic, photorealistic.`

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))
    
    if (!isImage) {
        return m.reply(raraGuide("toisland", {
 kaomoji: "(◕‿◕)",
 sapaan: "pindahkan suasana fotomu ke pulau tropis!",
      cara: "kirim atau reply gambar dengan caption commandnya",
      contoh: `${m.prefix}toisland`,
      spec: ["⚡ energi 3", "⏱ 60dtk", "💸 gratis"],
    }))
    }
    try {
    await m.react("🕒");
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("toisland", `❌ Gagal mendownload gambar`))
        }
        
        const result = await live3d(buffer, PROMPT)
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image',
        })
        // format info hasil (request owner 19-20 Sep — field sesuai fitur)
        await m.reply(mediaInfoCaption({ header: "Rara To Island", fields: [
            { icon: "📥", label: "Input", value: "Foto" },
            { icon: "🎨", label: "Style", value: "Pulau Tropis" },
            { icon: "⬇️", label: "Hasil", value: "Gambar" },
        ] }))
        
    } catch (error) {
        m.reply(raraWrap("toisland", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }