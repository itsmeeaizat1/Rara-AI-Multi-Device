// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "antisticker",
    alias: ["antisticker", "as", "antistick"],
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

function gpMsg(key, replacements = {}) {
    const defaults = {
        antisticker: '⚠ *ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ* — Sticker dari @%user% dihapus.',
    }
    let text = config.groupProtection?.[key] || defaults[key] || ''
    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`%${k}%`, 'g'), v)
    }
    return text
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
        m.react('✅')
        { const __navText = `✅ *ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ*`; await m.reply(__navText); }
        return
    }

    if (action === 'off') {
        db.setGroup(m.chat, { antisticker: false })
        await m.reply(claraWrap("Antisticker", `❌ *ᴀɴᴛɪꜱᴛɪᴄᴋᴇʀ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ*`))
        return
    }

    await m.reply(`❌ Gunakan \`.antisticker on\` atau \`.antisticker off\``)
}

export { pluginConfig as config, handler, checkAntisticker }