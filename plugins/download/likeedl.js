// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import likee from '../../src/scraper/likee.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'likeedl',
    alias: ["likeedl"],
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
            novaNoInput("Likee DL", "Kirim URL video Likee yang mau didownload!", `${m.prefix}lkdl https://likee.video/@xxx`)
        )
    }
    
    if (!url.match(/likee\.(video|com)/i)) {
        return m.reply(novaGuide("Likee DL", "URL-nya gak valid nih! Pastikan link dari Likee.", `${m.prefix}lkdl https://likee.video/@xxx`))
    }
    
    await m.react('🕐')
    
    try {
        const data = await likee(url)
        
        if (!data) {
            return m.reply(novaEmpty("Likee DL", "Gagal mengambil video. Coba link lain ya!"))
        }
        
        const videoUrl = data.without_watermark || data.with_watermark
        
        if (!videoUrl) {
            return await m.reply(novaEmpty("Likee DL", "Video tidak ditemukan di link ini."));
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
        return m.reply(novaError("Likee DL", "Gagal memproses video Likee. Coba lagi nanti!"))
    }
}

export { pluginConfig as config, handler }