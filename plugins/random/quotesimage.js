// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

const pluginConfig = {
    name: 'quotesimage',
    alias: ["quotesimage"],
    category: 'random',
    description: 'Random quotes image',
    usage: '.quotesimage',
    example: '.quotesimage',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    m.react('🕐')
    
    try {
        const res = await f(`https://api.neoxr.eu/api/quotesimage?apikey=${NEOXR_APIKEY}`)
        
        if (!res.status || !res.data?.url) {
            return m.reply(claraWrap("quotesimage", `Gagal mengambil quotes image`))
        }
        
        await sock.sendMedia(m.chat, res.data.url, null, m, {
            type: 'image'
        })
        
        m.react('✅')
        
    } catch (err) {
        return m.reply(claraWrap("quotesimage", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }