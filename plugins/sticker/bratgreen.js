// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'bratgreen',
    alias: ["bratgreen", "brat2"],
    category: 'sticker',
    description: 'Membuat sticker brat ijo',
    usage: '.brat2 <text>',
    example: '.brat2 Hai semua',
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
        { const __navText = `🖼️ *ʙʀᴀᴛ ɢʀᴇᴇɴ*\n\nMasukkan teks\n\n\`Contoh: ${m.prefix}bratgreen Hai semua\``; return await m.reply( __navText, "bratgreen"); }
    }
    try {
        const url = `https://api.nova.my.id/api/brat-grenn?text=${encodeURIComponent(text)}`
        await sock.sendImageAsSticker(m.chat, url, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
    } catch (error) {
        m.reply(claraWrap("bratgreen", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }