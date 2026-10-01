// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'welcomeall',
    alias: ["welcomeall"],
    category: 'owner',
    description: 'Aktifkan/nonaktifkan welcome di semua grup',
    usage: '.welcomeall <on/off>',
    example: '.welcomeall on',
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
        return m.reply(novaCaption({
  emoji: "👑",
  name: "welcomeall",
  description: "Aktifkan/nonaktifkan welcome di semua grup",
  usage: `${m.prefix}welcomeall <on/off>`,
  example: `${m.prefix}welcomeall on`,
}), "welcomeall");
    }
    try {
        const groups = await sock.groupFetchAllParticipating()
        const groupIds = Object.keys(groups)
        const status = action === 'on'
        let count = 0
        
        for (const groupId of groupIds) {
            db.setGroup(groupId, { welcome: status })
            count++
        }
        if (status) {
            return m.reply(novaWrap("welcomeall", `✅ *Welcome Global On*\n\n` +
                "" +
                `🌐 Total Grup: *${count}*\n` +
                `✅ Welcome: *AKTIF*\n` +
                `---\n\n` +
                `Semua member baru akan disambut otomatis!`))       } else {
            return m.reply(novaWrap("welcomeall", `❌ *Welcome Global Off*\n\n` +
                "" +
                `🌐 Total Grup: *${count}*\n` +
                `❌ Welcome: *NONAKTIF*\n` +
                `---\n\n` +
                `Welcome dinonaktifkan di semua grup.`))
        }
    } catch (error) {
        console.error('[WelcomeAll] Error:', error.message)
        await m.reply(novaWrap("welcomeall", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }