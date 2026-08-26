// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { live3d } from '../../src/scraper/seaart.js'
import te from '../../src/lib/nova-error.js'

const pluginConfig = {
    name: 'toisland',
    alias: ["toisland"],
    category: 'ai',
    description: 'Ubah foto menjadi suasana pulau tropis',
    usage: '.toisland (reply/kirim gambar)',
    example: '.toisland',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 3,
    isEnabled: true
}

const PROMPT = `Transform this image into a tropical island scene. 
Place the subject in a beautiful island environment with clear blue ocean, palm trees, and warm sunlight. 
Add realistic lighting, shadows, and vibrant tropical colors. 
Keep the original identity, high detail, cinematic, photorealistic.`

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))
    
    if (!isImage) {
        return m.reply( `🏝️ *ᴛᴏ ɪꜱʟᴀɴᴅ*\n\n` +
            `Kirim/reply gambar untuk suasana pulau\n\n` +
            `\`${m.prefix}toisland\``, "toisland")
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
            return m.reply(claraWrap("toisland", `❌ Gagal mendownload gambar`))
        }
        
        const result = await live3d(buffer, PROMPT)
        
        m.react('✅')
        
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image',
        })
        
    } catch (error) {
        m.reply(claraWrap("toisland", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }