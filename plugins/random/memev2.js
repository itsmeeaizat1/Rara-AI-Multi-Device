// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

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
            caption: '╭─「 Random Meme 」\n│ ' + data.title + '\n│ r/' + data.subreddit + ' — u/' + data.author + '\n╰──────────'
        }, { quoted: m })
    } catch (e) {
        await m.reply('╭─「 Error 」\n│ Gagal mengambil meme: ' + (e.message || e) + '\n╰──────────')
    }
}

export { pluginConfig as config, handler }
