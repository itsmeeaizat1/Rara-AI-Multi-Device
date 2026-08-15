import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "sfiledl",
    alias: ["sfiledl", "sfiledownload", "sfile"],
    category: 'download',
    description: 'Download file dari Sfile.mobi',
    usage: '.sfiledl <url>',
    example: '.sfiledl https://sfile.mobi/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()

    if (!url) {
        return sendReplyWithNav(sock, m, `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}sfiledl <url_sfile>\`\n\n` +
            `> Contoh: \`${m.prefix}sfiledl https://sfile.mobi/xxxxx\``, "sfiledl")
    }

    if (!url.includes('sfile.mobi') && !url.includes('sfile.co')) {
        { const __navText = `❌ URL harus dari sfile.mobi atau sfile.co!`; return await m.reply(__navText); }
    }

    m.react('🕐')

    try {
        const { data } = await f(`https://api.neoxr.eu/api/sfile?url=${encodeURIComponent(url)}&apikey=${config.APIkey.neoxr}`)

        if (!data.url) {
            return m.reply(claraWrap("sfiledl", `❌ Gagal mendapatkan link download. File mungkin tidak tersedia.`))
        }

        await sock.sendMedia(m.chat, data.url, null, m, {
            type: 'document',
            fileName: data.filename,
            mimetype: data.mime,
            contextInfo: {
                forwardingScore: 99,
                isForwarded: true
            }
        })

        m.react('✅')

    } catch (error) {
        m.reply(claraWrap("sfiledl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }