// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'antijudol',
    alias: ["antijudol"],
    category: 'group',
    description: 'Deteksi konten judol di grup',
    usage: '.antijudol <on/off/metode> [kick/remove]',
    example: '.antijudol on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}
    const option = m.text?.toLowerCase()?.trim()

    if (!option) {
        const status = groupData.antijudol || 'off'
        const mode = groupData.antijudolMode || 'remove'
        return m.reply(novaGuide("Anti-Judol", `Status: ${status.toUpperCase()} | Mode: ${mode.toUpperCase()}\n\nDeteksi konten judi online/slot gacor di grup.`, `${m.prefix}antijudol on`))
    }

    if (option === 'on') {
        db.setGroup(m.chat, { antijudol: 'on' })
        return m.reply(claraWrap("Antijudol", '✅ *AntiJudol diaktifkan*'))
    }

    if (option === 'off') {
        db.setGroup(m.chat, { antijudol: 'off' })
        return m.reply(claraWrap("Antijudol", '❌ *AntiJudol dinonaktifkan*'))
    }

    if (option.startsWith('metode')) {
        const method = m.args?.[1]?.toLowerCase()
        if (method === 'kick') {
            db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'kick' })
            return m.reply(claraWrap("Antijudol", '✅ *AntiJudol mode KICK diaktifkan*'))
        }
        if (method === 'remove' || method === 'delete') {
            db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'remove' })
            return m.reply(claraWrap("Antijudol", '✅ *AntiJudol mode DELETE diaktifkan*'))
        }
        return m.reply(claraWrap("Anti judol", `Metode tidak valid! Gunakan: \`kick\` atau \`remove\``, "error"))
    }

    if (option === 'kick') {
        db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'kick' })
        return m.reply(claraWrap("Antijudol", '✅ *AntiJudol mode KICK diaktifkan*'))
    }

    if (option === 'remove' || option === 'delete') {
        db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'remove' })
        return m.reply(claraWrap("Antijudol", '✅ *AntiJudol mode DELETE diaktifkan*'))
    }

    return m.reply(novaError("Anti-Judol", "Opsi tidak valid nih! Gunakan: on, off, metode kick, atau metode remove"))
}

export { pluginConfig as config, handler }
