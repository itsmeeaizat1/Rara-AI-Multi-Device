// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'tiktokstalk',
    alias: ["tiktokstalk"],
    category: 'stalker',
    description: 'Stalk akun TikTok',
    usage: '.tiktokstalk <username>',
    example: '.tiktokstalk mrbeast',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

function shortNum(num) {
    if (!num) return '0'
    num = parseInt(num)
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace('.0', '') + 'B'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + 'K'
    return num.toString()
}

async function handler(m, { sock }) {
    const username = m.args[0]?.replace('@', '')
    
    if (!username) {
        { const __navText = `🎵 *tiktok stalk*\n\nMasukkan username TikTok\n\n\`Contoh: ${m.prefix}tiktokstalk mrbeast\``; return await m.reply( __navText, "tiktokstalk"); }
    }
    try {
        const res = await axios.get(`https://firefly.maiku.my.id/api/stalk-tiktok?apikey=${config.APIkey.firefly}&username=${encodeURIComponent(username)}`, {
            timeout: 30000
        })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(raraWrap("tiktokstalk", `❌ Username *@${username}* tidak ditemukan`))
        }
        
        const d = res.data.data
        const s = d.stats
        
        const caption = `🎵 *tiktok stalk*\n\n` +
            `👤 *username:* @${d.username}\n` +
            `📛 *nama:* ${d.nickname}\n` +
            `✅ *verified:* ${d.verified ? 'Ya' : 'Tidak'}\n` +
            `🔒 *private:* ${d.private ? 'Ya' : 'Tidak'}\n\n` +
            `👥 *followers:* ${shortNum(s.followers)}\n` +
            `👤 *following:* ${shortNum(s.following)}\n` +
            `❤️ *likes:* ${shortNum(s.hearts)}\n` +
            `🎬 *videos:* ${shortNum(s.videos)}\n\n` +
            `📝 *bio:*\n${d.signature || '-'}\n\n` +
            `🔗 https://tiktok.com/@${d.username}`
        await sock.sendMessage(m.chat, {
            image: { url: d.avatar },
            caption
        }, { quoted: m })
        
    } catch (error) {
        m.reply(raraWrap("tiktokstalk", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }