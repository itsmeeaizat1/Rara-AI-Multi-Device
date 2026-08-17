// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'addantilink',
    alias: ['addalink', 'addblocklink'],
    category: 'group',
    description: 'Menambah link ke daftar antilink',
    usage: '.addantilink <domain/pattern>',
    example: '.addantilink tiktok.com',
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
    const link = m.text?.toLowerCase()
    
    if (!link) {
        return sendReplyWithNav(sock, m, `🔗 *Add Antilink*\n\n` +
            `Masukkan domain/pattern link yang ingin diblokir\n\n` +
            `\`Contoh:\`\n` +
            `\`${m.prefix}addantilink tiktok.com\`\n` +
            `\`${m.prefix}addantilink chat.whatsapp.com\`\n` +
            `\`${m.prefix}addantilink instagram.com\``, "addantilink")
    }
    
    const groupData = db.getGroup(m.chat) || {}
    const antilinkList = groupData.antilinkList || []
    
    if (antilinkList.includes(link)) {
        return m.reply(`⚠️ Link \`${link}\` sudah ada di daftar antilink!`)
    }
    
    antilinkList.push(link)
    db.setGroup(m.chat, { antilinkList })
    
    m.reply(claraWrap("Antilink Ditambah", [`Link: \`${link}\``, `Total: *${antilinkList.length}* link`, "", `Gunakan \`${m.prefix}listantilink\` untuk melihat daftar`].join("\n")))
}

export { pluginConfig as config, handler }