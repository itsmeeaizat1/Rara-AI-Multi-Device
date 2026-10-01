// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekcantik',
    alias: ["cekcantik"],
    category: "fun",
    description: 'Cek seberapa cantik kamu',
    usage: '.cekcantik <nama>',
    example: '.cekcantik Ani',
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
        desc = 'Cantik banget kayak bidadari! 👸'
    } else if (percent >= 70) {
        desc = 'Cantik banget! 💕'
    } else if (percent >= 50) {
        desc = 'Manis dan cantik~'
    } else if (percent >= 30) {
        desc = 'Lumayan cantik 😊'
    } else {
        desc = 'Tetep cantik kok! 💖'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "cantik",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kecantikan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kecantikan @${mentioned.split('@')[0]}`,
         `Tingkat kecantikan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekcantik", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }