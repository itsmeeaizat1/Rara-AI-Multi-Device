// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: "cecanindo",
    alias: ["cecanindo"],
    category: 'cecan',
    description: 'Random gambar cewek cantik Indonesia',
    usage: '.cecanindo',
    example: '.cecanindo',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const api = 'https://api.nexray.web.id/random/cecan/indonesia'
    try {
        await sock.sendMedia(m.chat, api, null, m, {
            type: 'image'
        })
    } catch (e) {
        m.reply(raraWrap("cecanindo", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }