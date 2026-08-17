// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { notifyPremiumAdd } from "../../src/lib/nova-saluran-broadcast.js";
const pluginConfig = {
    name: 'addpremall',
    alias: ['addpremiumall', 'setpremall'],
    category: 'owner',
    description: 'Menambahkan semua member grup ke premium',
    usage: '.addprem all',
    example: '.addprem all',
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        
        if (participants.length === 0) {
            return m.reply(claraWrap("Addpremall", `❌ *Gagal*\n\n> Tidak ada member di grup ini`))
        }
        
        await m.react('🕐')
        
        const db = getDatabase()
        if (!db.data.premium) db.data.premium = []
        
        let addedCount = 0
        let alreadyPremCount = 0
        
        for (const participant of participants) {
            const number = participant.jid?.replace(/[^0-9]/g, '') || ''
            
            if (!number) continue
            
            if (db.data.premium.includes(number)) {
                alreadyPremCount++
                continue
            }  
            db.data.premium.push(number)
            
            const jid = number + '@s.whatsapp.net'
            const premLimit = config.limits?.premium || 100
            const user = db.getUser(jid) || db.setUser(jid)
            
            user.energi = premLimit
            user.isPremium = true
            
            db.setUser(jid, user)
            db.updateExp(jid, 200000)
            db.updateKoin(jid, 20000)
            addedCount++
        }
        
        db.save()
        
        // Broadcast ke saluran WA - bulk premium
        if (addedCount > 0) {
          await notifyPremiumAdd(sock, {
            name: groupMeta.subject || "Bulk",
            phoneNumber: addedCount + " users",
            days: "30",
            price: "Bulk - " + addedCount + " users",
            expiredStr: "30 hari",
            isExtend: false,
            totalPremium: db.data.premium.length,
          }).catch(() => {});
        }
        
        await m.reply(`💎 *Add Premium All*\n\n` +
            `╭┈┈⬡「 📋 *Hasil* 」\n` +
            `┃ 👥 Total Member: \`${participants.length}\`\n` +
            `┃ ✅ Ditambahkan: \`${addedCount}\`\n` +
            `┃ ⏭️ sUdah Premium: \`${alreadyPremCount}\`\n` +
            `┃ 💎 Total Premium: \`${db.data.premium.length}\`\n` +
            `╰┈┈⬡\n\n` +
            `Grup: ${groupMeta.subject}`)
        
    } catch (error) {
        await m.reply(claraWrap("addpremall", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }