// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

const pluginConfig = {
    name: 'puisi',
    alias: ["puisi"],
    category: 'fun',
    description: 'Random puisi Indonesia',
    usage: '.puisi',
    example: '.puisi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        const res = await f(`https://api.neoxr.eu/api/puisi?apikey=${NEOXR_APIKEY}`)
        
        if (!res.status || !res.data?.text) {
            return m.reply(novaError("Puisi", "Gagal ambil puisi nih"))
        }
        
        const text = res.data.text
        await m.reply(claraWrap(text.split("\n").filter(l => l.trim())))
    } catch (err) {
        return m.reply(claraWrap("puisi", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }