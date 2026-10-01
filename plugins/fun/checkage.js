// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: "cekumur",
    alias: ["cekumur"],
    category: "fun",
    description: 'Cek umur mental kamu',
    usage: '.cekumur <nama>',
    example: '.cekumur Budi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
        const percent = Math.floor(Math.random() * 80) + 5
    const mentioned = m.mentionedJid[0] || m.sender
                    
    let desc = ''
    if (percent >= 60) desc = 'Bijaksana seperti orang tua! 🧓'
    else if (percent >= 40) desc = 'Dewasa dan matang~ 🧑'
    else if (percent >= 20) desc = 'Jiwa muda! 🧒'
    else desc = 'Masih seperti anak kecil~ 👶'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "umur",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat keumuran kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat keumuran @${mentioned.split('@')[0]}`,
         `Tingkat keumuran dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await m.reply(raraWrap("cekumur", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }