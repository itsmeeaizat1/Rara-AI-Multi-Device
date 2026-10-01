// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'notifpromote',
    alias: ["notifpromote"],
    category: 'group',
    description: 'Toggle notifikasi saat ada yang dijadikan admin',
    usage: '.notifpromote on/off',
    example: '.notifpromote on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock, db }) {
    if (!m.isAdmin && !m.isOwner) {
        return m.reply(raraWrap("Notifpromote", `Hanya admin grup yang bisa menggunakan fitur ini`, "error"))
    }
    
    const args = m.args[0]?.toLowerCase()
    const group = db.getGroup(m.chat) || {}
    
    if (!['on', 'off'].includes(args)) {
        const status = group.notifPromote === true ? '✅ Aktif' : '❌ Nonaktif'
        return m.reply(raraWrap("Notif promote", `Notif Promote\n\nStatus: ${status}\n\nPenggunaan:\n\`${m.prefix}notifpromote on\` - Aktifkan\n\`${m.prefix}notifpromote off\` - Nonaktifkan`, "info"))
    }
    
    if (args === 'on') {
        group.notifPromote = true
        db.setGroup(m.chat, group)
        return m.reply(raraWrap("Notifpromote", `notif promote diaktifkan`, "success"))
    }
    
    if (args === 'off') {
        group.notifPromote = false
        db.setGroup(m.chat, group)
        return m.reply(raraWrap("Notifpromote", `notif promote dinonaktifkan`, "error"))
    }
}

export { pluginConfig as config, handler }