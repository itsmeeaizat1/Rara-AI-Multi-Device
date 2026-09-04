// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'notifopengroup',
    alias: ["notifopengroup"],
    category: 'group',
    description: 'Toggle notifikasi saat grup dibuka',
    usage: '.notifopengroup on/off',
    example: '.notifopengroup on',
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
        return m.reply(claraWrap("Notifopengroup", `Hanya admin grup yang bisa menggunakan fitur ini`, "error"))
    }
    
    const args = m.args[0]?.toLowerCase()
    const group = db.getGroup(m.chat) || {}
    
    if (!['on', 'off'].includes(args)) {
        const status = group.notifOpenGroup === true ? '✅ Aktif' : '❌ Nonaktif'
        return m.reply(claraWrap("Notif opengroup", `Notif Open Group\n\nStatus: ${status}\n\nPenggunaan:\n\`${m.prefix}notifopengroup on\` - Aktifkan\n\`${m.prefix}notifopengroup off\` - Nonaktifkan`, "info"))
    }
    
    if (args === 'on') {
        group.notifOpenGroup = true
        db.setGroup(m.chat, group)
        return m.reply(claraWrap("Notifopengroup", `notif open group diaktifkan`, "success"))
    }
    
    if (args === 'off') {
        group.notifOpenGroup = false
        db.setGroup(m.chat, group)
        return m.reply(claraWrap("Notifopengroup", `notif open group dinonaktifkan`, "error"))
    }
}

export { pluginConfig as config, handler }