// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getParticipantJid } from '../../src/lib/nova-lid.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'promote',
    alias: ['jadiadmin', 'admin'],
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
        await sendReplyWithNav(sock, m, `❌ *Target Tidak Ditemukan*\n\n` +
            `> Reply pesan user atau mention!\n` +
            `> Contoh: \`${m.prefix}promote @user\``, "promote")
        return
    }

    try {
        const groupMeta = m.groupMetadata
        const participant = groupMeta.participants.find(p => getParticipantJid(p) === target)

        if (!participant) {
            m.reply(claraWrap("Promote", `❌ *Gagal*\n\n> User tidak ditemukan di grup!`))
            return
        }

        if (participant.admin) {
            await m.reply(claraWrap("Promote", `❌ *Gagal*\n\n> User sudah menjadi admin!`))
            return
        }

        await sock.groupParticipantsUpdate(m.chat, [target], 'promote')

        await m.reply(claraWrap("Promote", `✅ @${target.split('@')[0]} sekarang menjadi admin!`))

    } catch (error) {
        m.reply(claraWrap("promote", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }