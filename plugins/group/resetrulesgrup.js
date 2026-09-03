// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'resetrulesgrup',
    alias: ["resetrulesgrup"],
    category: 'group',
    description: 'Reset rules grup ke default (admin only)',
    usage: '.resetrulesgrup',
    example: '.resetrulesgrup',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const db = getDatabase()
    
    db.setGroup(m.chat, { groupRules: null })
    
    m.reply(claraWrap("Grup Rules Direset", 
        `Rules grup berhasil direset ke default!\n` +
        `Ketik \`${m.prefix}rulesgrup\` untuk melihat.`))
}

export { pluginConfig as config, handler }