// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'addenergiall',
    alias: ["addenergiall"],
    category: 'owner',
    description: 'Menambahkan limit/energi ke semua member grup',
    usage: '.addenergiall <jumlah>',
    example: '.addenergiall 50',
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
        const amount = parseInt(m.args[0])
        
        if (isNaN(amount) || amount <= 0) {
            return m.reply(`⚠️ *Cara Pakai*\n\nMasukkan jumlah limit yang ingin ditambahkan.\n\n\`Contoh: ${m.prefix}addlimitall 50\``)
        }
        
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        
        if (participants.length === 0) {
            return m.reply(claraWrap("Addenergiall", `❌ *Gagal*\n\nTidak ada member di grup ini`))
        }
        
        await m.react('🕐')
        const db = getDatabase()
        let successCount = 0
        
        for (const participant of participants) {
            const number = participant.jid?.replace(/[^0-9]/g, '') || ''
            if (!number) continue
            const jid = number + '@s.whatsapp.net'
            db.updateEnergi(jid, amount)
            successCount++
        }

        const gb = m?.groupMetadata
        
        await db.save()
        await m.reply(claraWrap("Addenergiall", `✅ Berhasil menambahkan limit ke semua member ( Total *${successCount}* Member ) di grup *${gb?.subject}*`))
        
    } catch (error) {
        await m.reply(claraWrap("addenergiall", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }