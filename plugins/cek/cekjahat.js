// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekjahat',
    alias: ["cekjahat"],
    category: 'cek',
    description: 'Cek seberapa jahat kamu',
    usage: '.cekjahat <nama>',
    example: '.cekjahat Budi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
        const percent = Math.floor(Math.random() * 101)
    const mentioned = m.mentionedJid[0] || m.sender
                    
    let desc = ''
    if (percent >= 90) {
        desc = 'VILLAIN LEVEL! 😈👿'
    } else if (percent >= 70) {
        desc = 'Jahat banget! 💀'
    } else if (percent >= 50) {
        desc = 'Lumayan jahat 😏'
    } else if (percent >= 30) {
        desc = 'Sedikit nakal 😊'
    } else {
        desc = 'Baik kok, gak jahat! 😇'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "jahat",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender ? `Hai @${mentioned.split('@')[0]}
    
Tingkat kejahatan kamu *${percent}%*
\`\`\`${desc}\`\`\`` : `Kamu ingin ngecek tingkat kejahatan @${mentioned.split('@')[0]} yak? 
    
Tingkat kejahatan dia sebesar *${percent}%*
\`\`\`${desc}\`\`\``
    
    await m.reply(claraWrap("cekjahat", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }