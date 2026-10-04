// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

import axios from 'axios'
import config from '../../config.js'
import { downloadContentFromMessage } from 'rara'
import te from '../../src/lib/rara-error.js'
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'

const pluginConfig = {
    name: "animeapaini",
    alias: ["animeapaini"],
    category: 'search',
    description: 'Identifikasi anime dari gambar/screenshot',
    usage: '.animeapaini (reply gambar)',
    example: '.animeapaini',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}


// Upload via engine rara-uploader (Kappa → Pone → Uguu) — termai dilepas 1 Okt 2026
import { uploadImage } from "../../src/lib/rara-uploader.js"
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
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


async function uploadToTempfiles(buffer) {
    return uploadImage(buffer, 'image.jpg')
}


async function handler(m, { sock }) {
    let imageBuffer = null
    let imageMsg = null
    
    if (m.isImage && m.message?.imageMessage) {
        imageMsg = m.message.imageMessage
    } else if (m.quoted?.isImage && m.quoted?.message?.imageMessage) {
        imageMsg = m.quoted.message.imageMessage
    } else if (m.quoted?.isImage) {
        try {
            imageBuffer = await m.quoted.download()
        } catch (e) { console.error('[animeapaini.js]:', e.message); }
    }
    
    if (m.isVideo || m.quoted?.isVideo) {
        return m.reply(`❌ *Tidak Didukung*\n\nHanya gambar/screenshot yang didukung\nVideo tidak bisa diproses\n\n\`Reply atau kirim gambar dengan caption ${m.prefix}animeapaini\``)
    }
    
    if (!imageMsg && !imageBuffer) {
        return m.reply(
            `🔍 *Anime Apa Ini?*\n\n` +
            `Kirim gambar dengan caption:\n` +
            `\`${m.prefix}animeapaini\`\n\n` +
            `Atau reply gambar dengan:\n` +
            `\`${m.prefix}animeapaini\`\n\n` +
            `⚠️ *catatan:* Video tidak didukung, hanya gambar/screenshot`
        )
    }
    try {
        if (!imageBuffer && imageMsg) {
            const stream = await downloadContentFromMessage(imageMsg, 'image')
            let chunks = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }
            imageBuffer = Buffer.concat(chunks)
        }
        
        if (!imageBuffer || imageBuffer.length < 100) {
            return m.reply(raraError("AnimeApaini", "Gagal ambil gambar nih, coba kirim ulang"))
        }
        const imageUrl = await uploadToTempfiles(imageBuffer)
        
        const res = await axios.get(`https://api.neoxr.eu/api/whatanime?url=${encodeURIComponent(imageUrl)}&apikey=${NEOXR_APIKEY}`, {
            timeout: 60000
        })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(raraError("AnimeApaini", "Anime gak nemu nih, coba screenshot yang lebih jelas"))
        }
        
        const d = res.data.data
        
        const similarity = ((d.similarity || 0) * 100).toFixed(2)
        
        const formatTime = (seconds) => {
            if (!seconds) return '00:00'
            const mins = Math.floor(seconds / 60)
            const secs = Math.floor(seconds % 60)
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        
        const filename = d.filename || 'Unknown'
        const animeName = filename.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\.mp4|\.mkv|\.avi/gi, '').trim() || 'Unknown Anime'
        
        const caption = `🔍 *Anime Apa Ini?*\n\n` +
            `🎬 *anime:* ${animeName}\n` +
            `📺 *episode:* ${d.episode || 'Movie/OVA'}\n` +
            `🆔 *anilist id:* ${d.anilist || '-'}\n\n` +
            `⏱️ *timestamp:*\n` +
            `  │ From: \`${formatTime(d.from)}\`\n` +
            `  │ To: \`${formatTime(d.to)}\`\n\n` +
            `📊 *similarity:* ${similarity}%\n\n` +
            `🔗 https://anilist.co/anime/${d.anilist || ''}`
        if (d.image) {
            const card = await dlCard("gambar", { url: d.image }, [["Judul", String(animeName).slice(0, 40)], ["Episode", String(d.episode || "Movie/OVA")]]);
            await sock.sendMedia(m.chat, d.image, card ? `${card}\n\n${caption}` : caption, m, {
                type: 'image'
            })
        } else {
            await m.reply(raraWrap("animeapaini", caption))
        }
        
    } catch (error) {
        m.reply(raraWrap("animeapaini", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }