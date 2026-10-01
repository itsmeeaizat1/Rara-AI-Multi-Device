// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import te from '../../src/lib/nova-error.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'delpremall',
    alias: ["delpremall"],
    category: 'owner',
    description: 'Menghapus semua member grup dari premium',
    usage: '.delpremall — hapus SEMUA member grup ini dari premium',
    example: '.delpremall',
    example: '.delprem all',
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
            return m.reply(novaWrap("Delpremall", `❌ *Gagal*\n\nTidak ada member di grup ini`))
        }
        const db = getDatabase()
        if (!db.data.premium) db.data.premium = []
        
        let removedCount = 0
        let notPremCount = 0
        
        for (const participant of participants) {
            const number = participant.jid?.replace(/[^0-9]/g, '') || ''
            if (!number) continue
            
            // FIX: entri premium bisa string (lama) atau objek {id, expired} —
            // indexOf cuma match string, objek gak pernah kehapus diam-diam.
            const index = db.data.premium.findIndex(p => typeof p === "string" ? p === number : p.id === number)
            
            if (index === -1) {
                notPremCount++
                continue
            }
            
            db.data.premium?.splice(index, 1)
            const jid = number + '@s.whatsapp.net'
            const user = db.getUser(jid)
            if (user) {
                user.isPremium = false
                db.setUser(jid, user)
            }
            
            removedCount++
        }
        
        db.save()
        
        
        await m.reply(`🗑️ *Del Premium All*\n\n` +
            `👥 Total Member: \`${participants.length}\`\n` +
            `✅ Dihapus: \`${removedCount}\`\n` +
            `⏭️ Bukan Premium: \`${notPremCount}\`\n` +
            `💎 sIsa Premium: \`${db.data.premium.length}\`\n` +
            `\n` +
            `Grup: ${groupMeta.subject}`)
        
    } catch (error) {
        await m.reply(novaWrap("delpremall", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }