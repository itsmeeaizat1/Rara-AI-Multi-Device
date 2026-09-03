// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekprocastinator',
    alias: ["cekprocastinator"],
    category: 'cek',
    description: 'Cek tingkat suka menunda',
    usage: '.cekprocastinator <nama>',
    example: '.cekprocastinator Budi',
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
    if (percent >= 90) desc = 'Deadline? Besok aja deh~ 😴'
    else if (percent >= 70) desc = 'Master procrastination! 🦥'
    else if (percent >= 50) desc = 'Kadang nunda, kadang rajin 😅'
    else if (percent >= 30) desc = 'Cukup produktif! 💪'
    else desc = 'Disiplin tinggi! Salut! 🏆'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "procastinator",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat keprocastinatoran kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat keprocastinatoran @${mentioned.split('@')[0]}`,
         `Tingkat keprocastinatoran dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await m.reply(claraWrap("cekprocastinator", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }