// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekganteng',
    alias: ["cekganteng"],
    category: "fun",
    description: 'Cek seberapa ganteng kamu',
    usage: '.cekganteng <nama>',
    example: '.cekganteng Budi',
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
        desc = 'Ganteng maksimal! 😍🔥'
    } else if (percent >= 70) {
        desc = 'Ganteng banget! 😎'
    } else if (percent >= 50) {
        desc = 'Lumayan ganteng~ 👍'
    } else if (percent >= 30) {
        desc = 'Biasa aja sih 😅'
    } else {
        desc = 'Mungkin inner beauty? 🤭'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "ganteng",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kegantengan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kegantengan @${mentioned.split('@')[0]}`,
         `Tingkat kegantengan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekganteng", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }