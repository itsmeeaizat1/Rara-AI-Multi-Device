// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'ceksexy',
    alias: ["ceksexy"],
    category: "fun",
    description: 'Cek seberapa sexy kamu',
    usage: '.ceksexy <nama>',
    example: '.ceksexy Budi',
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
        desc = 'SEXY ABIS! 🔥🔥🔥'
    } else if (percent >= 70) {
        desc = 'Hot banget! 😏'
    } else if (percent >= 50) {
        desc = 'Lumayan menggoda~ 😊'
    } else if (percent >= 30) {
        desc = 'Biasa aja sih 🙂'
    } else {
        desc = 'Mungkin cute bukan sexy 😅'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "sexy",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kesexyan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kesexyan @${mentioned.split('@')[0]}`,
         `Tingkat kesexyan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, novaWrap("ceksexy", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }