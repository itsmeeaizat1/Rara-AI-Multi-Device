// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'

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
    try {
        const res = await f(`https://api.neoxr.eu/api/quotesimage?apikey=${NEOXR_APIKEY}`)
        
        if (!res.status || !res.data?.url) {
            return m.reply(raraWrap("quotesimage", `Gagal mengambil quotes image`))
        }
        
        await sock.sendMedia(m.chat, res.data.url, null, m, {
            type: 'image'
        })
    } catch (err) {
        return m.reply(raraWrap("quotesimage", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }