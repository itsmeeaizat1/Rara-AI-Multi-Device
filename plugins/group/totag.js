// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "totag",
    alias: ["totag"],
    category: 'group',
    description: 'Tag semua member dengan reply pesan',
    usage: '.totag (reply pesan)',
    example: '.totag',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}

async function handler(m, { sock }) {
    if (!m.quoted) {
        return m.reply(novaGuide("Totag", "Reply pesan yang ingin di-forward dan di-tag ke semua member!", `${m.prefix || "."}totag`))
    }
    
    
    try {
        const participants = m.groupMembers || []
        
        if (!participants || participants.length === 0) {
            return await m.reply(novaEmpty("Totag", "Gagal mendapatkan data member grup nih."));
        }
        
        const users = participants
            .map(u => u.id || u.jid || u)
            .filter(v => v && v !== sock.user?.jid && v !== sock.user?.id)
        
        await sock.sendMessage(m.chat, {
            forward: m.quoted.fakeObj || m.quoted,
            mentions: users
        })
    } catch (err) {
        m.reply(novaError("Totag", `Gagal melakukan totag: ${err.message || "terjadi kesalahan"}`))
    }
}

export { pluginConfig as config, handler }