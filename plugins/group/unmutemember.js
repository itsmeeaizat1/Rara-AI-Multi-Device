// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { isLid, lidToJid } from '../../src/lib/rara-lid.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

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
            return m.reply(raraWrap("Unmutemember", `Tidak ada member yang dimute di grup ini`, "info"))
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
        return m.reply( `🔊 *unmute member*\n\n` +
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
        return m.reply(raraWrap("Unmutemember", `gagal\n\nMember @${targetNumber} tidak sedang dimute`, "error"))
    }

    mutedMembers.splice(index, 1)
    db.setGroup(m.chat, { ...groupData, mutedMembers })

    await m.reply(raraWrap("Unmutemember", `Member: @${targetNumber}\nStatus: Unmuted\nSisa mute: ${mutedMembers.length} member`, "success"))
}

export { pluginConfig as config, handler }
