// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { gpMsg } from "../../src/lib/nova-group-protection.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "antisticker",
    alias: ["antisticker"],
    category: 'group',
    description: 'Mengatur antisticker di grup',
    usage: '.antisticker <on/off>',
    example: '.antisticker on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}


async function checkAntisticker(m, sock, db) {
    if (!m.isGroup) return false
    if (m.isAdmin || m.isOwner || m.fromMe) return false

    const groupData = db.getGroup(m.chat) || {}
    if (!groupData.antisticker) return false

    const isSticker = m.isSticker || m.type === 'stickerMessage'
    if (!isSticker) return false

    try {
        await sock.sendMessage(m.chat, { delete: m.key })
    } catch (e) { console.error('[antisticker.js]:', e.message); }

    await sock.sendMessage(m.chat, {
        text: gpMsg('antisticker', { user: m.sender.split('@')[0] }),
        mentions: [m.sender],
    })

    return true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const action = (m.args || [])[0]?.toLowerCase()
    const groupData = db.getGroup(m.chat) || {}

    if (!action) {
        const status = groupData.antisticker ? '✅ ON' : '❌ OFF'
        await m.reply( `🎭 *ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ*\n\nStatus: *${status}*\n\n\`.antisticker on/off\``, "antisticker")
        return
    }

    if (action === 'on') {
        db.setGroup(m.chat, { antisticker: true })
        { const __navText = `✅ *ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ*`; await m.reply(__navText); }
        return
    }

    if (action === 'off') {
        db.setGroup(m.chat, { antisticker: false })
        await m.reply(claraWrap("Antisticker", `antisticker dinonaktifkan`, "error"))
        return
    }

    await m.reply(claraWrap("Anti sticker", `Gunakan \`.antisticker on\` atau \`.antisticker off\``, "error"))
}

export { pluginConfig as config, handler, checkAntisticker }