// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'banchat',
    alias: ["banchat"],
    category: 'group',
    description: 'Ban grup dari penggunaan bot (hanya owner yang bisa akses)',
    usage: '.banchat',
    example: '.banchat',
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const cmd = m.command.toLowerCase()
    const isUnban = ['unbanchat', 'unbangroup'].includes(cmd)
    
    try {
        const groupMeta = m.groupMetadata
        const groupName = groupMeta.subject || 'Unknown'
        const groupData = db.getGroup(m.chat) || {}
        
        if (isUnban) {
            if (!groupData.isBanned) {
                return m.reply(raraWrap("banchat", `⚠️ *grup tidak diban*\n\n` +
                    `Grup ini tidak dalam status banned.\n` +
                    `Semua user bisa menggunakan bot.`))            }
            
            db.setGroup(m.chat, { ...groupData, isBanned: false })
            
            return sock.sendMessage(m.chat, {
                text: `✅ *grup di-unban*\n\n` +
                    `📛 Grup: *${groupName}*\n` +
                    `📊 sTatus: *✅ AKTIF*\n` +
                    `👤 Unban Oleh: @${m.sender.split('@')[0]}\n` +
                    `\n` +
                    `Semua member sekarang bisa menggunakan bot kembali.`,
                mentions: [m.sender]
            }, { quoted: m })
        }
        
        if (groupData.isBanned) {
            return m.reply(raraWrap("Banchat", `Grup ini sudah dalam status banned.\nGunakan .unbanchat untuk membuka akses.`, "warn"))       }
        
        db.setGroup(m.chat, { ...groupData, isBanned: true })
        
        await m.reply(raraWrap("banchat", `🚫 *grup diban*\n\n` +
                `📛 Grup: *${groupName}*\n` +
                `• Status: *BANNED*\n` +
                `👤 Ban Oleh: @${m.sender.split('@')[0]}\n` +
                `\n` +
                `Member biasa tidak bisa menggunakan bot di grup ini.\n` +
                `Hanya owner yang bisa menggunakan bot.`))
        
    } catch (error) {
        m.reply(raraWrap("banchat", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }