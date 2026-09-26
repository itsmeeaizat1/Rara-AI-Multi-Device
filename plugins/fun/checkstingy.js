// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekpelit',
    alias: ["cekpelit"],
    category: "fun",
    description: 'Cek seberapa pelit kamu',
    usage: '.cekpelit <nama>',
    example: '.cekpelit Budi',
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
        desc = 'SUPER PELIT! Duit dijaga mati-matian! 💸'
    } else if (percent >= 70) {
        desc = 'Pelit banget! 🙊'
    } else if (percent >= 50) {
        desc = 'Lumayan pelit 😅'
    } else if (percent >= 30) {
        desc: 'Sedikit hemat 😊'
    } else {
        desc = 'Dermawan banget! 🎁'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "pelit",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kepelitan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kepelitan @${mentioned.split('@')[0]}`,
         `Tingkat kepelitan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("cekpelit", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }