// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekpintar',
    alias: ["cekpintar"],
    category: "fun",
    description: 'Cek seberapa pintar kamu',
    usage: '.cekpintar <nama>',
    example: '.cekpintar Budi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
        const mentioned = m.mentionedJid[0] || m.sender

        const iq = Math.floor(Math.random() * 100) + 70
    
    let desc = ''
    if (iq >= 150) {
        desc = 'JENIUS! Einstein level! 🧠'
    } else if (iq >= 130) {
        desc = 'Sangat cerdas! 🎓'
    } else if (iq >= 110) {
        desc = 'Di atas rata-rata! 👍'
    } else if (iq >= 90) {
        desc = 'Normal, rata-rata 😊'
    } else {
        desc = 'Tetap semangat belajar! 📚'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "pintar",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Kepintaran (IQ) kamu: ${iq}`,
         `"${desc}"`].join("\n")
      : [`Cek kepintaran @${mentioned.split('@')[0]}`,
         `Kepintaran (IQ) dia: ${iq}`,
         `"${desc}"`].join("\n")
    
    await m.reply(raraWrap("cekpintar", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }