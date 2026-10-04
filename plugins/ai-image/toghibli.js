// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, toSC } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import { uploadImage } from '../../src/lib/rara-uploader.js'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch ai-image) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


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
    name: "toghibli",
    alias: ["toghibli"],
    category: 'ai image',
    description: 'Ubah gambar ke style Ghibli',
    usage: '.toghibli (reply gambar)',
    example: '.toghibli',
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
        return m.reply(raraGuide("toghibli", {
 kaomoji: "(˶ᵔ ᵕ ᵔ˶)",
 sapaan: "ubah fotomu jadi gaya Ghibli yang hangat dan mimpi!",
        cara: "kirim atau reply gambar dengan caption commandnya",
        contoh: `${m.prefix}toghibli`,
        spec: ["⚡ energi 2", "⏱ 30dtk", "💸 gratis"],
      }), "toghibli");
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
            return m.reply(raraWrap("toghibli", `❌ Gagal mendownload gambar`))
        }
        
        const imageUrl = await uploadImage(buffer, 'image.jpg')
        
        const url = `https://api-faa.my.id/faa/toghibli?url=${encodeURIComponent(imageUrl)}`
        const res = await f(url, 'arrayBuffer')
        // GUARD 14 Sep 2026: f() bisa balikin null (status>=400 ketangkep)
        // ATAU ArrayBuffer 0 byte kalau API sempet redirect (server ganti tanpa
        // kabar) — cek dulu biar gak diam-diam kirim gambar rusak/kosong.
        if (!res || res.byteLength === 0) {
            throw new Error('Response gambar dari API kosong/gagal')
        }
        const resultBuffer = Buffer.from(res)
        const toghibliCard = await dlCard("gambar", { buffer: resultBuffer }, [["Input", "Foto (reply)"], ["Style", "Ghibli"], ["Engine", "FAA toghibli"]]);
        await sock.sendMedia(m.chat, resultBuffer, (toghibliCard || null), m, {
            type: 'image'
        })
        
    } catch (error) {
        m.reply(raraWrap("toghibli", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }