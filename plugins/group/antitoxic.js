// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { getDatabase } from '../../src/lib/nova-database.js'
import { gpMsg } from "../../src/lib/nova-group-protection.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'antitoxic',
    alias: ["antitoxic"],
    category: 'group',
    description: 'Mengatur antitoxic di grup',
    usage: '.antitoxic <on/off/warn/metode>',
    example: '.antitoxic on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const DEFAULT_TOXIC_WORDS = [
    'anjing', 'bangsat', 'kontol', 'memek', 'ngentot', 'babi', 'tolol',
    'goblok', 'idiot', 'bodoh', 'kampret', 'asu', 'jancok', 'bajingan',
    'keparat', 'setan', 'iblis', 'tai', 'brengsek', 'sialan'
]

function isToxic(text, toxicList) {
    if (!text || typeof text !== 'string') return { toxic: false, word: null }

    const lowerText = text.toLowerCase().trim()
    if (!lowerText) return { toxic: false, word: null }

    const words = (toxicList && toxicList.length > 0) ? toxicList : DEFAULT_TOXIC_WORDS

    for (const word of words) {
        if (!word) continue
        const lowerWord = word.toLowerCase().trim()
        if (!lowerWord) continue

        const escapedWord = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${escapedWord}($|\\s|[^a-zA-Z0-9])`, 'i')

        if (regex.test(lowerText)) {
            return { toxic: true, word }
        }
    }

    return { toxic: false, word: null }
}


async function handleToxicMessage(m, sock, db, toxicWord) {
    const groupData = db.getGroup(m.chat) || {}
    const maxWarn = groupData.toxicMaxWarn || 3
    const method = groupData.toxicMethod || 'kick'
    const warnCount = (groupData.toxicWarns?.[m.sender] || 0) + 1

    if (!groupData.toxicWarns) groupData.toxicWarns = {}
    groupData.toxicWarns[m.sender] = warnCount
    db.setGroup(m.chat, groupData)

    try {
        await sock.sendMessage(m.chat, { delete: m.key })
    } catch (e) { console.error('[antitoxic.js]:', e.message); }

    const senderTag = m.sender.split('@')[0]

    if (warnCount >= maxWarn) {
        if (method === 'kick') {
            try {
                await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            } catch (e) { console.error('[antitoxic.js]:', e.message); }
        }

        groupData.toxicWarns[m.sender] = 0
        db.setGroup(m.chat, groupData)

        await sock.sendMessage(m.chat, {
            text: gpMsg('antitoxicAction', {
                user: senderTag,
                warn: String(warnCount),
                max: String(maxWarn),
                method
            }),
            mentions: [m.sender],
        })
    } else {
        await sock.sendMessage(m.chat, {
            text: gpMsg('antitoxicWarn', {
                user: senderTag,
                warn: String(warnCount),
                max: String(maxWarn),
                method
            }),
            mentions: [m.sender],
        })
    }

    return true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []
    const subCommand = args[0]?.toLowerCase()

    const groupData = db.getGroup(m.chat) || {}

    if (!subCommand) {
        const status = groupData.antitoxic ? '✅ ON' : '❌ OFF'
        const toxicCount = groupData.toxicWords?.length || DEFAULT_TOXIC_WORDS.length
        const maxWarn = groupData.toxicMaxWarn || 3
        const method = groupData.toxicMethod || 'kick'

        let txt = `🛡️ *antitoxic*\n\n`
        txt += `Status: *${status}*\n`
        txt += `Kata: *${toxicCount}*\n`
        txt += `Max Warn: *${maxWarn}*\n`
        txt += `Metode: *${method}*\n\n`
        txt += `*command:*\n`
        txt += `\`.antitoxic on/off\`\n`
        txt += `\`.antitoxic warn <1-10>\`\n`
        txt += `\`.antitoxic metode kick/delete\`\n`
        txt += `\`.addtoxic <kata>\`\n`
        txt += `\`.deltoxic <kata>\`\n`
        txt += `\`.listtoxic\``

        await m.reply(claraWrap("antitoxic", txt))
        return
    }

    if (subCommand === 'on') {
        db.setGroup(m.chat, { antitoxic: true })
        await m.reply(claraWrap("Antitoxic", `antitoxic diaktifkan`, "success"))
        return
    }

    if (subCommand === 'off') {
        db.setGroup(m.chat, { antitoxic: false })
        await m.reply(claraWrap("Antitoxic", `antitoxic dinonaktifkan`, "error"))
        return
    }

    if (subCommand === 'warn') {
        const count = parseInt(args[1])
        if (!count || count < 1 || count > 10) {
            return m.reply(claraWrap("Anti toxic", `Masukkan angka 1-10\n💡 Contoh: \`.antitoxic warn 5\``, "error"))
        }
        db.setGroup(m.chat, { toxicMaxWarn: count })
        await m.reply(claraWrap("Antitoxic", `Max peringatan diubah ke ${count}`, "success"))
        return
    }

    if (subCommand === 'metode' || subCommand === 'method' || subCommand === 'mode') {
        const method = args[1]?.toLowerCase()
        if (!method || !['kick', 'delete'].includes(method)) {
            return m.reply(claraWrap("Anti toxic", `Pilih metode: Kick atau Delete\n💡 Contoh: \`.antitoxic metode kick\``, "error"))
        }
        db.setGroup(m.chat, { toxicMethod: method })
        await m.reply(claraWrap("Antitoxic", `Metode diubah ke ${method}`, "success"))
        return
    }

    await m.reply(claraWrap("Anti toxic", `Sub-command tidak dikenal.\nKetik \`.antitoxic\` untuk melihat daftar command.`, "error"))
}

export { pluginConfig as config, handler, isToxic, handleToxicMessage, DEFAULT_TOXIC_WORDS }