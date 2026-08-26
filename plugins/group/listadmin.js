// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getParticipantJid } from '../../src/lib/nova-lid.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'listadmin',
    alias: ["listadmin", 'admins', 'adminlist'],
    category: 'group',
    description: 'Menampilkan daftar admin grup',
    usage: '.listadmin',
    example: '.listadmin',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: false,
    isBotAdmin: false
}

async function handler(m, { sock }) {
    try {
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        const admins = participants.filter(p => p.admin)

        if (admins.length === 0) {
            { const __navText = `❌ *ɢᴀɢᴀʟ*\n\nTidak ada admin di grup ini.`; await m.reply(__navText); }
            return
        }

        const owner = admins.find(a => a.admin === 'superadmin')
        const regularAdmins = admins.filter(a => a.admin === 'admin')

        let lines = []
        if (owner) {
            lines.push("━━━ Owner ━━━")
            lines.push(`👑 @${getParticipantJid(owner).split('@')[0]}`)
            lines.push("")
        }
        if (regularAdmins.length > 0) {
            lines.push("━━━ Admin ━━━")
            regularAdmins.forEach((admin, i) => {
                lines.push(`${i + 1}. @${getParticipantJid(admin).split('@')[0]}`)
            })
        }
        lines.push("")
        lines.push(`Total Admin: ${admins.length}`)

        const adminList = claraWrap("List Admin", lines)
        const mentions = admins.map(a => getParticipantJid(a))

        await m.reply(adminList, { mentions })

    } catch (error) {
        m.reply(claraWrap("listadmin", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }