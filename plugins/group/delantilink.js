// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaWrap, novaLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'delantilink',
    alias: ["delantilink"],
    category: 'group',
    description: 'Menghapus link dari daftar antilink',
    usage: '.delantilink <domain/pattern>',
    example: '.delantilink tiktok.com',
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
    const link = m.args.join(' ')?.trim()?.toLowerCase()
    
    if (!link) {
        const groupData = db.getGroup(m.chat) || {}
        const antilinkList = groupData.antilinkList || []
        
        if (antilinkList.length === 0) {
            return m.reply(novaEmpty('DelAntiLink', 'Daftar antilink di grup ini masih kosong nih!'))
        }
        
        let txt = `🔗 *daftar antilink*\n\n`
        antilinkList.forEach((l, i) => {
            txt += `${i + 1}. \`${l}\`\n`
        })
        txt += `\nTotal: *${antilinkList.length}* link`
        txt += `\n\n\`${m.prefix}delantilink <domain>\` untuk hapus`
        
        return m.reply( txt, "delantilink")
    }
    
    const groupData = db.getGroup(m.chat) || {}
    const antilinkList = groupData.antilinkList || []
    
    const index = antilinkList.findIndex(l => l === link)
    
    if (index === -1) {
        return m.reply(novaEmpty('DelAntiLink', `Link \`${link}\` tidak ditemukan di daftar antilink!`))
    }
    
    antilinkList.splice(index, 1)
    db.setGroup(m.chat, { antilinkList })
    
    m.reply(novaWrap("Delantilink", `Link: \`${link}\`\nSisa: ${antilinkList.length} link`, "success"))
}

export { pluginConfig as config, handler }