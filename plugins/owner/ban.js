// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { notifyUserBanned } from '../../src/lib/nova-saluran-broadcast.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import { isLid, lidToJid, resolveAnyLidToJid } from '../../src/lib/nova-lid.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: "ban",
    alias: ["ban"],
    category: 'owner',
    description: 'Memblokir user dari menggunakan bot',
    usage: '.ban <nomor/@tag>',
    example: '.ban 6281234567890',
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
        return m.reply( `🚫 *Ban User*\n\n` +
            `Masukkan nomor atau tag user\n\n` +
            `\`Contoh: ${m.prefix}ban 6281234567890\``, "ban")
    }

    if (config.isOwner(targetNumber)) {
        return m.reply(claraWrap("Ban", `❌ *Gagal*\n\nTidak dapat ban owner`))
    }

    const db = getDatabase()
    const bannedList = db.setting('bannedUsers') || []

    const alreadyBanned = bannedList.some(b => {
        const c = String(b).replace(/[^0-9]/g, '')
        return c === targetNumber || c.endsWith(targetNumber) || targetNumber.endsWith(c)
    })

    if (alreadyBanned) {
        { const __navText = `❌ *Gagal*\n\nNomor \`${targetNumber}\` sudah dibanned`; return await m.reply(__navText); }
    }

    bannedList.push(targetNumber)
    db.setting('bannedUsers', bannedList)
    config.bannedUsers = bannedList


    // Broadcast ke saluran
    await notifyUserBanned(sock, {
      phoneNumber: targetNumber,
      reason: 'Dibanned oleh owner',
      totalBanned: bannedList.length,
    }).catch((e) => { console.error('[ban.js]:', e.message); })

    await m.reply(
        `🚫 *User Dibanned*\n\n` +
        `╭─「 Detail 」\n` +
        `│ 📱 Nomor: \`${targetNumber}\`\n` +
        `│ 🚫 sTatus: \`Banned\`\n` +
        `│ 📊 Total: \`${bannedList.length}\` User\n` +
        `╰──────────`
    )
}

export { pluginConfig as config, handler }