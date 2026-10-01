// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: ['autodl', 'autodownload'],
    alias: ["autodl", "autodownload"],
    category: 'group',
    description: 'Toggle auto download link sosmed',
    usage: '.autodl on/off',
    example: '.autodl on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args[0]?.toLowerCase()
    
    const groupData = db.getGroup(m.chat)
    const current = groupData?.autodl || false
    
    if (!args || args === 'status') {
        return m.reply( `🔗 *auto download*\n\n` +
            `Status: ${current ? '✅ Aktif' : '❌ Nonaktif'}\n\n` +
            `*platform support:*\n` +
            `TikTok, Instagram, Facebook\n` +
            `YouTube, Twitter/X\n` +
            `Telegram, Discord\n\n` +
            `*penggunaan:*\n` +
            `\`${m.prefix}autodl on\` - Aktifkan\n` +
            `\`${m.prefix}autodl off\` - Nonaktifkan`, "autodl")
    }
    
    if (args === 'on') {
        db.setGroup(m.chat, { ...groupData, autodl: true })
        return m.reply(raraWrap("autodl", `✅ *auto download aktif*\n\n` +
            `Kirim link sosmed dan bot akan auto download!\n` +
            `Support: TikTok, IG, FB, YouTube, Twitter/X`))
    }
    
    if (args === 'off') {
        db.setGroup(m.chat, { ...groupData, autodl: false })
        return m.reply(raraWrap("Autodl", `auto download nonaktif`, "error"))
    }
    
    return m.reply(raraWrap("Auto dl", `Argumen Tidak Valid\n\nGunakan: \`on\` atau \`off\``, "error"))
}

export { pluginConfig as config, handler }