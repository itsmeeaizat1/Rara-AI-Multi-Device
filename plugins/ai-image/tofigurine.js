// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC, raraGuideV2 } from "../../src/lib/rara-menu-style.js";
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
    name: 'tofigure3',
    alias: ["tofigure3"],
    category: 'ai image',
    description: 'Ubah foto menjadi action figure/figurine koleksi',
    usage: '.tofigure3 (reply/kirim gambar)',
    example: '.tofigure3',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 3,
    isEnabled: true
}

const PROMPT = `Using the model, create a 1/7 scale commercialized figurine of the characters in the picture, 
in a realistic style, in a real environment. The figurine is placed on a computer desk. 
The figurine has a round transparent acrylic base, with no text on the base. 
The content on the computer screen is the modeling process of this figurine. 
Next to the computer screen is a BANDAI-style toy packaging box printed with the original artwork. 
The packaging features two-dimensional flat illustrations.`

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))
    
    if (!isImage) {
        return m.reply(raraGuideV2("tofigurine", {
 kaomoji: "(•̀ᴗ•́)و",
 sapaan: "ubah fotomu jadi figurine / action figure!",
      cara: "kirim atau reply gambar dengan caption commandnya",
      contoh: `${m.prefix}tofigure3`,
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
            return m.reply(raraWrap("tofigure3", `❌ Gagal mendownload gambar`))
        }
        
        
        
        const result = await live3d(buffer, PROMPT)
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image'
        })
        // format info hasil (request owner 19-20 Sep — field sesuai fitur)
        await m.reply(mediaInfoCaption({ header: "Rara Figurine", fields: [
            { icon: "📥", label: "Input", value: "Foto" },
            { icon: "🎨", label: "Style", value: "Action Figure" },
            { icon: "⚙️", label: "Engine", value: "SeaArt Live3D" },
            { icon: "⬇️", label: "Hasil", value: "Gambar" },
        ] }))
        
    } catch (error) {
        m.reply(raraWrap("tofigure3", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }