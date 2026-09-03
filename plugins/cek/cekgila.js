// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekgila',
    alias: ["cekgila"],
    category: 'cek',
    description: 'Cek seberapa gila kamu',
    usage: '.cekgila <nama>',
    example: '.cekgila Budi',
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
        desc = 'GILA BENERAN! Masuk RSJ! 🤪'
    } else if (percent >= 70) {
        desc = 'Hampir gila 😵'
    } else if (percent >= 50) {
        desc = 'Lumayan waras 😅'
    } else if (percent >= 30) {
        desc: 'Normal kok 🙂'
    } else {
        desc = 'Waras banget! 😇'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "gila",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kegilaan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kegilaan @${mentioned.split('@')[0]}`,
         `Tingkat kegilaan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await m.reply(claraWrap("cekgila", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }