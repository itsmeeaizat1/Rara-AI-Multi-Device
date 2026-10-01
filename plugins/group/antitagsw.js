// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'antitagsw',
    alias: ["antitagsw"],
    category: 'group',
    description: 'Mengaktifkan/menonaktifkan anti tag status di grup',
    usage: '.antitagsw <on/off>',
    example: '.antitagsw on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}

async function handler(m, { sock, db }) {
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    const groupId = m.chat
    const group = db.getGroup(groupId) || {}

    if (!action) {
        const status = group.antitagsw || 'off'

        await m.reply( raraWrap("AntitagSW Settings", [`Status: *${status === 'on' ? '✅ Aktif' : '❌ Nonaktif'}*`, "", `Fitur ini menghapus pesan tag status`, `(groupStatusMentionMessage)`, "", `Pilihan:`, `\`${m.prefix}antitagsw on\` → Aktifkan`, `\`${m.prefix}antitagsw off\` → Nonaktifkan`].join("\n")), "antitagsw")
        return
    }

    if (action === 'on') {
        db.setGroup(groupId, { ...group, antitagsw: 'on' })
        await m.reply(raraWrap("AntitagSW Aktif", ["Anti tag status berhasil diaktifkan!", "Pesan tag status akan dihapus otomatis."].join("\n")))
        return
    }

    if (action === 'off') {
        db.setGroup(groupId, { ...group, antitagsw: 'off' })
        await m.reply(raraWrap("AntitagSW Nonaktif", "Anti tag status berhasil dinonaktifkan."))
        return
    }

    await m.reply(raraWrap("Pilihan Tidak Valid", "Gunakan: on atau off"))
}

export { pluginConfig as config, handler }