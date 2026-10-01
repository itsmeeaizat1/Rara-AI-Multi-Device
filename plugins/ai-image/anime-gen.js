// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { f } from '../../src/lib/nova-http.js'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { novaError, novaEmpty, novaGuide, novaNoInput,  novaWrap, novaLine, novaCaption } from "../../src/lib/nova-menu-style.js";
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
        return m.reply(novaCaption({
  emoji: "🎨",
  name: "anime-gen",
  description: "Generate AI anime art dari prompt",
  usage: `${m.prefix}anime-gen <prompt>`,
  example: `${m.prefix}anime-gen girl, vibrant color, smilling`,
}), "anime-gen");
    }
    try {
    await m.react("🕒");
        const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'
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
            m.reply(novaWrap("Anime-gen", '⏱️ *Timeout*\n\nRequest terlalu lama. Coba lagi!'))
        } else {
            m.reply(novaWrap("anime-gen", te(m.prefix, m.command, m.pushName), "error"))
        }
    }
}

export { pluginConfig as config, handler }