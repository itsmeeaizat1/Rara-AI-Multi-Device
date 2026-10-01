// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from '../../src/lib/rara-database.js'
import { DEFAULT_INTRO } from './intro.js'
const pluginConfig = {
    name: 'resetintro',
    alias: ["resetintro"],
    category: 'group',
    description: 'Reset intro grup ke default (admin only)',
    usage: '.resetintro',
    example: '.resetintro',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || db.setGroup(m.chat)
    
    if (!groupData.intro) {
        { const __navText = raraWrap("resetintro", `Grup ini sudah menggunakan intro default!`, "error"); return await m.reply(__navText); }
    }
    
    delete groupData.intro
    db.setGroup(m.chat, groupData)
    db.save()
    
    await m.reply(
        `✅ *Intro Direset!*\n` +
        `Intro grup dikembalikan ke default.\n\n` +
        `Ketik *${m.prefix}intro* untuk melihat hasilnya.`
    )
}

export { pluginConfig as config, handler }