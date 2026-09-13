// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import * as timeHelper from '../../src/lib/nova-time.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { runLiveTicker } from "../../src/lib/nova-countdown.js";
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

async function handler(m, { sock }) {
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

    // 📊 (13 Sep): bar progress masa sewa — keliatan berapa persen ke-terpakai
    const totalSewa = sewaData.expiredAt - (sewaData.addedAt || sewaData.expiredAt)
    let barLine = ''
    if (totalSewa > 0) {
        const used = Math.min(1, Math.max(0, (Date.now() - (sewaData.addedAt || sewaData.expiredAt)) / totalSewa))
        const n = Math.round(used * 10)
        const pct = Math.round(used * 100)
        barLine = `\n📊 ${'▰'.repeat(n)}${'▱'.repeat(10 - n)} ${pct}% terpakai`
    }

    let text = `⏱️ *ꜱᴛᴀᴛᴜꜱ ꜱᴇᴡᴀ*\n\n`
    text += `Grup: *${groupName}*\n`
    text += `Sisa waktu: *${countdown.text}*`
    text += barLine
    text += `\nBerakhir: *${expiredStr}*\n`
    text += `Terdaftar sejak: *${addedDate}*`

    if (isAlmostExpired) {
        text += `\n\n⚠️ Sewa hampir habis! Hubungi owner bot untuk perpanjang.`
    }

    await m.reply(claraWrap("checksewa", text))

    // 🔹 LIVE COUNTDOWN (13 Sep, pola premium): sisa ≤24 jam → ticker nge-tick
    // 🕒 H:MM:SS sampai expired → "SEWA EXPIRED" + ajakan perpanjang.
    if (diff <= 86400000 && diff > 0) {
        const sewaCard = (remMs) => {
            const h = Math.floor(remMs / 3600000)
            const mm = Math.floor((remMs % 3600000) / 60000)
            const ss = Math.floor((remMs % 60000) / 1000)
            if (remMs <= 0) {
                return [
                    `❌ *ꜱᴇᴡᴀ ᴇxᴘɪʀᴇᴅ*`,
                    ``,
                    `Grup: *${groupName}*`,
                    ``,
                    `Sewa bot di grup ini udah habis.`,
                    `Hubungi owner bot untuk perpanjang.`,
                ].join('\n')
            }
            return [
                `🕒 *ꜱᴇᴡᴀ ʜᴀᴍᴘɪʀ ʜᴀʙɪꜱ*`,
                ``,
                `Grup: *${groupName}*`,
                `Sisa: *${h} jam ${String(mm).padStart(2, '0')} mnt ${String(ss).padStart(2, '0')} dtk*`,
                `Berakhir: ${expiredStr}`,
                ``,
                `⚠️ Segera hubungi owner bot untuk perpanjang.`,
            ].join('\n')
        }
        runLiveTicker({
            sock, chat: m.chat, m,
            mode: "down",
            targetTs: sewaData.expiredAt,
            initialCard: sewaCard(diff),
            tickCard: (st) => sewaCard(st.remainingMs),
            maxEdits: 600,
        }).catch(() => {})
    }
    return
}

export { pluginConfig as config, handler }