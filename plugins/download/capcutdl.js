// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { capcut } from 'btch-downloader'
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'capcutdl',
    alias: ["capcutdl"],
    category: 'download',
    description: 'Download video CapCut',
    usage: '.ccdl <url>',
    example: '.ccdl https://www.capcut.com/t/xxx',
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
        return m.reply(novaGuide('CapCut', 'Mau download video CapCut? Kasih linknya ya!', `${m.prefix}ccdl https://www.capcut.com/t/xxx`))
    }

    if (!url.match(/capcut\.com/i)) {
        return m.reply(novaGuide('CapCut', 'URL-nya gak valid nih! Pakai link CapCut ya.', `${m.prefix}ccdl https://www.capcut.com/t/xxx`))
    }

    await m.react('🕒')

    try {
        const data = await capcut(url)

        if (!data?.status || !data?.originalVideoUrl) {
            return m.reply(novaError('CapCut', 'Gagal ambil video — coba link lain ya'))
        }

        await sock.sendMedia(m.chat, data.originalVideoUrl, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 0,
                isForwarded: false
            }
        })

    } catch (err) {
        return m.reply(novaError('CapCut', 'Ada error nih, coba lagi ya'))
    }
}

export { pluginConfig as config, handler }
