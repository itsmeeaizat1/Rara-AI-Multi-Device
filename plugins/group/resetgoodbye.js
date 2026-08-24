// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'resetgoodbye',
    alias: ['delgoodbye', 'cleargoodbye'],
    category: 'group',
    description: 'Reset goodbye message ke default',
    usage: '.resetgoodbye',
    example: '.resetgoodbye',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat)
    
    if (!groupData?.goodbyeMsg) {
        return m.reply(claraWrap("Resetgoodbye", `❌ *ɢᴀɢᴀʟ*\n\nGoodbye message sudah default`))
    }
    
    db.setGroup(m.chat, { goodbyeMsg: null })
    
    m.react('✅')
    
    { const __navText = claraWrap("Goodbye Direset", `✅ *ɢᴏᴏᴅʙʏᴇ ᴅɪʀᴇꜱᴇᴛ*\nKembali ke pesan default`); await m.reply(__navText); }
}

export { pluginConfig as config, handler }