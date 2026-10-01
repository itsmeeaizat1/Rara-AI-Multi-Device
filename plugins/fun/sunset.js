// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

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
            return m.reply(novaError("Senja", "Gagal ambil kata senja nih"))
        }
        await m.react("🐣");
        await m.reply(res.data.text)
    } catch (err) {
    await m.react("❌");
        return m.reply(novaWrap("senja", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }