// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: "cekbucin",
    alias: ["cekbucin"],
    category: "fun",
    description: 'Cek seberapa bucin kamu',
    usage: '.cekbucin <nama>',
    example: '.cekbucin Budi',
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
        desc = 'BUCIN AKUT! Udah gabisa diselamatkan 😭💔'
    } else if (percent >= 70) {
        desc = 'Bucin parah nih~ 🥺'
    } else if (percent >= 50) {
        desc = 'Lumayan bucin 💕'
    } else if (percent >= 30) {
        desc = 'Sedikit bucin 😊'
    } else {
        desc = 'Santai aja, gak bucin 😎'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "bucin",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kebucinan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kebucinan @${mentioned.split('@')[0]}`,
         `Tingkat kebucinan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, novaWrap("cekbucin", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }