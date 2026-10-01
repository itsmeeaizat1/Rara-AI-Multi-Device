// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: "txt2qr",
    alias: ["txt2qr"],
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
        { const __navText = `📱 *text to qr*\n\nMasukkan teks/URL\n\n\`Contoh: ${m.prefix}txt2qr https://google.com\``; return await m.reply( __navText, "txt2qr"); }
    }
    try {
    await m.react("🕒");
        const url = `https://api-faa.my.id/faa/qr-create?text=${encodeURIComponent(text)}`
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        })
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
            image: Buffer.from(res.data),
            caption: `📱 *qr code*\n\n${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`
        }, { quoted: m })
        
    } catch (error) {
    await m.react("❌");
        m.reply(raraWrap("txt2qr", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }