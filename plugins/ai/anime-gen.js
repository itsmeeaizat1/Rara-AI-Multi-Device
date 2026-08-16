// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { f } from '../../src/lib/nova-http.js'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'anime-gen',
    alias: ['animegen', 'aianimegen', 'genai-anime'],
    category: 'ai',
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
        return sendReplyWithNav(sock, m, `🎨 *Anime Art Generator*\n\n` +
            `> Generate gambar anime AI dari prompt!\n\n` +
            `*Cara Pakai:*\n` +
            `> \`${m.prefix}anime-gen <deskripsi>\`\n\n` +
            `*Contoh:*\n` +
            `> \`${m.prefix}anime-gen girl, vibrant color, smilling, yellow pink gradient hair\`\n` +
            `> \`${m.prefix}anime-gen boy, dark aesthetic, silver hair, red eyes\`\n\n` +
            `*Tips:*\n` +
            `> • Gunakan bahasa Inggris\n` +
            `> • Makin detail prompt, makin bagus hasil\n` +
            `> • Tambahkan style: vibrant, dark, pastel, etc`, "anime-gen")
    }
    
    m.react('🕐')

    try {
        const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'
        const apiUrl = `https://api.neoxr.eu/api/ai-anime?q=${encodeURIComponent(prompt)}&apikey=${NEOXR_APIKEY}`
        
        const data = await f(apiUrl)
        
        if (!data?.status || !data?.data?.url) {
            return m.reply('❌ *Gagal*\n\n> Gagal generate gambar. Coba lagi nanti!')
        }
        
        const result = data.data  
        await sock.sendMedia(m.chat, result.url, null, m, {
            type: 'image'
        })
        m.react('✅')
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            m.reply(claraWrap("Anime-gen", '⏱️ *Timeout*\n\n> Request terlalu lama. Coba lagi!'))
        } else {
            m.reply(claraWrap("anime-gen", te(m.prefix, m.command, m.pushName), "error"))
        }
    }
}

export { pluginConfig as config, handler }