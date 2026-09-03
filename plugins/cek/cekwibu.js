// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekwibu',
    alias: ["cekwibu"],
    category: 'cek',
    description: 'Cek seberapa wibu kamu',
    usage: '.cekwibu <nama>',
    example: '.cekwibu Budi',
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
        desc = 'WIBU SEJATI! Ara ara~ 🎌'
    } else if (percent >= 70) {
        desc = 'Wibu parah! Kimochi~ 😍'
    } else if (percent >= 50) {
        desc = 'Lumayan wibu'
    } else if (percent >= 30) {
        desc = 'Sedikit wibu 😊'
    } else {
        desc = 'Bukan wibu, normal! 😎'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "wibu",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kewibuan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kewibuan @${mentioned.split('@')[0]}`,
         `Tingkat kewibuan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await m.reply(claraWrap("cekwibu", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }