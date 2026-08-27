// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "balogo",
    alias: ["balogo"],
    category: 'canvas',
    description: 'Membuat logo Blue Archive style',
    usage: '.balogo <textL> & <textR>',
    example: '.balogo Blue & Archive',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const input = m.text?.trim() || ''
    const parts = input.split(/[&,]/).map(s => s.trim()).filter(s => s)
    
    if (parts.length < 2) {
        { const __navText = `🎮 *ʙʟᴜᴇ ᴀʀᴄʜɪᴠᴇ ʟᴏɢᴏ*\n\nMasukkan 2 teks untuk logo\n\n💡 *Contoh:* ${m.prefix}balogo Blue & Archive`; return await m.reply(__navText); }
    }
    
    const textL = parts[0]
    const textR = parts[1]
    
    m.react('🕐')
    
    try {
        const apiUrl = `https://api.nexray.web.id/maker/balogo?text=${encodeURIComponent(textL)} ${encodeURIComponent(textR)}`
        const response = await f(apiUrl, 'arrayBuffer')
        
        await sock.sendMedia(m.chat, Buffer.from(response), null, m, {
            type: 'image',
        })
        
        m.react('✅')
        
    } catch (error) {
        m.reply(claraWrap("balogo", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }