// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'resetwelcome',
    alias: ["resetwelcome"],
    category: 'group',
    description: 'Reset welcome message ke default',
    usage: '.resetwelcome',
    example: '.resetwelcome',
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
    
    if (!groupData?.welcomeMsg) {
        return m.reply(claraWrap("Resetwelcome", `❌ *ɢᴀɢᴀʟ*\n\nWelcome message sudah default`))
    }
    
    db.setGroup(m.chat, { welcomeMsg: null })
    { const __navText = claraWrap("Welcome Direset", `Kembali ke pesan default`); await m.reply(__navText); }
}

export { pluginConfig as config, handler }