// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'igstalk',
    alias: ["igstalk", 'instagramstalk', 'stalking'],
    category: 'stalker',
    description: 'Stalk akun Instagram',
    usage: '.igstalk <username>',
    example: '.igstalk cristiano',
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
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace('.0', '') + ' miliar'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + ' jt'
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + ' rb'
    return num.toString()
}

async function handler(m, { sock }) {
    const username = m.args[0]?.replace('@', '')
    
    if (!username) {
        return m.reply(
            `📸 *ɪɴꜱᴛᴀɢʀᴀᴍ ꜱᴛᴀʟᴋ*\n\n` +
            `Masukkan username Instagram\n\n` +
            `\`Contoh: ${m.prefix}igstalk cristiano\``
        )
    }
    
    m.react('🕐')
    
    try {
        const res = await axios.get(
            `https://firefly.maiku.my.id/api/stalk-instagram?apikey=${config.APIkey.firefly}&username=${encodeURIComponent(username)}`,
            { timeout: 30000 }
        )
        
        const d = res.data?.data
        if (!res.data?.status || !d?.username) {
            return m.reply(claraWrap("igstalk", `❌ Akun *@${username}* tidak ditemukan`))
        }
        
        const caption = `📸 *ɪɴꜱᴛᴀɢʀᴀᴍ ꜱᴛᴀʟᴋ*\n\n` +
            `👤 *ᴜꜱᴇʀɴᴀᴍᴇ:* ${d.username}\n` +
            `📛 *ɴᴀᴍᴀ:* ${d.full_name || '-'}\n` +
            `✅ *ᴠᴇʀɪꜰɪᴇᴅ:* ${d.is_verified ? 'Ya' : 'Tidak'}\n` +
            `🔒 *ᴘʀɪᴠᴀᴛᴇ:* ${d.is_private ? 'Ya' : 'Tidak'}\n\n` +
            `👥 *ᴘᴇɴɢɪᴋᴜᴛ:* ${shortNum(d.stats?.followers)}\n` +
            `👤 *ᴍᴇɴɢɪᴋᴜᴛɪ:* ${shortNum(d.stats?.following)}\n` +
            `📷 *ᴘᴏꜱᴛɪɴɢᴀɴ:* ${shortNum(d.stats?.posts)}\n\n` +
            `📝 *ʙɪᴏ:*\n${d.bio || '-'}\n\n` +
            `🔗 https://instagram.com/${d.username}`
        
        m.react('✅')
        
        const profilePic = d.profile_pic
        if (profilePic) {
            await sock.sendMessage(m.chat, {
                image: { url: profilePic },
                caption
            }, { quoted: m })
        } else {
            await m.reply(caption)
        }
        
    } catch (error) {
        m.reply(claraWrap("igstalk", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }