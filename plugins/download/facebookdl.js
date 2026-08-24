// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { fbdown } from 'btch-downloader'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "facebookdl",
    alias: ["facebookdl", "fbdl", "fbdownload"],
    category: 'download',
    description: 'Download video Facebook',
    usage: '.facebookdl <url>',
    example: '.facebookdl https://www.facebook.com/watch?v=xxx',
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
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `\`${m.prefix}facebookdl <url>\`\n\n` +
            `Contoh:\n` +
            `\`${m.prefix}fbdown https://www.facebook.com/watch?v=xxx\``
        )
    }
    
    if (!url.match(/facebook\.com|fb\.watch/i)) {
        return m.reply(claraWrap("Facebookdl", `❌ URL tidak valid. Gunakan link Facebook.`))
    }
    
    await m.react('🕐')
    
    try {
        const data = await fbdown(url)
        
        if (!data?.status) {
            return m.reply(claraWrap("facebookdl", `❌ Gagal mengambil video. Coba link lain.`))
        }
        
        const videoUrl = data.HD || data.Normal_video
        
        if (!videoUrl) {
            { const __navText = claraWrap("facebookdl", `❌ Video tidak ditemukan.`); return await m.reply(__navText); }
        }
        
        const quality = data.HD ? 'HD' : 'SD'
        
        await sock.sendMedia(m.chat, videoUrl, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 0,
                isForwarded: false
            }
        })
        
    } catch (err) {
        return m.reply(claraWrap("facebookdl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }