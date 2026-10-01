// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'

const pluginConfig = {
    name: 'fuckmylife',
    alias: ["fuckmylife"],
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
    try {
    await m.react("🕒");
        const data = await f(`https://api.neoxr.eu/api/fml?apikey=${NEOXR_APIKEY}`)
        
        if (!data?.status || !data?.data?.text) {
            return m.reply(raraError("FML", "Gagal ambil FML story nih"))
        }    
        await m.react("🐣");
        await m.reply(data.data.text)
    } catch (err) {
    await m.react("❌");
        return m.reply(raraWrap("fuckmylife", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }