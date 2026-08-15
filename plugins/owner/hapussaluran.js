import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: ['hapussaluran', 'deletesaluran', 'deletenewsletter'],
    alias: [],
    category: 'owner',
    description: 'Hapus saluran/newsletter',
    usage: '.hapussaluran <id_saluran>',
    example: '.hapussaluran 120363xxx@newsletter',
    isOwner: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.trim() || ''
    let targetJid = text

    if (!targetJid) {
        return sendReplyWithNav(sock, m, '🗑️ *ʜᴀᴘᴜs sᴀʟᴜʀᴀɴ*\n\n' +
            '> `.hapussaluran <id_saluran>` — Hapus saluran\n\n' +
            '📝 Contoh:\n' +
            '> `.hapussaluran 120363xxx@newsletter`\n\n' +
            '⚠️ Saluran akan dihapus secara permanen', "hapussaluran")
    }

    if (!targetJid.endsWith('@newsletter')) {
        targetJid += '@newsletter'
    }

    try {
        await sock.newsletterDelete(targetJid)
        await m.react('✅')
        return m.reply(claraWrap("Hapussaluran", `🗑️ *Saluran dihapus*\n\n> ID: ${targetJid}`))
    } catch (err) {
        return m.reply(claraWrap("hapussaluran", `❌ Gagal menghapus saluran: ${err.message}`))
    }
}

export { pluginConfig as config, handler }
