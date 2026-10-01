// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: "ceksisaumur",
    alias: ["ceksisaumur"],
    category: "fun",
    description: 'Cek sisa umur kamu',
    usage: '.ceksisaumur <nama>',
    example: '.ceksisaumur Budi',
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

        
    const tahun = Math.floor(Math.random() * 80) + 20
    const bulan = Math.floor(Math.random() * 12)
    const hari = Math.floor(Math.random() * 30)
    
    let desc = ''
    if (tahun > 80) {
        desc = 'Panjang umur banget! 🎉'
    } else if (tahun > 60) {
        desc = 'Lumayan panjang~'
    } else if (tahun > 40) {
        desc = 'Cukup lah ya 😊'
    } else {
        desc = 'Jaga kesehatan ya! 🙏'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "sisaumur",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Sisa umur kamu: ${tahun} Tahun ${bulan} Bulan ${hari} Hari`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kesisaumuran @${mentioned.split('@')[0]}`,
         `Sisa umur dia: ${tahun} Tahun ${bulan} Bulan ${hari} Hari`,
         `"${desc}"`].join("\n")
    
    await m.reply(raraWrap("ceksisaumur", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }