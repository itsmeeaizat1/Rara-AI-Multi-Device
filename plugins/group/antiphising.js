// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: 'antiphising',
    alias: ["antiphising"],
    category: 'group',
    description: 'Deteksi konten phising di grup',
    usage: '.antiphising <on/off/metode> [kick/remove]',
    example: '.antiphising on',
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
        const status = groupData.antiphising || 'off'
        const mode = groupData.antiphisingMode || 'remove'
        return m.reply(raraGuide("Anti-Phishing", `Status: ${status.toUpperCase()} | Mode: ${mode.toUpperCase()}\n\nDeteksi link phishing, verifikasi palsu, dan scam URL di grup.`, `${m.prefix}antiphising on`))
    }

    if (option === 'on') {
        db.setGroup(m.chat, { antiphising: 'on' })
        return m.reply(raraWrap("Antiphising", '✅ *AntiPhising diaktifkan*'))
    }

    if (option === 'off') {
        db.setGroup(m.chat, { antiphising: 'off' })
        return m.reply(raraWrap("Antiphising", '❌ *AntiPhising dinonaktifkan*'))
    }

    if (option.startsWith('metode')) {
        const method = m.args?.[1]?.toLowerCase()
        if (method === 'kick') {
            db.setGroup(m.chat, { antiphising: 'on', antiphisingMode: 'kick' })
            return m.reply(raraWrap("Antiphising", '✅ *AntiPhising mode KICK diaktifkan*'))
        }
        if (method === 'remove' || method === 'delete') {
            db.setGroup(m.chat, { antiphising: 'on', antiphisingMode: 'remove' })
            return m.reply(raraWrap("Antiphising", '✅ *AntiPhising mode DELETE diaktifkan*'))
        }
        return m.reply(raraError("Anti-Phishing", "Metode penanganan tidak valid! Gunakan: kick atau remove"))
    }

    if (option === 'kick') {
        db.setGroup(m.chat, { antiphising: 'on', antiphisingMode: 'kick' })
        return m.reply(raraWrap("Antiphising", '✅ *AntiPhising mode KICK diaktifkan*'))
    }

    if (option === 'remove' || option === 'delete') {
        db.setGroup(m.chat, { antiphising: 'on', antiphisingMode: 'remove' })
        return m.reply(raraWrap("Antiphising", '✅ *AntiPhising mode DELETE diaktifkan*'))
    }

    return m.reply(raraError("Anti-Phishing", "Opsi tidak valid nih! Gunakan: on, off, metode kick, atau metode remove"))
}

export { pluginConfig as config, handler }
