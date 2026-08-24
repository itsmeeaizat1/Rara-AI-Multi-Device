// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { capcut } from 'btch-downloader'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'capcutdl',
    alias: ['ccdl', 'capcut', 'cc'],
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
        return m.reply( `⚠️ *Cara Pakai*\n\n` +
            `\`${m.prefix}ccdl <url>\`\n\n` +
            `Contoh:\n` +
            `\`${m.prefix}ccdl https://www.capcut.com/t/xxx\``, "capcutdl")
    }

    if (!url.match(/capcut\.com/i)) {
        return m.reply(claraWrap("Capcutdl", `❌ URL tidak valid. Gunakan link CapCut.`))
    }

    await m.react('🕐')

    try {
        const data = await capcut(url)

        if (!data?.status || !data?.originalVideoUrl) {
            { const __navText = `❌ Gagal mengambil video. Coba link lain.`; return await m.reply(__navText); }
        }

        await sock.sendMedia(m.chat, data.originalVideoUrl, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 0,
                isForwarded: false
            }
        })

    } catch (err) {
        return m.reply(claraWrap("capcutdl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }