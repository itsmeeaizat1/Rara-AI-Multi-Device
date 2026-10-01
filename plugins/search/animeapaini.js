// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import config from '../../config.js'
import { downloadContentFromMessage } from 'nova'
import te from '../../src/lib/nova-error.js'
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

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


// Upload via engine nova-uploader (Kappa → Pone → Uguu) — termai dilepas 1 Okt 2026
import { uploadImage } from "../../src/lib/nova-uploader.js"

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
            `⚠️ *ᴄᴀᴛᴀᴛᴀɴ:* Video tidak didukung, hanya gambar/screenshot`
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
            return m.reply(novaError("AnimeApaini", "Gagal ambil gambar nih, coba kirim ulang"))
        }
        const imageUrl = await uploadToTempfiles(imageBuffer)
        
        const res = await axios.get(`https://api.neoxr.eu/api/whatanime?url=${encodeURIComponent(imageUrl)}&apikey=${NEOXR_APIKEY}`, {
            timeout: 60000
        })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(novaError("AnimeApaini", "Anime gak nemu nih, coba screenshot yang lebih jelas"))
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
            `🎬 *ᴀɴɪᴍᴇ:* ${animeName}\n` +
            `📺 *ᴇᴘɪꜱᴏᴅᴇ:* ${d.episode || 'Movie/OVA'}\n` +
            `🆔 *ᴀɴɪʟɪꜱᴛ ɪᴅ:* ${d.anilist || '-'}\n\n` +
            `⏱️ *ᴛɪᴍᴇꜱᴛᴀᴍᴘ:*\n` +
            `  │ From: \`${formatTime(d.from)}\`\n` +
            `  │ To: \`${formatTime(d.to)}\`\n\n` +
            `📊 *ꜱɪᴍɪʟᴀʀɪᴛʏ:* ${similarity}%\n\n` +
            `🔗 https://anilist.co/anime/${d.anilist || ''}`
        if (d.image) {
            await sock.sendMedia(m.chat, d.image, caption, m, {
                type: 'image'
            })
        } else {
            await m.reply(claraWrap("animeapaini", caption))
        }
        
    } catch (error) {
        m.reply(claraWrap("animeapaini", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }