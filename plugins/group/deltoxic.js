// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from '../../src/lib/rara-database.js'
const pluginConfig = {
    name: 'deltoxic',
    alias: ["deltoxic"],
    category: 'group',
    description: 'Hapus kata toxic dari daftar',
    usage: '.deltoxic <kata>',
    example: '.deltoxic kata_kasar',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const word = m.args.join(' ').trim().toLowerCase()
    
    if (!word) {
        return m.reply( raraWrap("Del Toxic", 
            `Gunakan: \`.deltoxic <kata>\`\n\n` +
            `\`Contoh: ${m.prefix}deltoxic katakasar\``), "deltoxic")
    }
    
    const groupData = db.getGroup(m.chat) || {}
    const toxicWords = groupData.toxicWords || []
    
    const index = toxicWords.indexOf(word)
    
    if (index === -1) {
        { const __navText = `❌ *gagal*\n\nKata \`${word}\` tidak ada di daftar`; return await m.reply(raraWrap("deltoxic", __navText)); }
    }
    
    toxicWords.splice(index, 1)
    db.setGroup(m.chat, { toxicWords })
    await m.reply(raraWrap("Kata Toxic Dihapus", `` +
        "" +
        `📝 Kata: \`${word}\`\n` +
        `📊 sIsa: \`${toxicWords.length}\` kata\n` +
        ""))
}

export { pluginConfig as config, handler }