import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-NovaMD'

const pluginConfig = {
    name: "videy",
    alias: ["videy", "videydl", "videydownload"],
    category: 'download',
    description: 'Download video dari videy.co',
    usage: '.videy <url>',
    example: '.videy https://videy.co/v?id=7ZH1ZRIF',
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
        return sendReplyWithNav(sock, m, `🎬 *ᴠɪᴅᴇʏ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
            `> Masukkan URL videy.co\n\n` +
            `\`Contoh: ${m.prefix}videy https://videy.co/v?id=7ZH1ZRIF\``, "videy")
    }
    
    if (!url.match(/videy\.co/i)) {
        return m.reply(claraWrap("Videy", `❌ URL tidak valid. Gunakan link dari videy.co`))
    }
    
    m.react('🕐')
    
    try {
        const data = await f(`https://api.neoxr.eu/api/videy?url=${encodeURIComponent(url)}&apikey=${NEOXR_APIKEY}`)
        
        if (!data?.status || !data?.data?.url) {
            return m.reply(claraWrap("videy", `❌ Gagal mengambil video. Link tidak valid atau sudah expired.`))
        }
        
        const videoUrl = data.data.url
        
        await sock.sendMedia(m.chat, videoUrl, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 99,
                isForwarded: true
            }
        })
        
        m.react('✅')
        
    } catch (error) {
        m.reply(claraWrap("videy", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }