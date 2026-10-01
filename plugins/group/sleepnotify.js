// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { setNotifTidur, toggleNotif, getNotif, deleteNotif, parseJadwal } from '../../src/lib/rara-notif-scheduler.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: 'notiftidur',
    alias: ["notiftidur"],
    category: 'group',
    description: 'Atur pengingat waktu tidur otomatis',
    usage: '.notiftidur on <jam1,jam2,...> / off / edit <jam1,jam2,...>',
    example: '.notiftidur on 22.00',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const args = m.args || []
    const sub = args[0]?.toLowerCase()
    const chatJid = m.chat
    const sender = m.sender

    const existing = getNotif('tidur', sender, chatJid)

    if (!sub || !['on', 'off', 'edit'].includes(sub)) {
        const status = existing
            ? (existing.enabled ? '✅ Aktif' : '❌ Nonaktif')
            : '⚪ Belum diatur'

        let info = `🌙 *pengingat tidur*\n\n`
        info += `📌 *status:* ${status}\n`

        if (existing) {
            info += `⏰ *jadwal:* ${existing.jadwal.map(j => `*${j}* WIB`).join(', ')}\n`
        }

        info += `\n*📋 Cara Pakai:*\n`
        info += `\`${m.prefix}notiftidur on 22.00\`\n`
        info += `\`${m.prefix}notiftidur on 22.00,23.30\`\n`
        info += `\`${m.prefix}notiftidur edit 23.00\`\n`
        info += `\`${m.prefix}notiftidur off\`\n`
        info += `\n💡 _Jam bisa pakai titik atau titik dua (22.00 / 22:00)_\n`
        info += `💡 _Bisa multiple jam, pisahkan pakai koma_`

        return m.reply( info, "notiftidur")
    }

    if (sub === 'off') {
        if (!existing) {
            return m.reply(raraWrap("Notiftidur", `belum ada pengingat tidur yang aktif di chat ini`, "error"))
        }
        toggleNotif('tidur', sender, chatJid, false)
        return m.reply(raraWrap("Notif tidur", `Pengingat Tidur Dinonaktifkan 🔕\n\nKetik \`${m.prefix}notiftidur on\` untuk mengaktifkan kembali`, "success"))
    }

    if (sub === 'on') {
        if (existing?.enabled && args.length === 1) {
            return m.reply(raraWrap("Notif tidur", `Pengingat tidur sudah aktif!\n\n⏰ Jadwal: ${existing.jadwal.map(j => `${j}`).join(', ')} WIB\n\nGunakan \`${m.prefix}notiftidur edit\` untuk mengubah jadwal`, "warn"))
        }

        if (existing && args.length === 1) {
            toggleNotif('tidur', sender, chatJid, true)
            return m.reply(raraWrap("Notif tidur", `Pengingat tidur diaktifkan kembali! 🔔\n\n⏰ Jadwal: ${existing.jadwal.map(j => `${j}`).join(', ')} WIB`, "success"))
        }

        const timeInput = args[1]
        if (!timeInput) {
            return m.reply( `❌ *Masukkan jadwal tidur!*\n\n💡 *Contoh:* \`${m.prefix}notiftidur on 22.00\``, "notiftidur")
        }

        const jadwal = parseJadwal(timeInput)
        if (jadwal.length === 0) {
            return m.reply(raraWrap("Notif tidur", `Format jam salah!\n\nGunakan format HH.MM atau HH:MM\n💡 Contoh: \`22.00\` atau \`23.30\``, "error"))
        }

        setNotifTidur(sender, chatJid, jadwal)

        let reply = `✅ *Pengingat tidur aktif!* 🔔\n\n`
        reply += `⏰ *jadwal:*\n`
        for (const j of jadwal) {
            reply += `🕐 *${j}* WIB\n`
        }
        reply += `\n💡 _Notifikasi akan dikirim ke chat ini setiap hari_`

        return m.reply(reply)
    }

    if (sub === 'edit') {
        if (!existing) {
            return m.reply( `❌ *Belum ada pengingat tidur!*\n\nAktifkan dulu: \`${m.prefix}notiftidur on 22.00\``, "notiftidur")
        }

        const timeInput = args[1]
        if (!timeInput) {
            return m.reply(raraWrap("Notif tidur", `Masukkan jadwal baru!\n\n💡 Contoh: \`${m.prefix}notiftidur edit 23.00\``, "error"))
        }

        const jadwal = parseJadwal(timeInput)
        if (jadwal.length === 0) {
            return m.reply(raraWrap("Notif tidur", `Format jam salah!\n\nGunakan format HH.MM atau HH:MM\n💡 Contoh: \`23.00\` atau \`22.30\``, "error"))
        }

        setNotifTidur(sender, chatJid, jadwal)

        let reply = `✅ *Jadwal tidur diperbarui!* ✏️\n\n`
        reply += `⏰ *jadwal baru:*\n`
        for (const j of jadwal) {
            reply += `🕐 *${j}* WIB\n`
        }

        return m.reply(reply)
    }
}

export { pluginConfig as config, handler }
