// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { isLid, lidToJid } from '../../src/lib/nova-lid.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'unmutemember',
    alias: ["unmutemember"],
    category: 'group',
    description: 'Membuka mute member tertentu',
    usage: '.unmutemember <@tag/reply/nomor>',
    example: '.unmutemember @user',
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

function resolveTarget(m) {
    let raw = ''

    if (m.quoted) {
        raw = m.quoted.sender || ''
    } else if (m.mentionedJid?.length) {
        raw = m.mentionedJid[0] || ''
    } else if (m.args[0]) {
        raw = m.args[0]
    }

    if (!raw) return ''

    if (isLid(raw)) raw = lidToJid(raw)
    if (!raw.includes('@')) raw = raw.replace(/[^0-9]/g, '') + '@s.whatsapp.net'

    return raw
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}
    const mutedMembers = groupData.mutedMembers || []

    if (m.command === 'listmutemember' || m.command === 'listmute') {
        if (mutedMembers.length === 0) {
            return m.reply("🔇 Tidak ada member yang dimute di grup ini")
        }

        let txt = `🔇 *List Muted Members*\n\n`
        mutedMembers.forEach((jid, i) => {
            const num = jid.replace(/@.+/g, '')
            txt += `${i + 1}. @${num}\n`
        })
        txt += `\nTotal: \`${mutedMembers.length}\` member dimute`

        return m.reply(txt)
    }

    const targetJid = resolveTarget(m)

    if (!targetJid) {
        return m.reply( `🔊 *ᴜɴᴍᴜᴛᴇ ᴍᴇᴍʙᴇʀ*\n\n` +
            `Membuka mute member tertentu\n\n` +
            `\`Contoh:\`\n` +
            `${m.prefix}unmutemember @user\n` +
            `${m.prefix}unmutemember 6281234567890\n` +
            `Reply pesan member + ${m.prefix}unmutemember`, "unmutemember")
    }

    const targetNumber = targetJid.replace(/@.+/g, '')

    const index = mutedMembers.findIndex(jid => {
        const c = jid.replace(/@.+/g, '')
        return c === targetNumber || c.endsWith(targetNumber) || targetNumber.endsWith(c)
    })

    if (index === -1) {
        return m.reply(claraWrap("Unmutemember", `❌ *ɢᴀɢᴀʟ*\n\nMember @${targetNumber} tidak sedang dimute`))
    }

    mutedMembers.splice(index, 1)
    db.setGroup(m.chat, { ...groupData, mutedMembers })

    await m.reply(`🔊 *ᴍᴇᴍʙᴇʀ ᴅɪᴜɴᴍᴜᴛᴇ*\n\n` +
        "" +
        `👤 Member: @${targetNumber}\n` +
        `🔊 sTatus: \`Unmuted\`\n` +
        `📊 sIsa Mute: \`${mutedMembers.length}\` Member\n` +
        "")
}

export { pluginConfig as config, handler }
