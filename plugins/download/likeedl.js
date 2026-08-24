// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import likee from '../../src/scraper/likee.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'likeedl',
    alias: ['lkdl', 'likee', 'lk'],
    category: 'download',
    description: 'Download video Likee',
    usage: '.lkdl <url>',
    example: '.lkdl https://likee.video/@xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(
            `⚠️ *Cara Pakai*\n\n` +
            `\`${m.prefix}lkdl <url>\`\n\n` +
            `Contoh:\n` +
            `\`${m.prefix}lkdl https://likee.video/@xxx\``
        )
    }
    
    if (!url.match(/likee\.(video|com)/i)) {
        return m.reply(claraWrap("Likeedl", `❌ URL tidak valid. Gunakan link Likee.`))
    }
    
    await m.react('🕐')
    
    try {
        const data = await likee(url)
        
        if (!data) {
            return m.reply(claraWrap("likeedl", `❌ Gagal mengambil video. Coba link lain.`))
        }
        
        const videoUrl = data.without_watermark || data.with_watermark
        
        if (!videoUrl) {
            { const __navText = claraWrap("likeedl", `❌ Video tidak ditemukan.`); return await m.reply(__navText); }
        }
        
        await sock.sendMedia(m.chat, videoUrl, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 0,
                isForwarded: false
            }
        })
        
        await m.react('✅')
        
    } catch (err) {
        return m.reply(claraWrap("likeedl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }