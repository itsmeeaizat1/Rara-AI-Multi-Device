// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'notifclosegroup',
    alias: ["notifclosegroup"],
    category: 'group',
    description: 'Toggle notifikasi saat grup ditutup',
    usage: '.notifclosegroup on/off',
    example: '.notifclosegroup on',
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
        return m.reply(raraWrap("Notifclosegroup", `Hanya admin grup yang bisa menggunakan fitur ini`, "error"))
    }
    
    const args = m.args[0]?.toLowerCase()
    const group = db.getGroup(m.chat) || {}
    
    if (!['on', 'off'].includes(args)) {
        const status = group.notifCloseGroup === true ? '✅ Aktif' : '❌ Nonaktif'
        return m.reply(raraWrap("Notif closegroup", `Notif Close Group\n\nStatus: ${status}\n\nPenggunaan:\n\`${m.prefix}notifclosegroup on\` - Aktifkan\n\`${m.prefix}notifclosegroup off\` - Nonaktifkan`, "info"))
    }
    
    if (args === 'on') {
        group.notifCloseGroup = true
        db.setGroup(m.chat, group)
        return m.reply(raraWrap("Notifclosegroup", `notif close group diaktifkan`, "success"))
    }
    
    if (args === 'off') {
        group.notifCloseGroup = false
        db.setGroup(m.chat, group)
        return m.reply(raraWrap("Notifclosegroup", `notif close group dinonaktifkan`, "error"))
    }
}

export { pluginConfig as config, handler }