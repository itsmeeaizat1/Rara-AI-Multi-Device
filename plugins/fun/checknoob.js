// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekcupu',
    alias: ["cekcupu"],
    category: "fun",
    description: 'Cek tingkat kecupuan kamu',
    usage: '.cekcupu <nama>',
    example: '.cekcupu Budi',
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
    if (percent >= 90) desc = 'CUPU PARAH! NOOB DETECTED! 🤡'
    else if (percent >= 70) desc = 'Masih newbie nih~ 😅'
    else if (percent >= 50) desc = 'Biasa aja lah 🤔'
    else if (percent >= 30) desc = 'Cukup jago! 💪'
    else desc = 'PRO PLAYER! GG! 🏆'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "cupu",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kecupuan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kecupuan @${mentioned.split('@')[0]}`,
         `Tingkat kecupuan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekcupu", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }