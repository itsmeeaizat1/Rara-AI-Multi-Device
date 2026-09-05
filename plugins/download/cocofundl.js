// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { cocofun } from 'btch-downloader'
import { novaError, novaEmpty, novaGuide, novaNoInput, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'cocofundl',
    alias: ["cocofundl", "cfdl"],
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
        return m.reply(novaGuide('CocoFun', 'Mau download video CocoFun? Kasih linknya ya!', `${m.prefix}cfdl https://www.cocofun.com/share/post/xxx`))
    }
    
    if (!url.match(/cocofun\.com/i)) {
        return m.reply(novaGuide('CocoFun', 'URL-nya gak valid nih! Pakai link CocoFun ya.', `${m.prefix}cfdl https://www.cocofun.com/share/post/xxx`))
    }
    try {
        await m.react("🕒");
        const data = await cocofun(url)
        
        if (!data?.status || !data?.result) {
            return m.reply(novaError('CocoFun', 'Gagal ambil video — coba link lain ya'))
        }
        
        const result = data.result
        const videoUrl = result.no_watermark || result.watermark
        
        if (!videoUrl) {
            return m.reply(novaEmpty('CocoFun', 'Video-nya gak nemu nih'))
        }
        
        const _cap = mediaCaption({ platformIcon: "🥥", platformName: "CocoFun", title: "CocoFun Video", format: "Video", method: "btch-downloader" });
        await sock.sendMessage(m.chat, {
          video: { url: videoUrl }, caption: _cap,
          contextInfo: { forwardingScore: 0, isForwarded: false },
        }, { quoted: m });
        await m.react("🐣"); await m.react("🐣"); m.reply(novaBerhasil("Cocofundl"));
    } catch (err) {
        return m.reply(novaError('CocoFun', 'Ada error nih, coba lagi ya'))
    }
}

export { pluginConfig as config, handler }
