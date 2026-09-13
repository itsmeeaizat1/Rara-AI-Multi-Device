// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekotaku',
    alias: ["cekotaku"],
    category: 'cek',
    description: 'Cek tingkat otaku kamu',
    usage: '.cekotaku <nama>',
    example: '.cekotaku Budi',
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
    if (percent >= 90) desc = 'SUGOI! True otaku desu! 🎌'
    else if (percent >= 70) desc = 'Weeb level tinggi~ 🇯🇵'
    else if (percent >= 50) desc = 'Casual anime enjoyer 📺'
    else if (percent >= 30) desc = 'Tau anime dikit-dikit 🤔'
    else desc = 'Normie detected! 😂'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "otaku",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat keotakuan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat keotakuan @${mentioned.split('@')[0]}`,
         `Tingkat keotakuan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("cekotaku", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }