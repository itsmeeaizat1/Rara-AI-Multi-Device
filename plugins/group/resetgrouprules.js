// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from '../../src/lib/rara-database.js'
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
    
    m.reply(raraWrap("Grup Rules Direset", 
        `Rules grup berhasil direset ke default!\n` +
        `Ketik \`${m.prefix}rulesgrup\` untuk melihat.`))
}

export { pluginConfig as config, handler }