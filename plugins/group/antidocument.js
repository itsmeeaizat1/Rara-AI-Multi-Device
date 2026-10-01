// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { gpMsg } from "../../src/lib/rara-group-protection.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'antidocument',
    alias: ["antidocument"],
    category: 'group',
    description: 'Mengatur antidocument di grup',
    usage: '.antidocument <on/off>',
    example: '.antidocument on',
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


async function checkAntidocument(m, sock, db) {
    if (!m.isGroup) return false
    if (m.isAdmin || m.isOwner || m.fromMe) return false

    const groupData = db.getGroup(m.chat) || {}
    if (!groupData.antidocument) return false

    const isDocument = m.isDocument || m.type === 'documentMessage' || m.type === 'documentWithCaptionMessage'
    if (!isDocument) return false

    try {
        await sock.sendMessage(m.chat, { delete: m.key })
    } catch (e) { console.error('[antidocument.js]:', e.message); }

    await sock.sendMessage(m.chat, {
        text: gpMsg('antidocument', { user: m.sender.split('@')[0] }),
        mentions: [m.sender],
    })

    return true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const action = (m.args || [])[0]?.toLowerCase()
    const groupData = db.getGroup(m.chat) || {}

    if (!action) {
        const status = groupData.antidocument ? '✅ ON' : '❌ OFF'
        await m.reply( `📄 *antidocument*\n\nStatus: *${status}*\n\n\`.antidocument on/off\``, "antidocument")
        return
    }

    if (action === 'on') {
        db.setGroup(m.chat, { antidocument: true })
        { const __navText = `✅ *antidocument diaktifkan*`; await m.reply(__navText); }
        return
    }

    if (action === 'off') {
        db.setGroup(m.chat, { antidocument: false })
        await m.reply(raraWrap("Antidocument", `antidocument dinonaktifkan`, "error"))
        return
    }

    await m.reply(raraWrap("Anti document", `Gunakan \`.antidocument on\` atau \`.antidocument off\``, "error"))
}

export { pluginConfig as config, handler, checkAntidocument }