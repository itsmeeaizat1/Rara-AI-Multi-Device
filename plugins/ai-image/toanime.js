// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC } from "../../src/lib/rara-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";
import te from '../../src/lib/rara-error.js'
import { live3d } from '../../src/scraper/seaart.js'

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
    name: "toanime",
    alias: ["toanime"],
    category: 'ai image',
    description: 'Ubah foto menjadi gaya anime/Ghibli Studio',
    usage: '.toanime (reply/kirim gambar)',
    example: '.toanime',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 3,
    isEnabled: true
}

const PROMPT = `Transform this image into Studio Ghibli anime style. 
Make the characters look like they belong in a Ghibli movie with soft colors, 
detailed backgrounds, expressive eyes, and that signature warm, magical atmosphere. 
Keep the original composition but apply the distinct Ghibli artistic style with 
watercolor-like textures and dreamy lighting.`

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))
    
    if (!isImage) {
        return m.reply(raraGuide("toanime", {
 kaomoji: "(≧▽≦)",
 sapaan: "ubah fotomu jadi gaya anime khas jepang!",
      cara: "kirim atau reply gambar dengan caption commandnya",
      contoh: `${m.prefix}toanime`,
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
            return m.reply(raraWrap("toanime", `❌ Gagal mendownload gambar`))
        }
        const result = await live3d(buffer, PROMPT)
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image'
        })
        // format info hasil (request owner 19-20 Sep — field sesuai fitur)
        await m.reply(mediaInfoCaption({ header: "Rara To Anime", fields: [
            { icon: "📥", label: "Input", value: "Foto" },
            { icon: "🎨", label: "Style", value: "Anime (Ghibli)" },
            { icon: "⬇️", label: "Hasil", value: "Gambar" },
        ] }))
        
    } catch (error) {
        console.log(error)
        m.reply(raraWrap("toanime", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }