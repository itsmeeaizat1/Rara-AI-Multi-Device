// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: "memev2",
    alias: ["memev2"],
    category: 'random',
    description: 'Random meme dari Reddit (meme-api.com)',
    usage: '.memev2',
    example: '.memev2',
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
        const { data } = await axios.get('https://meme-api.com/gimme')
        
        await sock.sendMessage(m.chat, {
            image: { url: data.url },
            caption: data.title + '\nr/' + data.subreddit + ' — u/' + data.author
        }, { quoted: m })
    } catch (e) {
        await m.reply('Gagal mengambil meme: ' + (e.message || e))
    }
}

export { pluginConfig as config, handler }
