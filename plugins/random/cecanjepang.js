// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'cecanjepang',
    alias: ['cewekjepang', 'cewekjpn'],
    category: 'cecan',
    description: 'Random gambar cewek cantik Jepang',
    usage: '.cecanjepang',
    example: '.cecanjepang',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const api = 'https://api.nexray.web.id/random/cecan/japan'
    try {
        await sock.sendMedia(m.chat, api, null, m, {
            type: 'image'
        })
        await m.react('✅')
    } catch (e) {
        m.reply(claraWrap("cecanjepang", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }