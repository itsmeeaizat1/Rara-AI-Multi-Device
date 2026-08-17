// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'chords',
    alias: ['chord', 'kunci', 'kuncigitar'],
    category: 'search',
    description: 'Cari chord/kunci gitar lagu',
    usage: '.chords <judul lagu>',
    example: '.chords komang',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

async function handler(m, { sock }) {
    const text = m.text?.trim()
    
    if (!text) {
        return m.reply(
            `🎸 *Chords sEarch*\n\n` +
            `Cari chord/kunci gitar lagu\n\n` +
            `Contoh:\n` +
            `\`${m.prefix}chords komang\`\n` +
            `\`${m.prefix}chord perjalanan terindah\``
        )
    }
    
    m.react('🕐')
    
    try {
        const { data } = await axios.get(`https://api.neoxr.eu/api/chord?q=${encodeURIComponent(text)}&apikey=${NEOXR_APIKEY}`, {
            timeout: 30000
        })
        
        if (!data?.status || !data?.data?.chord) {
            return m.reply(`❌ Chord tidak ditemukan untuk: \`${text}\``)
        }
        
        const chord = data.data.chord

        const caption = `${chord}`
        await m.reply(claraWrap("chords", caption))
        m.react('✅')
        
    } catch (err) {
        return m.reply(claraWrap("chords", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }