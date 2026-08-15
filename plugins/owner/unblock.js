// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: ['unblock', 'unblocknomor'],
    alias: [],
    category: 'owner',
    description: 'Buka blokir nomor WhatsApp',
    usage: '.unblock <nomor/reply/mention>',
    example: '.unblock 628xxx',
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
        if (!num) return m.reply(claraWrap("Unblock", '❌ Nomor tidak valid.'))
        targetJid = num + '@s.whatsapp.net'
    } else if (!m.isGroup) {
        targetJid = m.chat
    }

    if (!targetJid) {
        return sendReplyWithNav(sock, m, '⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n' +
            '> `.unblock 628xxx` — Unblock via nomor\n' +
            '> `.unblock` (reply pesan) — Unblock pengirim\n' +
            '> `.unblock @mention` — Unblock yang di-mention\n' +
            '> `.unblock` (di private chat) — Unblock user ini', "unblock")
    }

    try {
        await sock.updateBlockStatus(targetJid, 'unblock')
        await m.react('✅')
        return m.reply(claraWrap("unblock", `✅ *ɴᴏᴍᴏʀ ᴅɪ-ᴜɴʙʟᴏᴄᴋ*\n\n` +
            `> Target: @${targetJid.split('@')[0]}`))
    } catch (err) {
        return m.reply(claraWrap("unblock", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }