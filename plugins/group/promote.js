// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getParticipantJid } from '../../src/lib/rara-lid.js'
import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'promote',
    alias: ["promote"],
    category: 'group',
    description: 'Jadikan member sebagai admin',
    usage: '.promote @user',
    example: '.promote @user',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}

async function handler(m, { sock }) {
    let target = null

    if (m.quoted) {
        target = m.quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
        target = m.mentionedJid[0]
    }

    if (!target) {
        await m.reply( `❌ *target tidak ditemukan*\n\n` +
            `Reply pesan user atau mention!\n` +
            `Contoh: \`${m.prefix}promote @user\``, "promote")
        return
    }

    try {
        const groupMeta = m.groupMetadata
        const participant = groupMeta.participants.find(p => getParticipantJid(p) === target)

        if (!participant) {
            m.reply(raraWrap("Promote", `gagal\n\nUser tidak ditemukan di grup!`, "error"))
            return
        }

        if (participant.admin) {
            await m.reply(raraWrap("Promote", `gagal\n\nUser sudah menjadi admin!`, "error"))
            return
        }

        await sock.groupParticipantsUpdate(m.chat, [target], 'promote')

        await m.reply(raraWrap("Promote", `@${target.split('@')[0]} sekarang menjadi admin!`, "success"))

    } catch (error) {
        m.reply(raraWrap("promote", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }