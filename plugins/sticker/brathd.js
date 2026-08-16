// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import config from '../../config.js'
import te from '../../src/lib/nova-error.js'

const pluginConfig = {
    name: 'brathd',
    alias: ['brathdsticker', 'brathds'],
    category: 'sticker',
    description: 'Membuat sticker brat HD',
    usage: '.brathd <text>',
    example: '.brathd hello world',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text
    
    if (!text) {
        { const __navText = `🖼️ *Brat Hd sTicker*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}brathd hello world\``; return await sendReplyWithNav(sock, m, __navText, "brathd"); }
    }
    
    m.react('🕐')
    
    try {
        const url = `https://api.nova.my.id/api/brat-hd?text=${encodeURIComponent(text)}`
        await sock.sendImageAsSticker(m.chat, url, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
        m.react('✅')
    } catch (error) {
        m.reply(claraWrap("brathd", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }