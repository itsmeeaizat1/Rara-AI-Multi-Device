// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'buyenergi',
    alias: ['belienergi', 'purchaseenergi', 'buyenergy'],
    category: 'user',
    description: 'Beli energi dengan koin (1 energi = 100 koin)',
    usage: '.buyenergi <jumlah>',
    example: '.buyenergi 10',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const PRICE_PER_ENERGI = 100

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const amount = parseInt(m.args[0]) || 0
    
    if (amount <= 0) {
        const user = db.getUser(m.sender) || db.setUser(m.sender)
        
        return sendReplyWithNav(sock, m, claraWrap("Buy Energi", `🛒 *Buy Energi*\n\n` +
            `╭┈┈⬡「 💰 *Info* 」\n` +
            `┃ 💵 Harga: *${PRICE_PER_ENERGI}* koin/energi\n` +
            `┃ 💰 Koin Kamu: *${formatNumber(user.koin || 0)}*\n` +
            `╰┈┈⬡\n\n` +
            `Gunakan: \`.buyenergi <jumlah>\`\n\n` +
            `\`Contoh: ${m.prefix}buyenergi 10\``), "buyenergi")
    }
    
    const totalPrice = amount * PRICE_PER_ENERGI
    const user = db.getUser(m.sender) || db.setUser(m.sender)
    
    if ((user.koin || 0) < totalPrice) {
        return sendReplyWithNav(sock, m, claraWrap("Gagal", `❌ *Gagal*\n\n` +
            `Koin tidak cukup!\n` +
            `Butuh: *${formatNumber(totalPrice)}*\n` +
            `Kamu punya: *${formatNumber(user.koin || 0)}*`), "buyenergi")
    }
    
    db.updateKoin(m.sender, -totalPrice)
    
    if (user.energi === -1) {
        m.react('✅')
        return m.reply(claraWrap("Pembelian Berhasil", `✅ *Pembelian Berhasil*\n\n` +
            `Tapi kamu sudah punya unlimited energi!\n` +
            `Koin dikembalikan.`))
    }
    
    const newEnergi = db.updateEnergi(m.sender, amount)
    const newKoin = db.getUser(m.sender).koin
    
    m.react('✅')
    
    await sendReplyWithNav(sock, m, claraWrap("Pembelian Berhasil", `✅ *Pembelian Berhasil*\n\n` +
        `╭┈┈⬡「 📋 *Detail* 」\n` +
        `┃ ⚡ Energi: *+${formatNumber(amount)}*\n` +
        `┃ 💵 Harga: *-${formatNumber(totalPrice)}* koin\n` +
        `╰┈┈⬡\n\n` +
        `╭┈┈⬡「 💰 *sAldo* 」\n` +
        `┃ ⚡ Energi: *${formatNumber(newEnergi)}*\n` +
        `┃ 💰 Koin: *${formatNumber(newKoin)}*\n` +
        `╰┈┈⬡`), "buyenergi")
}

export { pluginConfig as config, handler }