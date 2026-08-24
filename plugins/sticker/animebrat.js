// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "animebrat",
    alias: ["animebrat", "bratanime2", "animetext2"],
    category: 'sticker',
    description: 'Membuat sticker brat',
    usage: '.animebrat <text>',
    example: '.animebrat Hai semua',
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
        { const __navText = `🖼️ *Brat Anime sTicker*\n\nMasukkan teks\n\n\`Contoh: ${m.prefix}animebrat Hai semua\``; return await m.reply( __navText, "bratanime"); }
    }
    
    m.react('🕐')
    
    try {
        const url = `https://api.nexray.web.id/maker/bratanime?text=${encodeURIComponent(text)}`
        await sock.sendImageAsSticker(m.chat, url, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
        m.react('✅')
    } catch (error) {
        m.reply(claraWrap("animebrat", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }