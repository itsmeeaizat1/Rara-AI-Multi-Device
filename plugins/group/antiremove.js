import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "antiremove",
    alias: ["antiremove", "ar2", "antidelete"],
    category: 'group',
    description: 'Mengaktifkan/menonaktifkan anti hapus pesan di grup',
    usage: '.antiremove <on/off>',
    example: '.antiremove on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: false
}

async function handler(m, { sock, db }) {
    const action = (m.args || [])[0]?.toLowerCase()
    const group = db.getGroup(m.chat) || {}

    if (!action) {
        const status = group.antiremove || 'off'
        await sendReplyWithNav(sock, m, `🗑️ *AntiRemove*\n\n` +
            `> Status: *${status === 'on' ? '✅ Aktif' : '❌ Nonaktif'}*\n\n` +
            `> \`.antiremove on/off\``, "antiremove")
        return
    }

    if (action === 'on') {
        db.setGroup(m.chat, { ...group, antiremove: 'on' })
        m.react('✅')
        { const __navText = `✅ *AntiRemove diaktifkan*\n> Pesan yang dihapus akan di-forward ulang.`; await m.reply(__navText); }
        return
    }

    if (action === 'off') {
        db.setGroup(m.chat, { ...group, antiremove: 'off' })
        await m.reply(claraWrap("Antiremove", `❌ *AntiRemove dinonaktifkan*`))
        return
    }

    await m.reply(`❌ Gunakan \`.antiremove on\` atau \`.antiremove off\``)
}

export { pluginConfig as config, handler }