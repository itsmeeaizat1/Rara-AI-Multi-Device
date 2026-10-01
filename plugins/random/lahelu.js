// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: "lahelu",
    alias: ["lahelu"],
    category: 'random',
    description: 'Random gambar lahelu',
    usage: '.lahelu',
    example: '.lahelu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const api = 'https://api.cuki.biz.id/api/random/lahelu?apikey=${config.APIkey.cuki}'
    try {
        const res = (await axios.get(api)).data
        const random = res.data[Math.floor(Math.random() * res.data.length)]
        if(random.media.includes('.mp4')) {
            await sock.sendMedia(m.chat, random.media, random.title, m, {
                type: 'video'
            })
        } else {
            await sock.sendMedia(m.chat, random.media, random.title, m, {
                type: 'image'
            })
        }
    } catch (e) {
        m.reply(raraWrap("lahelu", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }