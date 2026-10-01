// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: "barandom",
    alias: ["barandom"],
    category: 'random',
    description: 'Random gambar Blue Archive',
    usage: '.barandom',
    example: '.barandom',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const api = 'https://api.nexray.web.id/random/ba'
    try {
        await sock.sendMedia(m.chat, api, null, m, {
            type: 'image'
        })
    } catch (e) {
        m.reply(raraWrap("barandom", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }