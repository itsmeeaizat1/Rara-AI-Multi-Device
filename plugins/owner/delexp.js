// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'delexp',
    alias: ["delexp"],
    category: 'owner',
    description: 'Kurangi exp user',
    usage: '.delexp <jumlah> @user',
    example: '.delexp 5000 @user',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

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
    const amount = parseInt(numArg) || 0
    
    let targetJid = await extractTarget(m)
    
    if (!targetJid && amount > 0) {
        targetJid = m.sender
    }
    
    if (!targetJid || amount <= 0) {
        return m.reply( `⭐ *Del Exp*\n\n` +
            `\`.delexp <jumlah>\` - dari diri sendiri\n` +
            `\`.delexp <jumlah> @user\` - dari user\n\n` +
            `\`Contoh: ${m.prefix}delexp 5000\``, "delexp")
    }
    
    if (amount <= 0) {
        return m.reply(claraWrap("Delexp", `❌ *Gagal*\n\nJumlah harus lebih dari 0`))
    }
    
    const user = db.getUser(targetJid)
    
    if (!user) {
        return m.reply(claraWrap("Delexp", `❌ *Gagal*\n\nUser tidak ditemukan di database`))
    }
    
    const newExp = db.updateExp(targetJid, -amount)
    
    await m.react('✅')
    
    await m.reply(claraWrap("delexp", `✅ *Exp Dikurangi*\n\n` +
        `╭┈┈⬡「 📋 *Detail* 」\n` +
        `┃ 👤 User: @${targetJid.split('@')[0]}\n` +
        `┃ ➖ Kurang: *-${formatNumber(amount)}*\n` +
        `┃ ⭐ sIsa: *${formatNumber(newExp)}*\n` +
        `╰┈┈⬡`))
}

export { pluginConfig as config, handler }