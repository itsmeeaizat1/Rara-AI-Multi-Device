// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'ytstalk',
    alias: ["ytstalk"],
    category: 'stalker',
    description: 'Stalk channel YouTube',
    usage: '.ytstalk <username>',
    example: '.ytstalk mrbeast',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const username = m.args[0]
    
    if (!username) {
        { const __navText = `📺 *youtube stalk*\n\nMasukkan username YouTube\n\n\`Contoh: ${m.prefix}ytstalk mrbeast\``; return await m.reply( __navText, "ytstalk"); }
    }
    try {
        const res = await axios.get(`https://firefly.maiku.my.id/api/stalk-youtube?apikey=${config.APIkey.firefly}&username=${encodeURIComponent(username)}`, {
            timeout: 30000
        })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(raraWrap("ytstalk", `❌ Channel *${username}* tidak ditemukan`))
        }
        
        const c = res.data.data
        
        let caption = `📺 *youtube stalk*\n\n` +
            `👤 *nama:* ${c.name}\n` +
            `🔗 *username:* @${username}\n` +
            `✅ *verified:* ${c.verified ? 'Ya' : 'Tidak'}\n\n` +
            `👥 *subscribers:* ${c.subscribers}\n` +
            `🎬 *total video:* ${c.video_count}\n\n` +
            `📝 *deskripsi:*\n${c.about || '-'}\n\n` +
            `🔗 ${c.url}`
        await sock.sendMessage(m.chat, {
            image: { url: c.thumbnail },
            caption
        }, { quoted: m })
        
    } catch (error) {
        m.reply(raraWrap("ytstalk", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }