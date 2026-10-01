// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'

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
    await m.react("🕒");
        const res = await f(`https://api.neoxr.eu/api/puisi?apikey=${NEOXR_APIKEY}`)
        
        if (!res.status || !res.data?.text) {
            return m.reply(raraError("Puisi", "Gagal ambil puisi nih"))
        }
        
        const text = res.data.text
        await m.react("🐣");
        await m.reply(raraWrap("Puisi", text.split("\n")))
    } catch (err) {
    await m.react("❌");
        return m.reply(raraWrap("puisi", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }