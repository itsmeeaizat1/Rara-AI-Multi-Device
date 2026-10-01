// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'cekpartner',
    alias: ["cekpartner"],
    category: "fun",
    description: 'Cek detail status partner user',
    usage: '.cekpartner @user',
    example: '.cekpartner',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function handler(m, { sock }) {
    const db = getDatabase()
    let targetNumber = ''

    if (m.quoted) {
        targetNumber = m.quoted.sender?.replace(/[^0-9]/g, '') || ''
    } else if (m.mentionedJid?.length) {
        targetNumber = m.mentionedJid[0]?.replace(/[^0-9]/g, '') || ''
    } else if (m.args?.length) {
        targetNumber = m.args[0].replace(/[^0-9]/g, '')
    } else {
        targetNumber = m.sender?.replace(/[^0-9]/g, '') || ''
    }

    if (targetNumber.startsWith('0')) targetNumber = '62' + targetNumber.slice(1)
    if (!db.data.partner) db.data.partner = []

    const info = db.data.partner.find(p => p.id === targetNumber)
    const jid = targetNumber + '@s.whatsapp.net'

    if (!info) {
        return m.reply(raraWrap("Cekpartner", `❌ @${targetNumber} bukan partner`))
    }

    const now = Date.now()
    const remaining = Math.ceil((info.expired - now) / (1000 * 60 * 60 * 24))
    const totalDays = info.addedAt ? Math.ceil((info.expired - info.addedAt) / (1000 * 60 * 60 * 24)) : '?'
    const user = db.getUser(jid)

    const lines = [
      `User: @${targetNumber}`,
      `Nama: ${info.name || 'Unknown'}`,
      `Mulai: ${info.addedAt ? formatDate(info.addedAt) : 'Unknown'}`,
      `Expired: ${formatDate(info.expired)}`,
      `Durasi: ${totalDays} hari`,
      `Sisa: ${remaining > 0 ? remaining + ' hari' : 'Expired'}`,
    ];
    if (user) {
        lines.push(`Energi: ${user.energi === -1 ? '∞' : (user.energi ?? 0)}`);
        lines.push(`Koin: ${user.koin === -1 ? '∞' : (user.koin ?? 0).toLocaleString('id-ID')}`);
    }

    await m.reply(raraWrap("Cek Partner", lines), { mentions: [jid] });
}

export { pluginConfig as config, handler }