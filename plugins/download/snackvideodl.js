// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { snackvideo } from 'btch-downloader'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput, mediaCaption } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "snackvideodl",
    alias: ["snackvideodl", "svdl"],
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
        return m.reply(novaNoInput("SnackVideo", "Kirim URL SnackVideo yang mau didownload!", `${m.prefix}svdl https://www.snackvideo.com/@xxx/video/xxx`))
    }
    
    if (!url.match(/snackvideo\.com/i)) {
        return m.reply(novaGuide("SnackVideo", "URL-nya gak valid nih! Pastikan dari SnackVideo ya.", `${m.prefix}svdl https://www.snackvideo.com/@xxx/video/xxx`))
    }
    try {
        await m.react("🕒")
        const data = await snackvideo(url)
        
        if (!data?.status || !data?.result?.videoUrl) {
            return m.reply(novaEmpty("SnackVideo", "Gagal mengambil video SnackVideo. Coba link lain ya!"))
        }
        
        const result = data.result
        
        const caption = mediaCaption({
            platformIcon: "🎬", platformName: "SnackVideo",
            title: result.title || result.author || "SnackVideo",
            author: result.author || null,
            format: "Video", method: "btch-downloader",
        })
        await m.react("🐣")
        await sock.sendMessage(m.chat, {
            video: { url: result.videoUrl },
            caption,
            contextInfo: { forwardingScore: 0, isForwarded: false },
        }, { quoted: m })
        
    } catch (err) {
        return m.reply(novaError("SnackVideo", "Gagal memproses video SnackVideo. Coba lagi nanti!"))
    }
}

export { pluginConfig as config, handler }