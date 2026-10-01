// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'notifdemote',
    alias: ["notifdemote"],
    category: 'group',
    description: 'Toggle notifikasi saat ada yang dicopot dari admin',
    usage: '.notifdemote on/off',
    example: '.notifdemote on',
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
        return m.reply(novaWrap("Notifdemote", `Hanya admin grup yang bisa menggunakan fitur ini`, "error"))
    }
    
    const args = m.args[0]?.toLowerCase()
    const group = db.getGroup(m.chat) || {}
    
    if (!['on', 'off'].includes(args)) {
        const status = group.notifDemote === true ? '✅ Aktif' : '❌ Nonaktif'
        return m.reply(novaWrap("Notif demote", `Notif Demote\n\nStatus: ${status}\n\nPenggunaan:\n\`${m.prefix}notifdemote on\` - Aktifkan\n\`${m.prefix}notifdemote off\` - Nonaktifkan`, "info"))
    }
    
    if (args === 'on') {
        group.notifDemote = true
        db.setGroup(m.chat, group)
        return m.reply(novaWrap("Notifdemote", `notif demote diaktifkan`, "success"))
    }
    
    if (args === 'off') {
        group.notifDemote = false
        db.setGroup(m.chat, group)
        return m.reply(novaWrap("Notifdemote", `notif demote dinonaktifkan`, "error"))
    }
}

export { pluginConfig as config, handler }