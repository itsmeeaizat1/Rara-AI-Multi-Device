// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import axios from 'axios'
import config from '../../config.js'
const pluginConfig = {
    name: 'ai4chat',
    alias: ['ai4chat'],
    category: 'ai',
    description: 'Chat dengan AI4Chat',
    usage: '.ai4chat <pertanyaan>',
    example: '.ai4chat Apa itu JavaScript?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text
    if (!text) {
        return m.reply(claraWrap("Aichat", `🤖 *ᴀɪᴄʜᴀᴛ*\n\nMasukkan pertanyaan\n\n\`Contoh: ${m.prefix}ai4chat Apa itu JavaScript?\``), "ai4chat")
    }
    m.react('🕐')
    try {
        const data = await axios.get(`https://firefly.maiku.my.id/api/deepaichat?apikey=${config.APIkey.firefly}&text=${encodeURIComponent(text)}`)
        m.react('✅')
        { const __navText = `${data.data.data}`; await m.reply(__navText); }
    } catch (error) {
        console.log(error)
        m.reply(claraWrap("ai4chat", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }