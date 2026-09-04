// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import * as timeHelper from '../../src/lib/nova-time.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'checksewa',
    alias: ["checksewa"],
    category: 'group',
    description: 'Cek sisa waktu sewa bot di grup ini',
    usage: '.checksewa',
    example: '.checksewa',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

function formatCountdown(expiredAt) {
    const diff = expiredAt - Date.now()
    if (diff <= 0) return { text: 'EXPIRED', expired: true }
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    let text = ''
    if (days > 0) text += `${days} hari `
    if (hours > 0) text += `${hours} jam `
    if (minutes > 0 && days === 0) text += `${minutes} menit`
    return { text: text.trim(), expired: false }
}

function handler(m, { sock }) {
    const db = getDatabase()
    if (!db.db.data.sewa) {
        db.db.data.sewa = { enabled: false, groups: {} }
        db.db.write()
    }

    if (!db.db.data.sewa.enabled) {
        return m.reply(claraWrap("Checksewa", `ℹ️ Sistem sewa tidak aktif\n\nBot ini bisa digunakan di semua grup.`, "info"))
    }

    const sewaData = db.db.data.sewa.groups[m.chat]

    if (!sewaData) {
        return m.reply(claraWrap("Checksewa", `Grup ini tidak terdaftar dalam sistem sewa\n\nHubungi owner bot untuk info sewa.`, "error"))
    }

    const groupName = sewaData.name || m.chat.split('@')[0]
    const addedDate = sewaData.addedAt ? timeHelper.fromTimestamp(sewaData.addedAt, 'D MMMM YYYY') : '-'

    if (sewaData.isLifetime) {
        return m.reply(claraWrap("checksewa", `♾️ *ꜱᴛᴀᴛᴜꜱ ꜱᴇᴡᴀ*\n\n` +
            `Grup: *${groupName}*\n` +
            `Status: *ᴘᴇʀᴍᴀɴᴇɴᴛ* ♾️\n` +
            `Terdaftar sejak: *${addedDate}*\n\n` +
            `Bot akan aktif selamanya di grup ini.`))
    }

    const countdown = formatCountdown(sewaData.expiredAt)
    const expiredStr = timeHelper.fromTimestamp(sewaData.expiredAt, 'D MMMM YYYY HH:mm')

    if (countdown.expired) {
        return m.reply(claraWrap("checksewa", `❌ *ꜱᴇᴡᴀ ᴇxᴘɪʀᴇᴅ*\n\n` +
            `Grup: *${groupName}*\n` +
            `Berakhir: *${expiredStr}*\n\n` +
            `Hubungi owner bot untuk perpanjang sewa.`))
    }

    const diff = sewaData.expiredAt - Date.now()
    const isAlmostExpired = diff <= 259200000

    let text = `⏱️ *ꜱᴛᴀᴛᴜꜱ ꜱᴇᴡᴀ*\n\n`
    text += `Grup: *${groupName}*\n`
    text += `Sisa waktu: *${countdown.text}*\n`
    text += `Berakhir: *${expiredStr}*\n`
    text += `Terdaftar sejak: *${addedDate}*`

    if (isAlmostExpired) {
        text += `\n\n⚠️ Sewa hampir habis! Hubungi owner bot untuk perpanjang.`
    }

    return m.reply(claraWrap("checksewa", text))
}

export { pluginConfig as config, handler }