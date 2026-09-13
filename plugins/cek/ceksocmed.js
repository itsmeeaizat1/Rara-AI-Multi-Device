// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'ceksocmed',
    alias: ["ceksocmed"],
    category: 'cek',
    description: 'Cek tingkat kecanduan sosmed',
    usage: '.ceksocmed <nama>',
    example: '.ceksocmed Budi',
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
    if (percent >= 90) desc = 'Kecanduan parah! Detox needed! 📱💀'
    else if (percent >= 70) desc = 'Scroll terus tanpa henti~ 📲'
    else if (percent >= 50) desc = 'Normal usage 👍'
    else if (percent >= 30) desc = 'Cukup sehat nih 🌿'
    else desc = 'Digital detox master! 🧘'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "socmed",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kesocmedan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kesocmedan @${mentioned.split('@')[0]}`,
         `Tingkat kesocmedan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("ceksocmed", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }