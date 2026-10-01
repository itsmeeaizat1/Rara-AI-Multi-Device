// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'setlimitdefault',
    alias: ["setlimitdefault"],
    category: 'owner',
    description: 'Set default limit untuk user baru',
    usage: '.setlimitdefault <jumlah>',
    example: '.setlimitdefault 50',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const args = m.args || []
    const newLimit = parseInt(args[0])
    
    if (!args[0] || isNaN(newLimit)) {
        const db = getDatabase()
        const currentDefault = db.setting('defaultLimit') || config.limits?.default || 25
        
        return m.reply(novaGuide(
            "setlimitdefault",
            `Limit default saat ini: ${currentDefault}`,
            `${m.prefix}setlimitdefault 50`,
            "Range 1 - 1000"
        ))
    }
    
    if (newLimit < 1 || newLimit > 1000) {
        { const __navText = `❌ *Gagal*\n\nLimit harus antara 1 - 1000`; return await m.reply(novaWrap("setlimitdefault", __navText)); }
    }
    
    const db = getDatabase()
    db.setting('defaultLimit', newLimit)
    
    await m.reply(novaWrap("Berhasil", 
        `Default limit diubah menjadi: \`${newLimit}\`\n` +
        `User baru akan mendapat limit ini`))
}

export { pluginConfig as config, handler }