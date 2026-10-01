// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'addtoxic',
    alias: ["addtoxic"],
    category: 'group',
    description: 'Tambah kata toxic ke daftar',
    usage: '.addtoxic <kata>',
    example: '.addtoxic kata_kasar',
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
        return m.reply(claraWrap("addtoxic", [
            "Tambah kata toxic ke daftar filter.",
            "",
            `📌 Format: ${m.prefix}addtoxic <kata>`,
            `💡 Contoh: ${m.prefix}addtoxic katakasar`,
        ]))
    }
    
    if (word.length < 2) {
        return m.reply(claraWrap("Addtoxic", `gagal\n\nKata terlalu pendek (min 2 huruf)`, "error"))
    }
    
    if (word.length > 30) {
        return m.reply(claraWrap("Addtoxic", `Kata terlalu panjang (max 30 huruf)`, "error"))
    }
    
    const groupData = db.getGroup(m.chat) || {}
    const toxicWords = groupData.toxicWords || []
    
    if (toxicWords.includes(word)) {
        { const __navText = `❌ *gagal*\n\nKata \`${word}\` sudah ada di daftar`; return await m.reply(__navText); }
    }
    
    toxicWords.push(word)
    db.setGroup(m.chat, { toxicWords })
    await m.reply(
        `✅ *kata toxic ditambah*\n\n` +
        "" +
        `📝 Kata: \`${word}\`\n` +
        `📊 Total: \`${toxicWords.length}\` kata\n` +
        ""
    )
}

export { pluginConfig as config, handler }