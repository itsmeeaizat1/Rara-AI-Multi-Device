// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'ceksial',
    alias: ["ceksial"],
    category: 'cek',
    description: 'Cek seberapa sial kamu',
    usage: '.ceksial <nama>',
    example: '.ceksial Budi',
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
        desc = 'SIAL BANGET! Mending di rumah aja! 😭'
    } else if (percent >= 70) {
        desc = 'Lagi apes nih~ 😢'
    } else if (percent >= 50) {
        desc = 'Lumayan sial 😓'
    } else if (percent >= 30) {
        desc = 'Sedikit sial 😕'
    } else {
        desc = 'Gak sial, hoki dong! 🍀'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "sial",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kesialan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kesialan @${mentioned.split('@')[0]}`,
         `Tingkat kesialan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("ceksial", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }