// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'onlyadmin',
    alias: ["onlyadmin"],
    category: 'owner',
    description: 'Hanya admin grup yang bisa akses command bot',
    usage: '.onlyadmin on/off',
    example: '.onlyadmin on',
    isOwner: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args[0]?.toLowerCase()
    const cmd = m.command.toLowerCase()
    const current = db.setting('onlyAdmin') || false

    if (cmd === 'selfadmin') {
        if (current) {
            db.setting('onlyAdmin', false)
            return m.reply(claraWrap("Onlyadmin", '❌ *Onlyadmin Nonaktif*\n\nBot bisa diakses semua orang'))
        }
        db.setting('onlyAdmin', true)
        db.setting('selfAdmin', false)
        db.setting('publicAdmin', false)
        return m.reply(claraWrap("Onlyadmin", [
            "*Onlyadmin Aktif*",
            "✅ Admin grup",
            "✅ Owner bot",
            "❌ Member biasa",
            "---",
            `Gunakan \`${m.prefix}onlyadmin off\` untuk menonaktifkan`,
        ], "success"))
    }

    if (cmd === 'publicadmin') {
        if (current) {
            db.setting('onlyAdmin', false)
            return m.reply(claraWrap("Onlyadmin", '❌ *Onlyadmin Nonaktif*\n\nBot bisa diakses semua orang'))
        }
        db.setting('onlyAdmin', true)
        db.setting('selfAdmin', false)
        db.setting('publicAdmin', false)
        return m.reply(claraWrap("Onlyadmin", [
            "*Onlyadmin Aktif*",
            "✅ Admin grup",
            "✅ Owner bot",
            "✅ Private chat (semua)",
            "❌ Member biasa di grup",
            "---",
            `Gunakan \`${m.prefix}onlyadmin off\` untuk menonaktifkan`,
        ], "success"))
    }

    if (!args || args === 'status') {
        return m.reply(claraWrap("Onlyadmin", [
            `Status : ${current ? "✅ Aktif" : "❌ Nonaktif"}`,
            "---",
            `📌 \`${m.prefix}onlyadmin on\` — Aktifkan`,
            `📌 \`${m.prefix}onlyadmin off\` — Nonaktifkan`,
            "---",
            "Hanya admin grup, owner, dan private chat yang bisa akses bot",
        ]))
    }

    if (args === 'on') {
        if (current) return m.reply(claraWrap("Onlyadmin", '⚠️ OnlyAdmin sudah aktif.'))
        db.setting('onlyAdmin', true)
        db.setting('selfAdmin', false)
        db.setting('publicAdmin', false)
        return m.reply(claraWrap("Onlyadmin", [
            "*Onlyadmin Aktif*",
            "✅ Admin grup",
            "✅ Owner bot",
            "✅ Private chat (semua)",
            "❌ Member biasa di grup",
        ], "success"))
    }

    if (args === 'off') {
        if (!current) return m.reply(claraWrap("Onlyadmin", '⚠️ OnlyAdmin sudah nonaktif.'))
        db.setting('onlyAdmin', false)
        return m.reply(claraWrap("Onlyadmin", '❌ *Onlyadmin Nonaktif*\n\nBot bisa diakses semua orang'))
    }

    return m.reply(claraWrap("Onlyadmin", '❌ Argumen tidak valid. Gunakan: `on` atau `off`'))
}

export { pluginConfig as config, handler }