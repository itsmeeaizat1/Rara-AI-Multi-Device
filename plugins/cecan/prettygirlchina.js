// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'cecanchina',
    alias: ["cecanchina"],
    category: 'cecan',
    description: 'Random gambar cewek cantik China',
    usage: '.cecanchina',
    example: '.cecanchina',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const api = 'https://api.nexray.web.id/random/cecan/china'
    try {
        await sock.sendMedia(m.chat, api, null, m, {
            type: 'image'
        })
    } catch (e) {
        m.reply(novaWrap("cecanchina", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }