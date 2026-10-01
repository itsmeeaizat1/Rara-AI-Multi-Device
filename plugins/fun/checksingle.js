// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekjomblo',
    alias: ["cekjomblo"],
    category: "fun",
    description: 'Cek tingkat kejombloan kamu',
    usage: '.cekjomblo <nama>',
    example: '.cekjomblo Budi',
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
    if (percent >= 90) desc = 'Jomblo abadi! Single is happiness~ 💔😎'
    else if (percent >= 70) desc = 'Strong independent person! 💪'
    else if (percent >= 50) desc = 'MasihPDKT mode ON 😍'
    else if (percent >= 30) desc = 'Ada yang naksir kayaknya~ 👀'
    else desc = 'Soon taken! 💕'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "jomblo",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kejombloan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kejombloan @${mentioned.split('@')[0]}`,
         `Tingkat kejombloan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, novaWrap("cekjomblo", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }