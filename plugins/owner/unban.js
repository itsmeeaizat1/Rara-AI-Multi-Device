// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import { isLid, lidToJid } from '../../src/lib/nova-lid.js'

const pluginConfig = {
    name: "unban",
    alias: ["unban", "unbanuser", "unbanowner"],
    category: 'owner',
    description: 'Menghapus user dari daftar banned',
    usage: '.unban <nomor/@tag>',
    example: '.unban 6281234567890',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
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
    let num = raw.replace(/[^0-9]/g, '')
    if (num.startsWith('08')) num = '62' + num.slice(1)
    if (num.startsWith('0')) num = '62' + num.slice(1)

    return num
}

async function handler(m, { sock }) {
    const targetNumber = resolveTarget(m)

    if (!targetNumber || targetNumber.length < 10 || targetNumber.length > 15) {
        return m.reply( claraWrap("Unban User", `✅ *Unban User*\n\n` +
            `Masukkan nomor atau tag user\n\n` +
            `\`Contoh: ${m.prefix}unban 6281234567890\``), "unban")
    }

    const db = getDatabase()
    const bannedList = db.setting('bannedUsers') || []

    const index = bannedList.findIndex(b => {
        const c = String(b).replace(/[^0-9]/g, '')
        return c === targetNumber || c.endsWith(targetNumber) || targetNumber.endsWith(c)
    })

    if (index === -1) {
        { const __navText = `❌ *Gagal*\n\n> Nomor \`${targetNumber}\` tidak dalam daftar banned`; return await m.reply(claraWrap("unban", __navText)); }
    }

    bannedList.splice(index, 1)
    db.setting('bannedUsers', bannedList)
    config.bannedUsers = bannedList

    await m.react('✅')

    await m.reply(claraWrap("User Diunban", `✅ *User Diunban*\n\n` +
        `╭┈┈⬡「 📋 *Detail* 」\n` +
        `┃ 📱 Nomor: \`${targetNumber}\`\n` +
        `┃ ✅ sTatus: \`Unbanned\`\n` +
        `┃ 📊 Total: \`${bannedList.length}\` User\n` +
        `╰┈┈⬡`))
}

export { pluginConfig as config, handler }