// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
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
        return m.reply(
            `📢 *ᴛᴏᴛᴀɢ*\n\n` +
            `Reply pesan yang ingin di-forward ke semua member\n\n` +
            `Contoh: Reply pesan lalu ketik \`${m.prefix}totag\``
        )
    }
    
    
    try {
        const participants = m.groupMembers || []
        
        if (!participants || participants.length === 0) {
            { const __navText = claraWrap("totag", `❌ Gagal mendapatkan data member grup`); return await m.reply(__navText); }
        }
        
        const users = participants
            .map(u => u.id || u.jid || u)
            .filter(v => v && v !== sock.user?.jid && v !== sock.user?.id)
        
        await sock.sendMessage(m.chat, {
            forward: m.quoted.fakeObj || m.quoted,
            mentions: users
        })
        
        m.react('✅')
        
    } catch (err) {
        m.reply(claraWrap("totag", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }