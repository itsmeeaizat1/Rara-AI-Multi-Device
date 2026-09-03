// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekimut',
    alias: ["cekimut"],
    category: 'cek',
    description: 'Cek seberapa imut kamu',
    usage: '.cekimut <nama>',
    example: '.cekimut Ani',
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
        desc = 'IMUT BANGET! Kawaii~~ 🥺💕'
    } else if (percent >= 70) {
        desc = 'Imutnya kebangetan! 😍'
    } else if (percent >= 50) {
        desc = 'Lumayan imut~'
    } else if (percent >= 30) {
        desc = 'Ada imutnya dikit 😊'
    } else {
        desc = 'Mungkin cool bukan imut? 😎'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "imut",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat keimutan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat keimutan @${mentioned.split('@')[0]}`,
         `Tingkat keimutan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await m.reply(claraWrap("cekimut", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }