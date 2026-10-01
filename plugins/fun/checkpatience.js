// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'ceksabar',
    alias: ["ceksabar"],
    category: "fun",
    description: 'Cek tingkat kesabaran kamu',
    usage: '.ceksabar <nama>',
    example: '.ceksabar Budi',
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
    if (percent >= 90) desc = 'Sabar level dewa! Zen master~ 🧘'
    else if (percent >= 70) desc = 'Sangat sabar! Terpuji 👏'
    else if (percent >= 50) desc = 'Cukup sabar 😊'
    else if (percent >= 30) desc = 'Kadang emosian dikit 😅'
    else desc = 'Gampang marah nih... 😤'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "sabar",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kesabaran kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kesabaran @${mentioned.split('@')[0]}`,
         `Tingkat kesabaran dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("ceksabar", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }