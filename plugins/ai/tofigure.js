// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import { uploadImage } from '../../src/lib/nova-uploader.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'tofigure',
    alias: ['figure', 'figurestyle'],
    category: 'ai',
    description: 'Ubah gambar ke style Figure/Action',
    usage: '.tofigure (reply gambar)',
    example: '.tofigure',
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
        { const __navText = claraWrap("Figure sTyle", `🎭 *ꜰɪɢᴜʀᴇ ꜱᴛʏʟᴇ*\n\nKirim/reply gambar untuk diubah ke style Figure\n\n\`${m.prefix}tofigure\``); return await m.reply(__navText, "tofigure"); }
    }
    
    m.react('🕐')
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("tofigure", `❌ Gagal mendownload gambar`))
        }
        
        const imageUrl = await uploadImage(buffer, 'image.jpg')
        
        const apiUrl = `https://api-faa.my.id/faa/tofigura?url=${encodeURIComponent(imageUrl)}`
        const res = await axios.get(apiUrl, { responseType: 'arraybuffer' })
        
        m.react('✅')
        
        await sock.sendMedia(m.chat, Buffer.from(res.data), null, m, {
            type: 'image',
        })
        
    } catch (error) {
        m.reply(claraWrap("tofigure", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }