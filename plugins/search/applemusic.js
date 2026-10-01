// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "applemusic",
    alias: ["applemusic"],
    category: 'search',
    description: 'Cari lagu di Apple Music',
    usage: '.applemusic <query>',
    example: '.applemusic Best Friend',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const query = m.text?.trim()
    
    if (!query) {
        return m.reply( `⚠️ *cara pakai*\n\n` +
            `\`${m.prefix}applemusic <query>\`\n\n` +
            `Contoh:\n` +
            `\`${m.prefix}applemusic Best Friend\``, "applemusic")
    }
    
    try {
        const res = await axios.get(`https://api.nexray.web.id/search/applemusic?q=${encodeURIComponent(query)}`)
        
        if (!res.data?.result?.length) {
            return m.reply(novaError("AppleMusic", `Gak nemu hasil untuk: ${query} nih`));
        }
        
        const tracks = res.data.result.slice(0, 5)
        
        let txt = `🍎 *apple music search*\n\n`
        txt += `Query: *${query}*\n\n`                                                                                    
        
        tracks.forEach((t, i) => {
            txt += `*${i + 1}.* \`\`\`${t.title}\`\`\`\n`
            txt += `   ├ 📀 \`${t.subtitle || 'Unknown'}\`\n`
            txt += `   └ 🔗 \`${t.link}\`\n\n`
        })
        
        return m.reply(txt.trim())
        
    } catch (err) {
        return m.reply(claraWrap("applemusic", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }