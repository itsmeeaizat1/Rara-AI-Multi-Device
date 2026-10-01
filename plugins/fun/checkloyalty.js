// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'ceksetia',
    alias: ["ceksetia"],
    category: "fun",
    description: 'Cek tingkat kesetiaan kamu',
    usage: '.ceksetia <nama>',
    example: '.ceksetia Budi',
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
    if (percent >= 90) desc = 'Setia sampai mati! 💍💕'
    else if (percent >= 70) desc = 'Sangat setia dan tulus! ❤️'
    else if (percent >= 50) desc = 'Cukup setia~ 😊'
    else if (percent >= 30) desc = 'Hmm... kadang goyah 😅'
    else desc = 'Playboy/Playgirl mode? 😏'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "setia",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kesetiaan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kesetiaan @${mentioned.split('@')[0]}`,
         `Tingkat kesetiaan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("ceksetia", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }