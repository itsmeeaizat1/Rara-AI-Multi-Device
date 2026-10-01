// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  raraWrap } from "../../src/lib/rara-menu-style.js";
import { getParticipantJid } from '../../src/lib/rara-lid.js'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'listadmin',
    alias: ["listadmin"],
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
            await m.reply(raraWrap("listadmin", "Tidak ada admin di grup ini.", "error"));
            return
        }

        const owner = admins.find(a => a.admin === 'superadmin')
        const regularAdmins = admins.filter(a => a.admin === 'admin')

        let lines = []
        if (owner) {
            lines.push("Owner:")
            lines.push(`👑 @${getParticipantJid(owner).split('@')[0]}`)
            lines.push("")
        }
        if (regularAdmins.length > 0) {
            lines.push("Admin:")
            regularAdmins.forEach((admin, i) => {
                lines.push(`${i + 1}. @${getParticipantJid(admin).split('@')[0]}`)
            })
        }
        lines.push("")
        lines.push(`Total Admin: ${admins.length}`)

        const adminList = raraWrap("List Admin", lines)
        const mentions = admins.map(a => getParticipantJid(a))

        await m.reply(adminList, { mentions })

    } catch (error) {
        m.reply(raraWrap("listadmin", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }