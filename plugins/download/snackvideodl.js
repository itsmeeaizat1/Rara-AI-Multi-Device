// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { snackvideo } from 'btch-downloader'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "snackvideodl",
    alias: ["snackvideodl", "svdl", "snackdl"],
    category: 'download',
    description: 'Download video SnackVideo',
    usage: '.svdl <url>',
    example: '.svdl https://www.snackvideo.com/@xxx/video/xxx',
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
        return sendReplyWithNav(sock, m, `⚠️ *Cara Pakai*\n\n` +
            `\`${m.prefix}svdl <url>\`\n\n` +
            `Contoh:\n` +
            `\`${m.prefix}svdl https://www.snackvideo.com/@xxx/video/xxx\``, "snackvideodl")
    }
    
    if (!url.match(/snackvideo\.com/i)) {
        return m.reply(claraWrap("Snackvideodl", `❌ URL tidak valid. Gunakan link SnackVideo.`))
    }
    
    await m.react('🕐')
    
    try {
        const data = await snackvideo(url)
        
        if (!data?.status || !data?.result?.videoUrl) {
            return m.reply(claraWrap("snackvideodl", `❌ Gagal mengambil video. Coba link lain.`))
        }
        
        const result = data.result
        
        await sock.sendMedia(m.chat, result.videoUrl, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 99,
                isForwarded: true
            }
        })
        
    } catch (err) {
        return m.reply(claraWrap("snackvideodl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }