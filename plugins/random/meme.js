// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/rara-http.js'
import te from '../../src/lib/rara-error.js'
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'

const pluginConfig = {
    name: "meme",
    alias: ["meme"],
    category: 'random',
    description: 'Random meme Indonesia',
    usage: '.meme',
    example: '.meme',
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
        const { data } = await f(`https://api.neoxr.eu/api/meme?apikey=${NEOXR_APIKEY}`)
        await sock.sendMedia(m.chat, data.url, data.title, m, {
            type: 'image'
        })
    } catch (err) {
        return m.reply(raraWrap("meme", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }