// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { f } from '../../src/lib/rara-http.js'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap, raraLine, raraCaption } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'anime-gen',
    alias: ["anime-gen", "anime"],
    category: 'ai image',
    description: 'Generate AI anime art dari prompt',
    usage: '.anime-gen <prompt>',
    example: '.anime-gen girl, vibrant color, smilling',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const prompt = m.text
    
    if (!prompt) {
        return m.reply(raraCaption({
  emoji: "🎨",
  name: "anime-gen",
  description: "Generate AI anime art dari prompt",
  usage: `${m.prefix}anime-gen <prompt>`,
  example: `${m.prefix}anime-gen girl, vibrant color, smilling`,
}), "anime-gen");
    }
    try {
    await m.react("🕒");
        const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'
        const apiUrl = `https://api.neoxr.eu/api/ai-anime?q=${encodeURIComponent(prompt)}&apikey=${NEOXR_APIKEY}`
        
        const data = await f(apiUrl)
        
        if (!data?.status || !data?.data?.url) {
            return m.reply('Gagal generate gambar nih, coba lagi ya!')
        }
        
        const result = data.data  
        await sock.sendMedia(m.chat, result.url, null, m, {
            type: 'image'
        })
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            await m.react("🐣");
            m.reply(raraWrap("Anime-gen", '⏱️ *Timeout*\n\nRequest terlalu lama. Coba lagi!'))
        } else {
            m.reply(raraWrap("anime-gen", te(m.prefix, m.command, m.pushName), "error"))
        }
    }
}

export { pluginConfig as config, handler }