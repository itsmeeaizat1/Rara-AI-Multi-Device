// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'cekprem',
    alias: ["cekprem"],
    category: "fun",
    description: 'Cek detail status premium user',
    usage: '.cekprem @user',
    example: '.cekprem',
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
    if (!db.data.premium) db.data.premium = []

    const premData = db.data.premium.find(p =>
        typeof p === 'string' ? p === targetNumber : p.id === targetNumber
    )
    const jid = targetNumber + '@s.whatsapp.net'
    const isConfigPrem = config.isPremium(targetNumber)
    const isConfigOwner = config.isOwner(targetNumber)

    if (!premData && !isConfigPrem && !isConfigOwner) {
        return m.reply(raraWrap("Cekprem", `❌ @${targetNumber} bukan premium`))
    }

    const user = db.getUser(jid)
    const now = Date.now()

    const lines = [`User: @${targetNumber}`];

    if (isConfigOwner) {
        lines.push('Role: Owner (Permanent)');
    } else if (typeof premData === 'string' || !premData?.expired) {
        lines.push('Role: Premium (Permanent)');
    } else {
        const remaining = Math.ceil((premData.expired - now) / (1000 * 60 * 60 * 24))
        const totalDays = premData.addedAt ? Math.ceil((premData.expired - premData.addedAt) / (1000 * 60 * 60 * 24)) : '?'
        lines.push(`Nama: ${premData.name || 'Unknown'}`)
        lines.push(`Mulai: ${premData.addedAt ? formatDate(premData.addedAt) : 'Unknown'}`)
        lines.push(`Expired: ${formatDate(premData.expired)}`)
        lines.push(`Durasi: ${totalDays} hari`)
        lines.push(`Sisa: ${remaining > 0 ? remaining + ' hari' : 'Expired'}`)
    }

    if (user) {
        lines.push(`Energi: ${user.energi === -1 ? '∞' : (user.energi ?? 0)}`)
        lines.push(`Koin: ${user.koin === -1 ? '∞' : (user.koin ?? 0).toLocaleString('id-ID')}`)
        lines.push(`Exp: ${(user.exp ?? 0).toLocaleString('id-ID')}`)
        lines.push(`Level: ${user.level ?? 1}`)
    }

    await m.reply(raraWrap("Cek Premium", lines), { mentions: [jid] });
}

export { pluginConfig as config, handler }