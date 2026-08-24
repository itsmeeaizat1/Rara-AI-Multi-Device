// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'bratcewek',
    alias: ['cewekbrat', 'bratperempuan', 'bratgirl'],
    category: 'sticker',
    description: 'Membuat sticker brat',
    usage: '.bratcewek <text>',
    example: '.bratcewek Hai semua',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    if (!text) {
        { const __navText = `🖼️ *Brat cEwek sTicker*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}bratcewek Hai semua\``; return await m.reply( __navText, "bratcewek"); }
    }
    
    m.react('🕐')
    
    try {
        const url = `https://api.deline.web.id/maker/cewekbrat?text=${encodeURIComponent(text)}`
        await sock.sendImageAsSticker(m.chat, url, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
        m.react('✅')
    } catch (error) {
        m.reply(claraWrap("bratcewek", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }