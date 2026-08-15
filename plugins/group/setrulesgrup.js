import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'setrulesgrup',
    alias: ['setgrouprules', 'setaturangrup'],
    category: 'group',
    description: 'Set rules/aturan grup custom (admin only)',
    usage: '.setrulesgrup <text>',
    example: '.setrulesgrup 1. Jangan spam\n2. Hormati sesama',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const db = getDatabase()
    const text = m.text?.trim() || (m.quoted?.body || m.quoted?.text || '')

    if (!text) {
        return sendReplyWithNav(sock, m, claraWrap("sᴇᴛ ɢʀᴜᴘ ʀᴜʟᴇs", `📝 *sᴇᴛ ɢʀᴜᴘ ʀᴜʟᴇs*\n\n` +
            `> Masukkan teks rules yang baru\n\n` +
            `\`Contoh:\`\n` +
            `\`${m.prefix}setrulesgrup 1. Jangan spam
2. Hormati sesama\``), "setrulesgrup")
    }

    db.setGroup(m.chat, { groupRules: text })

    m.reply(claraWrap("ɢʀᴜᴘ ʀᴜʟᴇs ᴅɪᴜᴘᴅᴀᴛᴇ", `✅ *ɢʀᴜᴘ ʀᴜʟᴇs ᴅɪᴜᴘᴅᴀᴛᴇ*\n\n` +
        `Rules grup berhasil diubah!\n` +
        `Ketik \`${m.prefix}rulesgrup\` untuk melihat.`))
}

export { pluginConfig as config, handler }