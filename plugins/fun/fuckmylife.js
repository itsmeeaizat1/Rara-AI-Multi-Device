// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

const pluginConfig = {
    name: 'fuckmylife',
    alias: ['fml'],
    category: 'fun',
    description: 'Random FML story',
    usage: '.fuckmylife',
    example: '.fuckmylife',
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
        const data = await f(`https://api.neoxr.eu/api/fml?apikey=${NEOXR_APIKEY}`)
        
        if (!data?.status || !data?.data?.text) {
            return m.reply(claraWrap("fuckmylife", `❌ Gagal mengambil FML story`))
        }    
        await m.reply(data.data.text)
        m.react('✅')
        
    } catch (err) {
        return m.reply(claraWrap("fuckmylife", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }