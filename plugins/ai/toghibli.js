// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import { uploadImage } from '../../src/lib/nova-uploader.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "toghibli",
    alias: ["toghibli", "ghibli", "ghiblistyle"],
    category: 'ai',
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
        { const __navText = claraWrap("Ghibli sTyle", `🎨 *Ghibli sTyle*\n\n> Kirim/reply gambar untuk diubah ke style Ghibli\n\n\`${m.prefix}toghibli\``); return await sendReplyWithNav(sock, m, __navText, "toghibli"); }
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
            return m.reply(claraWrap("toghibli", `❌ Gagal mendownload gambar`))
        }
        
        const imageUrl = await uploadImage(buffer, 'image.jpg')
        
        const res = await f(`https://api-faa.my.id/faa/toghibli?url=${encodeURIComponent(imageUrl)}`, 'arrayBuffer')
        
        m.react('✅')
        
        await sock.sendMedia(m.chat, Buffer.from(res), null, m, {
            type: 'image',
        })
        
    } catch (error) {
        m.reply(claraWrap("toghibli", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }