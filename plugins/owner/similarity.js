// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'similarity',
    alias: ["similarity"],
    category: 'owner',
    description: 'Mengaktifkan/menonaktifkan fitur similarity (saran typo)',
    usage: '.similarity <on/off>',
    example: '.similarity on',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args
    
    if (!args[0]) {
        return m.reply(`⚠️ *Cara Pakai*\n\n\`.similarity on\` - Aktifkan\n\`.similarity off\` - Matikan`)
    }
    
    const mode = args[0].toLowerCase()
    
    if (mode === 'on') {
        db.setting('similarity', true)
        await m.reply(raraWrap("Similarity", `✅ *sUkses*\n\nFitur similarity command *DIAKTIFKAN*`))
    } else if (mode === 'off') {
        db.setting('similarity', false)
        await m.reply(raraWrap("Similarity", `✅ *sUkses*\n\nFitur similarity command *DIMATIKAN*`))
    } else {
        { const __navText = `⚠️ *Cara Pakai*\n\n\`.similarity on\` - Aktifkan\n\`.similarity off\` - Matikan`; return await m.reply(__navText); }
    }
    
    await db.save()
}

export { pluginConfig as config, handler }