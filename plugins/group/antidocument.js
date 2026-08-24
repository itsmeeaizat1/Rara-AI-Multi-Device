// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'antidocument',
    alias: ['antidoc', 'nodocument', 'nodoc'],
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

function gpMsg(key, replacements = {}) {
    const defaults = {
        antidocument: '⚠ *AntiDocument* — Dokumen dari @%user% dihapus.',
    }
    let text = config.groupProtection?.[key] || defaults[key] || ''
    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`%${k}%`, 'g'), v)
    }
    return text
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
        await m.reply( `📄 *AntiDocument*\n\n> Status: *${status}*\n\n> \`.antidocument on/off\``, "antidocument")
        return
    }

    if (action === 'on') {
        db.setGroup(m.chat, { antidocument: true })
        m.react('✅')
        { const __navText = `✅ *AntiDocument diaktifkan*`; await m.reply(__navText); }
        return
    }

    if (action === 'off') {
        db.setGroup(m.chat, { antidocument: false })
        await m.reply(claraWrap("Antidocument", `❌ *AntiDocument dinonaktifkan*`))
        return
    }

    await m.reply(`❌ Gunakan \`.antidocument on\` atau \`.antidocument off\``)
}

export { pluginConfig as config, handler, checkAntidocument }