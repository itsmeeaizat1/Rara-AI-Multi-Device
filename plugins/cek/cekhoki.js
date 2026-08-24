// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "cekhoki",
    alias: ["cekhoki", "lucky2", "hoki"],
    category: 'cek',
    description: 'Cek seberapa hoki kamu',
    usage: '.cekhoki <nama>',
    example: '.cekhoki Budi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
        const percent = Math.floor(Math.random() * 101)
    const mentioned = m.mentionedJid[0] || m.sender
                    
    let desc = ''
    if (percent >= 90) {
        desc = 'HOKI DEWA! Main gacha pasti menang! 🍀✨'
    } else if (percent >= 70) {
        desc = 'Hoki banget! 🎰'
    } else if (percent >= 50) {
        desc = 'Lumayan hoki 🍀'
    } else if (percent >= 30) {
        desc = 'Sedikit hoki 😊'
    } else {
        desc = 'Sabar ya, lagi apes 😅'
    }
    
    let txt = mentioned === m.sender ? `Hai @${mentioned.split('@')[0]}
    
Tingkat kehokian kamu *${percent}%*
\`\`\`${desc}\`\`\`` : `Kamu ingin ngecek tingkat kehokian @${mentioned.split('@')[0]} yak? 
    
Tingkat kehokian dia sebesar *${percent}%*
\`\`\`${desc}\`\`\``
    
    await m.reply(claraWrap("cekhoki", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }