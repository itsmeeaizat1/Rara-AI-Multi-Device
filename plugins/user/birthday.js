// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runLiveTicker, formatRemaining } from "../../src/lib/rara-countdown.js";
import { getDatabase } from '../../src/lib/rara-database.js'
import config from '../../config.js'
const pluginConfig = {
    name: 'birthday',
    alias: ["birthday"],
    category: 'user',
    description: 'Lihat ulang tahun member',
    usage: '.birthday [@user]',
    example: '.birthday @user',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
    const cleanJid = target.replace(/@.+/g, '')
    const db = getDatabase()
    const user = db.getUser(target)
    
    if (!user?.birthday) {
        if (target === m.sender) {
            return m.reply(
                `❌ Kamu belum set birthday!\n\n` +
                `Gunakan: ${m.prefix}setbirthday DD-MM\n` +
                `Contoh: ${m.prefix}setbirthday 25-12`
            )
        }
        { const __navText = raraWrap("birthday", `❌ User belum set birthday!`); return await m.reply(__navText); }
    }
    
    const [day, month] = user.birthday.split('-').map(Number)
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    const now = new Date()
    const currentYear = now.getFullYear()
    let nextBday = new Date(currentYear, month - 1, day)
    
    if (nextBday < now) {
        nextBday = new Date(currentYear + 1, month - 1, day)
    }
    
    const diffTime = nextBday.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const isToday = now.getDate() === day && now.getMonth() === month - 1

    // Hari ini ultah → kartu ucapan statis (gak ada yang dihitung)
    if (isToday) {
        let today = `🎂 *Birthday InғO*\n\n`
        today += `🏷️ @${cleanJid}\n`
        today += `📅 ${day} ${months[month - 1]}\n`
        today += `🎉 *hari ini ultah!*\n`
        today += `---`
        today += `\n\n🎊 *happy birthday!* 🎊\n`
        today += `Semoga panjang umur dan\n`
        today += `sukses selalu! 🎉🎂`
        await m.reply(raraWrap("Birthday", today), { mentions: [target] })
        return
    }

    // 🔹 LIVE COUNTDOWN (13 Sep, request owner "fitur polos di-variasi biar
    // menarik"): "X hari lagi" gak lagi angka beku — kartu nge-tick HIDUP
    // (hari + jam:menit:detik) pakai rara-countdown, lalu settle statis.
    const bdayCard = (remainingMs, live = true) => {
        const days = Math.floor(Math.max(0, remainingMs) / 86400000)
        const hms = formatRemaining(Math.max(0, remainingMs) % 86400000)
        return raraWrap("Birthday", [
            `🎂 *Birthday InғO*`,
            ``,
            `🏷️ @${cleanJid}`,
            `📅 ${day} ${months[month - 1]}`,
            live
                ? `🕕 *${days} hari* ${hms} lagi 🕒`
                : `🕕 ${days} hari lagi (${diffDays} hari menuju ultah)`,
            ``,
            `_countdown ke ${day} ${months[month - 1]}_`,
        ].join("\n"))
    }
    await runLiveTicker({
        sock, chat: m.chat, m,
        mode: "down", targetTs: nextBday.getTime(), maxEdits: Number(process.env.NOVA_TICK_MAXEDITS) || 16,
        initialCard: bdayCard(diffTime),
        tickCard: (st) => bdayCard(st.remainingMs, st.remainingMs > 0),
        finalCard: (st) => bdayCard(st.remainingMs, false),
    })
    try { await sock.sendMessage(m.chat, { mentions: [target] }); } catch {}
}

export { pluginConfig as config, handler }