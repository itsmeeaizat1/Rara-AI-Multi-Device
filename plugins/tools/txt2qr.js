// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "txt2qr",
    alias: ["txt2qr", "textqr", "text2qr"],
    category: 'tools',
    description: 'Generate QR code dari teks',
    usage: '.txt2qr <text>',
    example: '.txt2qr https://google.com',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    
    if (!text) {
        { const __navText = `📱 *TExT TO QR*\n\nMasukkan teks/URL\n\n\`Contoh: ${m.prefix}txt2qr https://google.com\``; return await m.reply( __navText, "txt2qr"); }
    }
    
    m.react('🕐')
    
    try {
        const url = `https://api-faa.my.id/faa/qr-create?text=${encodeURIComponent(text)}`
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        })
        
        m.react('✅')
        
        await sock.sendMessage(m.chat, {
            image: Buffer.from(res.data),
            caption: `📱 *QR CODE*\n\n${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`
        }, { quoted: m })
        
    } catch (error) {
        m.reply(claraWrap("txt2qr", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }