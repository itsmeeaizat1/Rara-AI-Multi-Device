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
        return m.reply( `📝 *ᴀᴅᴅ ᴛᴏxɪᴄ*\n\n` +
            `Gunak{ const __navText = ` +
            `\`Contoh: ${m.prefix}addtoxic katakasar\``, "addtoxic")
    }
    
    if (word.length < 2) {
        return m.reply(claraWrap("Addtoxic", `❌ *ɢᴀɢᴀʟ*\n\nKata terlalu pendek (min 2 huruf)`))
    }
    
    if (word.length > 30) {
        return m.reply(claraWrap("Addtoxic", `❌ *; return await m.reply(__navText); }Agal*\n\nKata terlalu panjang (max 30 huruf)`))
    }
    
    const groupData = db.getGroup(m.chat) || {}
    const toxicWords = groupData.toxicWords || []
    
    if (toxicWords.includes(word)) {
        { const __navText = `❌ *ɢᴀɢᴀʟ*\n\nKata \`${word}\` sudah ada di daftar`; return await m.reply(__navText); }
    }
    
    toxicWords.push(word)
    db.setGroup(m.chat, { toxicWords })
    
    m.react('✅')
    
    await m.reply(
        `✅ *ᴋᴀᴛᴀ ᴛᴏxɪᴄ ᴅɪᴛᴀᴍʙᴀʜ*\n\n` +
        `╭──「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `│ 📝 Kata: \`${word}\`\n` +
        `│ 📊 Total: \`${toxicWords.length}\` kata\n` +
        `╰──────────❀`
    )
}

export { pluginConfig as config, handler }