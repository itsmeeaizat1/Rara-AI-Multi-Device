// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: "cekhoki",
    alias: ["cekhoki"],
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

async function handler(m, { sock, config: botConfig }) {
        const percent = Math.floor(Math.random() * 101)
    const mentioned = m.mentionedJid[0] || m.sender
                    
    let desc = ''
    if (percent >= 90) {
        desc = 'HOKI DEWA! Main gacha pasti menang! 🍀'
    } else if (percent >= 70) {
        desc = 'Hoki banget! 🎰'
    } else if (percent >= 50) {
        desc = 'Lumayan hoki 🍀'
    } else if (percent >= 30) {
        desc = 'Sedikit hoki 😊'
    } else {
        desc = 'Sabar ya, lagi apes 😅'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "hoki",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kehokian kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kehokian @${mentioned.split('@')[0]}`,
         `Tingkat kehokian dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await m.reply(claraWrap("cekhoki", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }