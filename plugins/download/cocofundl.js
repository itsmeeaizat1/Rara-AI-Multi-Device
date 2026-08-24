// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { cocofun } from 'btch-downloader'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'cocofundl',
    alias: ['cfdl', 'cocofun', 'cf'],
    category: 'download',
    description: 'Download video CocoFun',
    usage: '.cfdl <url>',
    example: '.cfdl https://www.cocofun.com/share/post/xxx',
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
        return m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `\`${m.prefix}cfdl <url>\`\n\n` +
            `Contoh:\n` +
            `\`${m.prefix}cfdl https://www.cocofun.com/share/post/xxx\``, "cocofundl")
    }
    
    if (!url.match(/cocofun\.com/i)) {
        return m.reply(claraWrap("Cocofundl", `❌ URL tidak valid. Gunakan link CocoFun.`))
    }
    
    await m.react('🕐')
    
    try {
        const data = await cocofun(url)
        
        if (!data?.status || !data?.result) {
            return m.reply(claraWrap("cocofundl", `❌ Gagal mengambil video. Coba link lain.`))
        }
        
        const result = data.result
        const videoUrl = result.no_watermark || result.watermark
        
        if (!videoUrl) {
            return m.reply(claraWrap("Cocofundl", `❌ Video tidak ditemukan.`))
        }
        
        await sock.sendMedia(m.chat, videoUrl, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 0,
                isForwarded: false
            }
        })
        
    } catch (err) {
        return m.reply(claraWrap("cocofundl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }