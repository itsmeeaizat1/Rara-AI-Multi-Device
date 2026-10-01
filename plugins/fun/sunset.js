// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'

const pluginConfig = {
    name: 'senja',
    alias: ["senja"],
    category: 'fun',
    description: 'Random kata-kata senja/romantis',
    usage: '.senja',
    example: '.senja',
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
        const res = await f(`https://api.neoxr.eu/api/senja?apikey=${NEOXR_APIKEY}`)
        
        if (!res.status || !res.data?.text) {
            return m.reply(raraError("Senja", "Gagal ambil kata senja nih"))
        }
        await m.react("🐣");
        await m.reply(res.data.text)
    } catch (err) {
    await m.react("❌");
        return m.reply(raraWrap("senja", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }