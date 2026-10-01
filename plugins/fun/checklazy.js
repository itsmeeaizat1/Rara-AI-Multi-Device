// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekmalas',
    alias: ["cekmalas"],
    category: "fun",
    description: 'Cek seberapa malas kamu',
    usage: '.cekmalas <nama>',
    example: '.cekmalas Budi',
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
        desc = 'SUPER MALAS! Raja rebahan! 🛏️'
    } else if (percent >= 70) {
        desc = 'Malas banget! 😴'
    } else if (percent >= 50) {
        desc = 'Lumayan malas 🥱'
    } else if (percent >= 30) {
        desc = 'Sedikit malas 😊'
    } else {
        desc = 'Rajin banget! 💪'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "malas",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kemalasan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kemalasan @${mentioned.split('@')[0]}`,
         `Tingkat kemalasan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekmalas", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }