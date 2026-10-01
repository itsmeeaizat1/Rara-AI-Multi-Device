// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'ceklapar',
    alias: ["ceklapar"],
    category: "fun",
    description: 'Cek tingkat kelaparan kamu',
    usage: '.ceklapar <nama>',
    example: '.ceklapar Budi',
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
    if (percent >= 90) desc = 'LAPARRR! Makan sekarang! 🍔🍕🍜'
    else if (percent >= 70) desc = 'Perut keroncongan~ 😋'
    else if (percent >= 50) desc = 'Bisa lah ngemil 🍿'
    else if (percent >= 30) desc = 'Masih kenyang 😊'
    else desc = 'Kekenyangan! 🤰'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "lapar",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kelaparan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kelaparan @${mentioned.split('@')[0]}`,
         `Tingkat kelaparan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("ceklapar", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }