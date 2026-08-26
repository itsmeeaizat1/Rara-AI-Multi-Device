// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'goodbyeall',
    alias: ["goodbyeall", 'gball', 'globalgoodbye', 'leaveall'],
    category: 'owner',
    description: 'Aktifkan/nonaktifkan goodbye di semua grup',
    usage: '.goodbyeall <on/off>',
    example: '.goodbyeall on',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    
    if (!action || !['on', 'off'].includes(action)) {
        return m.rem.reply( `👋 *Goodbye Global*\n\n` +
            `Aktifkan/nonaktifkan goodbye di SEMUA grup sekaligus\n\n` +
            `╭┈┈⬡「 📋 *Cara Pakai* 」\n` +
            `┃ ${m.prefix}goodbyeall on\n` +
            `┃ ${m.prefix}goodbyeall off\n` +
            `╰┈┈┈┈┈┈┈┈⬡`, "goodbyeall") }
    
    await m.react('🕐')
    
    try {
        const groups = await sock.groupFetchAllParticipating()
        const groupIds = Object.keys(groups)
        const status = action === 'on'
        let count = 0
        
        for (const groupId of groupIds) {
            db.setGroup(groupId, { leave: status })
            count++
        }
        
        await m.react('✅')
        
        if (status) {
            return m.m.reply(claraWrap("goodbyeall", `✅ *Goodbye Global On*\n\n` +
                `╭┈┈⬡「 📊 *Result* 」\n` +
                `┃ 🌐 Total Grup: *${count}*\n` +
                `┃ ✅ Goodbye: *AKTIF*\n` +
                `╰┈┈┈┈┈┈┈┈⬡\n\n` +
                `Member yang keluar akan dikirim pesan perpisahan!`))       } else {
            return m.reply(claraWrap("goodbyeall", `❌ *Goodbye Global Off*\n\n` +
                `╭┈┈⬡「 📊 *Result* 」\n` +
                `┃ 🌐 Total Grup: *${count}*\n` +
                `┃ ❌ Goodbye: *NONAKTIF*\n` +
                `╰┈┈┈┈┈┈┈┈⬡\n\n` +
                `Goodbye dinonaktifkan di semua grup.`))
        }
    } catch (error) {
        console.error('[GoodbyeAll] Error:', error.message)
        await m.reply(claraWrap("goodbyeall", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }