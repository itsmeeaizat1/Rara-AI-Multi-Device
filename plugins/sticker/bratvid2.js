// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'bratvid2',
    alias: ["bratvid2"],
    category: 'sticker',
    description: 'Generate brat video v2',
    usage: '.bratvid2 <text>',
    example: '.bratvid2 hello world',
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
        { const __navText = `🎬 *Brat Video V2*\n\nMasukkan teks\n\n\`Contoh: ${m.prefix}bratvid2 hello world\``; return await m.reply( __navText, "bratvid2"); }
    }
    try {
        const url = `https://api-faa.my.id/faa/bratvid?text=${encodeURIComponent(text)}`
        await sock.sendVideoAsSticker(m.chat, url, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
    } catch (error) {
        m.reply(claraWrap("bratvid2", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }