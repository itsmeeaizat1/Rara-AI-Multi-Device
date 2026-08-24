// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'tiktokstalk',
    alias: ['ttstalk', 'stalktt'],
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
        { const __navText = `🎵 *ᴛɪᴋᴛᴏᴋ ꜱᴛᴀʟᴋ*\n\nMasukkan username TikTok\n\n\`Contoh: ${m.prefix}tiktokstalk mrbeast\``; return await m.reply( __navText, "tiktokstalk"); }
    }
    
    m.react('🕐')
    
    try {
        const res = await axios.get(`https://firefly.maiku.my.id/api/stalk-tiktok?apikey=${config.APIkey.firefly}&username=${encodeURIComponent(username)}`, {
            timeout: 30000
        })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(claraWrap("tiktokstalk", `❌ Username *@${username}* tidak ditemukan`))
        }
        
        const d = res.data.data
        const s = d.stats
        
        const caption = `🎵 *ᴛɪᴋᴛᴏᴋ ꜱᴛᴀʟᴋ*\n\n` +
            `👤 *ᴜꜱᴇʀɴᴀᴍᴇ:* @${d.username}\n` +
            `📛 *ɴᴀᴍᴀ:* ${d.nickname}\n` +
            `✅ *ᴠᴇʀɪꜰɪᴇᴅ:* ${d.verified ? 'Ya' : 'Tidak'}\n` +
            `🔒 *ᴘʀɪᴠᴀᴛᴇ:* ${d.private ? 'Ya' : 'Tidak'}\n\n` +
            `👥 *ꜰᴏʟʟᴏᴡᴇʀꜱ:* ${shortNum(s.followers)}\n` +
            `👤 *ꜰᴏʟʟᴏᴡɪɴɢ:* ${shortNum(s.following)}\n` +
            `❤️ *ʟɪᴋᴇꜱ:* ${shortNum(s.hearts)}\n` +
            `🎬 *ᴠɪᴅᴇᴏꜱ:* ${shortNum(s.videos)}\n\n` +
            `📝 *ʙɪᴏ:*\n${d.signature || '-'}\n\n` +
            `🔗 https://tiktok.com/@${d.username}`
        
        m.react('✅')
        
        await sock.sendMessage(m.chat, {
            image: { url: d.avatar },
            caption
        }, { quoted: m })
        
    } catch (error) {
        m.reply(claraWrap("tiktokstalk", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }