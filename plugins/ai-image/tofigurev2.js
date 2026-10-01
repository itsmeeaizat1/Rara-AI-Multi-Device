// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, toSC, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { mediaInfoCaption } from "../../src/lib/nova-media-info.js";
import axios from 'axios'
import { uploadImage } from '../../src/lib/nova-uploader.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'

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
    name: 'tofigurev2',
    alias: ["tofigurev2"],
    category: 'ai image',
    description: 'Ubah gambar ke style Figure v2',
    usage: '.tofigurev2 (reply gambar)',
    example: '.tofigurev2',
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
        return m.reply(novaGuideV2("tofigurev2", {
 kaomoji: "(๑˃̵ᴗ˂̵)و",
 sapaan: "ubah fotomu jadi figure versi 2 yang detail!",
        cara: "kirim atau reply gambar dengan caption commandnya",
        contoh: `${m.prefix}tofigurev2`,
        spec: ["⚡ energi 2", "⏱ 30dtk", "💸 gratis"],
      }), "tofigurev2");
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
            return m.reply(novaWrap("tofigurev2", `❌ Gagal mendownload gambar`))
        }
        
        const imageUrl = await uploadImage(buffer, 'image.jpg')
        
        const url = `https://api-faa.my.id/faa/tofigurav3?url=${encodeURIComponent(imageUrl)}`
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
        await m.reply(mediaInfoCaption({ header: "Nova Figure v2", fields: [
            { icon: "📥", label: "Input", value: "Foto" },
            { icon: "🎨", label: "Style", value: "Figure v2" },
            { icon: "⚙️", label: "Engine", value: "FAA AI API" },
            { icon: "⬇️", label: "Hasil", value: "Gambar" },
        ] }))
        
    } catch (error) {
        m.reply(novaWrap("tofigurev2", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }