import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'resetrules',
    alias: ['resetbotrules'],
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
    
    m.reply(claraWrap("ʙᴏᴛ ʀᴜʟᴇs ᴅɪʀᴇsᴇᴛ", `✅ *ʙᴏᴛ ʀᴜʟᴇs ᴅɪʀᴇsᴇᴛ*\n\n` +
        `> Rules bot berhasil direset ke default!\n` +
        `> Ketik \`${m.prefix}rules\` untuk melihat.`))
}

export { pluginConfig as config, handler }