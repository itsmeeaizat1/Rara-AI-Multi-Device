// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { uploadTo0x0 } from '../../src/lib/nova-tmpfiles.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'fakeff2',
    alias: ['fakefreefire2'],
    category: 'canvas',
    description: 'Membuat gambar ff',
    usage: '.fakeff2 <text>',
    example: '.fakeff2 Hai cantik',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const nama = m.text
    if(!nama) {
        { const __navText = claraWrap("FAKE FF 2", `*FAKE FF 2*\n\nContoh: ${m.prefix}fakeff nama1`); return await m.reply(__navText, "fakeff2"); }
    }
    m.react('🕐')
    
    try {
        await sock.sendMedia(m.chat, `https://api.nova.my.id/api/fake-free-fire-2?text=${encodeURIComponent(nama)}&bg=random`, null, m, {
            type: 'image',
        })
        
        m.react('✅')
        
    } catch (error) {
        m.reply(claraWrap("fakeff2", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }