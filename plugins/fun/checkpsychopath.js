// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekpsikopat',
    alias: ["cekpsikopat"],
    category: "fun",
    description: 'Cek seberapa psikopat kamu',
    usage: '.cekpsikopat <nama>',
    example: '.cekpsikopat Budi',
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
        desc = 'PSIKOPAT AKUT! Jauhi! 😈'
    } else if (percent >= 70) {
        desc = 'Hati-hati sama orang ini 👀'
    } else if (percent >= 50) {
        desc = 'Ada sisi gelapnya 🌑'
    } else if (percent >= 30) {
        desc = 'Sedikit misterius 🤔'
    } else {
        desc = 'Normal dan baik hati 😇'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "psikopat",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kepsikopatan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kepsikopatan @${mentioned.split('@')[0]}`,
         `Tingkat kepsikopatan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekpsikopat", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }