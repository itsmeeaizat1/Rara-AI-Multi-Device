// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import { uploadImage } from '../../src/lib/nova-uploader.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'tohijab',
    alias: ["tohijab"],
    category: 'ai image',
    description: 'Tambahkan hijab ke gambar',
    usage: '.tohijab (reply gambar)',
    example: '.tohijab',
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
        { const __navText = claraWrap("Hijab sTyle", `Kirim/reply gambar\n\n\`${m.prefix}tohijab\``); return await m.reply(__navText, "tohijab"); }
    }
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("tohijab", `❌ Gagal mendownload gambar`))
        }
        
        const imageUrl = await uploadImage(buffer, 'image.jpg')
        
        const url = `https://api-faa.my.id/faa/tohijab?url=${encodeURIComponent(imageUrl)}`
        const res = await f(url, 'arrayBuffer')
        await sock.sendMedia(m.chat, Buffer.from(res), null, m, {
            type: 'image',
        })
        
    } catch (error) {
        m.reply(claraWrap("tohijab", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }