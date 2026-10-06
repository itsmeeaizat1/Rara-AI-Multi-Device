// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getParticipantJid } from '../../src/lib/rara-lid.js'
import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'demote',
    alias: ["demote"],
    category: 'group',
    description: 'Turunkan admin menjadi member biasa',
    usage: '.demote @user',
    example: '.demote @user',
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
        await m.reply( raraWrap("demote", `❌ *target tidak ditemukan*\n\n` +
            `Reply pesan user atau mention!\n` +
            `Contoh: \`${m.prefix}demote @user\``, "guide"), "demote")
        return
    }

    try {
        const groupMeta = m.groupMetadata
        const participant = groupMeta.participants.find(p => getParticipantJid(p) === target)

        if (!participant) {
            m.reply(raraWrap("Demote", `gagal\n\nUser tidak ditemukan di grup!`, "error"))
            return
        }

        if (!participant.admin) {
            await m.reply(raraWrap("Demote", `gagal\n\nUser bukan admin!`, "error"))
            return
        }

        if (participant.admin === 'superadmin') {
            await m.reply(raraWrap("demote", `gagal\n\nTidak bisa demote owner grup!`, "error"))
            return
        }

        await sock.groupParticipantsUpdate(m.chat, [target], 'demote')

        await m.reply(raraWrap("Demote", `@${target.split('@')[0]} sekarang bukan admin lagi.`, "info"))

    } catch (error) {
        m.reply(raraWrap("demote", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }