// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "topfun",
    alias: ["topfun", "top"],
    category: 'fun',
    description: 'Random top 5 member untuk kategori tertentu',
    usage: '.top <kategori>',
    example: '.top orang pintar',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const kategori = m.args.join(' ')?.trim()
    
    if (!kategori) {
        return m.reply(`\`Contoh: ${m.prefix}top orang pintar\``, "top")
    }
    
    m.react('🕐')
    
    try {
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        
        const members = participants
            .map(p => p.jid)
            .filter(id => id && id !== sock.user?.id?.split(':')[0] + '@s.whatsapp.net')
        
        if (members.length < 2) {
            return m.reply(claraWrap("Top", `❌ Member grup kurang dari 5 orang!`))
        }
        
        const shuffled = members.sort(() => Math.random() - 0.5)
        const top5 = shuffled.slice(0, 5)
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
        let list = ''
        
        top5.forEach((jid, index) => {
            list += `*${index + 1}* ${medals[index]} @${jid.split('@')[0]}\n`
        })
        
        await m.reply(claraWrap("Top", `🏆 *Top 5 ${kategori.toUpperCase()}*\n${list}`))
        m.react('✅')
    } catch (error) {
        m.reply(claraWrap("topfun", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }