// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import config from '../../config.js'
import { notifyUserBlocked } from '../../src/lib/nova-saluran-broadcast.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: ['block', 'blokir'],
    alias: [],
    category: 'owner',
    description: 'Blokir nomor WhatsApp',
    usage: '.block <nomor/reply/mention>',
    example: '.block 628xxx',
    isOwner: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let targetJid = null

    if (m.mentionedJid?.length > 0) {
        targetJid = m.mentionedJid[0]
    } else if (m.quoted) {
        targetJid = m.quoted.sender || m.quoted.participant
    } else if (m.args[0]) {
        let num = m.args[0].replace(/[^0-9]/g, '')
        if (!num) return m.reply(claraWrap("Block", '❌ Nomor tidak valid.'))
        targetJid = num + '@s.whatsapp.net'
    } else if (!m.isGroup) {
        targetJid = m.chat
    }

    if (!targetJid) {
        return sendReplyWithNav(sock, m, '⚠️ *Cara Pakai*\n\n' +
            '> `.block 628xxx` — Blokir via nomor\n' +
            '> `.block` (reply pesan) — Blokir pengirim\n' +
            '> `.block @mention` — Blokir yang di-mention\n' +
            '> `.block` (di private chat) — Blokir user ini', "block")
    }

    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    if (targetJid === botJid) {
        return m.reply('❌ Tidak bisa blokir nomor bot sendiri.')
    }

    try {
        await sock.updateBlockStatus(targetJid, 'block')

    // Broadcast ke saluran
    await notifyUserBlocked(sock, {
      phoneNumber: targetJid.split('@')[0],
    }).catch(() => {})
        return m.reply(
            `🚫 *Nomor Diblokir*\n\n` +
            `Target: @${targetJid.split('@')[0]}\n` +
            `Gunakan \`.unblock\` untuk membuka blokir`,
            { mentions: [targetJid] }
        )
    } catch (err) {
        return m.reply(claraWrap("block", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }