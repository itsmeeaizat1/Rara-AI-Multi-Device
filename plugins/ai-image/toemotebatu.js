// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC } from "../../src/lib/rara-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";
import { uploadImage } from '../../src/lib/rara-uploader.js'
import { f } from '../../src/lib/rara-http.js'
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
    name: 'toemotebatu',
    alias: ["toemotebatu"],
    category: 'ai image',
    description: 'Ubah gambar ke emote batu 🗿',
    usage: '.toemotebatu (reply gambar)',
    example: '.toemotebatu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 2,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')
    
    if (!isImage) {
        return m.reply(raraGuide("toemotebatu", {
 kaomoji: "(・∀・)",
 sapaan: "ubah fotomu jadi emote batu ala stiker chat!",
        cara: "kirim atau reply gambar dengan caption commandnya",
        contoh: `${m.prefix}toemotebatu`,
        spec: ["⚡ energi 2", "⏱ 30dtk", "💸 gratis"],
      }), "toemotebatu");
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
            return m.reply(raraWrap("toemotebatu", `❌ Gagal mendownload gambar`))
        }
        
        const imageUrl = await uploadImage(buffer, 'image.jpg')
        
        const url = `https://api-faa.my.id/faa/tomoai?url=${encodeURIComponent(imageUrl)}`
        // GUARD 14 Sep 2026: f() bisa balikin null (status>=400 ketangkep)
        // ATAU ArrayBuffer 0 byte kalau API sempet redirect (server ganti tanpa
        // kabar) — cek dulu biar gak diam-diam kirim gambar rusak/kosong.
        if (!res || res.byteLength === 0) {
            throw new Error('Response gambar dari API kosong/gagal')
        }
        const resultBuffer = Buffer.from(res)
        await sock.sendMedia(m.chat, resultBuffer, null, m, {
            type: 'image'
        })
        // format info hasil (request owner 19-20 Sep — field sesuai fitur)
        await m.reply(mediaInfoCaption({ header: "Rara Emote Batu", fields: [
            { icon: "📥", label: "Input", value: "Foto" },
            { icon: "🎨", label: "Style", value: "Emote Batu" },
            { icon: "⚙️", label: "Engine", value: "FAA AI API" },
            { icon: "⬇️", label: "Hasil", value: "Gambar" },
        ] }))
        
    } catch (error) {
        m.reply(raraWrap("toemotebatu", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }