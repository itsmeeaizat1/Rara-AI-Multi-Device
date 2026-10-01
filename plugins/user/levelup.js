// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from '../../src/lib/rara-database.js'
const pluginConfig = {
    name: 'levelup',
    alias: ["levelup"],
    category: 'user',
    description: 'Toggle notifikasi level up',
    usage: '.levelup <on/off>',
    example: '.levelup on',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    const args = m.args || []
    const sub = args[0]?.toLowerCase()
    
    if (!user.settings) user.settings = {}
    
    if (sub === 'on') {
        user.settings.levelupNotif = true
        db.save()
        return m.reply(raraWrap("Level Up Notif", 
            `Status: *ON* ✅\n` +
            `Kamu akan menerima notifikasi saat naik level!`))
    }
    
    if (sub === 'off') {
        user.settings.levelupNotif = false
        db.save()
        return m.reply(raraWrap("Level Up Notif", 
            `Status: *off* ❌\n` +
            `Notifikasi level up dinonaktifkan.`))
    }
    
    const status = user.settings.levelupNotif !== false ? 'ON ✅' : 'OFF ❌'
    return m.reply(raraWrap("Level Up Notif", 
        `Status saat ini: *${status}*\n\n` +
        "" +
        `> \`.levelup on\` - Aktifkan\n` +
        `> \`.levelup off\` - Nonaktifkan\n` +
        `---`))
}

export { pluginConfig as config, handler }