// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import * as levelHelper from '../../src/lib/nova-level.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'addexp',
    alias: ['tambahexp', 'giveexp', 'addxp'],
    category: 'owner',
    description: 'Tambah exp user (max 9 Miliar)',
    usage: '.addexp <jumlah> @user',
    example: '.addexp 10000 @user',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const MAX_EXP = 9000000000

function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function extractTarget(m) {
    if (m.quoted) return m.quoted.sender
    if (m.mentionedJid?.length) return m.mentionedJid[0]
    return null
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args
    
    const numArg = args.find(a => !isNaN(a) && !a.startsWith('@'))
    let amount = parseInt(numArg) || 0
    
    let targetJid = await extractTarget(m)
    
    if (!targetJid && amount > 0) {
        targetJid = m.sender
    }
    
    if (!targetJid || amount <= 0) {
        return sendReplyWithNav(sock, m, `⭐ *Add Exp*\n\n` +
            `\`.addexp <jumlah>\` - ke diri sendiri\n` +
            `\`.addexp <jumlah> @user\` - ke user\n` +
            `Max: 9.000.000.000 (9B)\n\n` +
            `\`Contoh: ${m.prefix}addexp 10000\``, "addexp")
    }
    
    if (amount <= 0) {
        return m.reply(claraWrap("Addexp", `❌ *Gagal*\n\n> Jumlah exp harus lebih dari 0`))
    }
    
    if (amount > MAX_EXP) {
        amount = MAX_EXP
    }
    
    const user = db.getUser(targetJid) || db.setUser(targetJid)
 
    await levelHelper.addExpWithLevelCheck(sock, m, db, user, amount)
    
    await m.react('✅')
    
    await m.reply(claraWrap("Addexp", `✅ Berhasil menambahkan exp *${formatNumber(amount)}* ke *@${targetJid.split('@')[0]}*`))
}

export { pluginConfig as config, handler }