// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { findParticipantByNumber } from '../../src/lib/nova-lid.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'kick',
    alias: ['remove', 'tendang'],
    category: 'group',
    description: 'Kick member dari grup',
    usage: '.kick @user',
    example: '.kick @user',
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
    let targetJid = null

    if (m.quoted) {
        targetJid = m.quoted.sender
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetJid = m.mentionedJid[0]
    }

    if (!targetJid) {
        await sendReplyWithNav(sock, m, `❌ *ᴛᴀʀɢᴇᴛ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n` +
            `> Reply pesan user atau mention!\n` +
            `> Contoh: \`${m.prefix}kick @user\``, "kick")
        return
    }

    const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const targetNumber = targetJid.replace(/@.*$/, '')

    if (targetJid === botNumber || targetNumber === botNumber.replace(/@.*$/, '')) {
        await m.reply(claraWrap("kick", `❌ *ɢᴀɢᴀʟ*\n\n> Tidak bisa kick bot sendiri!`))
        return
    }

    if (targetJid === m.sender) {
        await m.reply(claraWrap("kick", `❌ *ɢᴀɢᴀʟ*\n\n> Tidak bisa kick diri sendiri!`))
        return
    }

    try {
        const groupMeta = m.groupMetadata
        const targetParticipant = findParticipantByNumber(groupMeta.participants, targetJid)
        
        if (!targetParticipant) {
            m.reply(claraWrap("Kick", `❌ *ɢᴀɢᴀʟ*\n\n> User tidak ditemukan dalam grup!`))
            return
        }
        
        if (targetParticipant.admin) {
            await m.reply(claraWrap("kick", `❌ *ɢᴀɢᴀʟ*\n\n> Tidak bisa kick admin grup!`))
            return
        }
        
        await sock.groupParticipantsUpdate(m.chat, [targetParticipant.id], 'remove')

        { const __navText = `✅ @${targetNumber} telah dikeluarkan dari grup ini.`; await m.reply(__navText); }

    } catch (error) {
        m.reply(claraWrap("kick", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }