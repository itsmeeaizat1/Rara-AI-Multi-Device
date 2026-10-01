// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'cecankorea',
    alias: ["cecankorea"],
    category: 'cecan',
    description: 'Random gambar cewek cantik Korea',
    usage: '.cecankorea',
    example: '.cecankorea',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const api = 'https://api.nexray.web.id/random/cecan/korea'
    try {
        await sock.sendMedia(m.chat, api, null, m, {
            type: 'image'
        })
    } catch (e) {
        m.reply(raraWrap("cecankorea", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }