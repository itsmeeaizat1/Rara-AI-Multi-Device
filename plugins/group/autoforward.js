// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'autoforward',
    alias: ['autofw', 'autofwd'],
    category: 'group',
    description: 'Auto forward pesan yang masuk ke grup ke grup ini',
    usage: '.autoforward <on/off>',
    example: '.autoforward on',
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
    const option = m.text?.toLowerCase()?.trim()
    const groupId = m.chat
    const group = db.getGroup(groupId) || {}
    
    if (!option) {
        const status = group.autoforward ? '✅ ON' : '❌ OFF'
        return sendReplyWithNav(sock, m, `🔄 *Auto Forward*\n\n` +
            `╭┈┈⬡「 📋 *Info* 」\n` +
            `┃   ┊  ➶ Status: *${status}*\n` +
            `╰┈┈⬡\n\n` +
            `Gunakan: \`${m.prefix}autoforward on/off\`\n\n` +
            `_Fitur ini akan meneruskan semua pesan ke grup ini_`, "autoforward")
    }
    
    if (option === 'on') {
        db.setGroup(groupId, { ...group, autoforward: true })
        m.react('✅')
        return m.reply(claraWrap("autoforward", `🔄 *Auto Forward*\n\n` +
            `╭┈┈⬡「 ✅ *Aktif* 」\n` +
            `┃   ┊  ➶ Status: *ON*\n` +
            `╰┈┈⬡\n\n` +
            `_Semua pesan akan di-forward_`))
    }
    
    if (option === 'off') {
        db.setGroup(groupId, { ...group, autoforward: false })
        return m.reply(
            `🔄 *Auto Forward*\n\n` +
            `╭┈┈⬡「 ❌ *Nonaktif* 」\n` +
            `┃   ┊  ➶ Status: *OFF*\n` +
            `╰┈┈⬡`
        )
    }
    
    return m.reply(claraWrap("Autoforward", `❌ Gunakan: on atau off`))
}

export { pluginConfig as config, handler }