// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from '../../src/lib/rara-database.js'
const pluginConfig = {
    name: 'resetrules',
    alias: ["resetrules"],
    category: 'owner',
    description: 'Reset rules bot ke default',
    usage: '.resetrules',
    example: '.resetrules',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const db = getDatabase()
    
    db.setting('botRules', null)
    
    m.reply(raraWrap("Bot Rules Direset", 
        `Rules bot berhasil direset ke default!\n` +
        `Ketik \`${m.prefix}rules\` untuk melihat.`))
}

export { pluginConfig as config, handler }