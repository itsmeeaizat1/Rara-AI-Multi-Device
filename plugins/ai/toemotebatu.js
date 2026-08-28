// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
import { uploadImage } from '../../src/lib/nova-uploader.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'toemotebatu',
    alias: ["toemotebatu"],
    category: 'ai',
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
        { const __navText = claraWrap("Emote Batu", `🗿 *ᴇᴍᴏᴛᴇ ʙᴀᴛᴜ*\n\nKirim/reply gambar\n\n\`${m.prefix}toemotebatu\``); return await m.reply(__navText, "toemotebatu"); }
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
            return m.reply(claraWrap("toemotebatu", `❌ Gagal mendownload gambar`))
        }
        
        const imageUrl = await uploadImage(buffer, 'image.jpg')
        
        const url = `https://api-faa.my.id/faa/tomoai?url=${encodeURIComponent(imageUrl)}`
        const res = await f(url, 'arrayBuffer')
        
        m.react('✅')
        
        await sock.sendMedia(m.chat, Buffer.from(res), null, m, {
            type: 'image'
        })
        
    } catch (error) {
        m.reply(claraWrap("toemotebatu", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }