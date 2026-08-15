import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import { DEFAULT_INTRO } from './intro.js'
const pluginConfig = {
    name: 'resetintro',
    alias: ['introdel', 'delintro', 'deleteintro'],
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
        { const __navText = claraWrap("resetintro", `❌ Grup ini sudah menggunakan intro default!`); return await m.reply(__navText); }
    }
    
    delete groupData.intro
    db.setGroup(m.chat, groupData)
    db.save()
    
    await m.reply(
        `✅ *ɪɴᴛʀᴏ ᴅɪʀᴇsᴇᴛ!*\n` +
        `Intro grup dikembalikan ke default.\n\n` +
        `Ketik *${m.prefix}intro* untuk melihat hasilnya.`
    )
}

export { pluginConfig as config, handler }