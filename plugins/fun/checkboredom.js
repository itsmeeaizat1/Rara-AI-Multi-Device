// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekgabut',
    alias: ["cekgabut"],
    category: "fun",
    description: 'Cek tingkat keGabutan kamu',
    usage: '.cekgabut <nama>',
    example: '.cekgabut Budi',
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
    if (percent >= 90) desc = 'GABUT LEVEL MAX! Main bot aja~ 🥱'
    else if (percent >= 70) desc = 'Gabut parah nih! 😴'
    else if (percent >= 50) desc = 'Lumayan gabut 😅'
    else if (percent >= 30) desc = 'Agak sibuk dikit 📝'
    else desc = 'Sibuk banget! Produktif! 💼'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "gabut",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kegabutan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kegabutan @${mentioned.split('@')[0]}`,
         `Tingkat kegabutan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekgabut", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }