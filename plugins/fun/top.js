// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
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
        return m.reply(raraWrap("topfun", `\`Contoh: ${m.prefix}top orang pintar\``, "guide"), "top")
    }
    try {
    await m.react("🕒");
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        
        const members = participants
            .map(p => p.jid)
            .filter(id => id && id !== sock.user?.id?.split(':')[0] + '@s.whatsapp.net')
        
        if (members.length < 2) {
            return m.reply(raraWrap("Top", `❌ Member grup kurang dari 5 orang!`))
        }
        
        const shuffled = members.sort(() => Math.random() - 0.5)
        const top5 = shuffled.slice(0, 5)
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
        let list = ''
        
        top5.forEach((jid, index) => {
            list += `*${index + 1}* ${medals[index]} @${jid.split('@')[0]}\n`
        })
        
        await m.react("🐣");
        await m.reply(raraWrap("Top", `🏆 *Top 5 ${kategori.toUpperCase()}*\n${list}`))
    } catch (error) {
    await m.react("❌");
        m.reply(raraWrap("topfun", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }