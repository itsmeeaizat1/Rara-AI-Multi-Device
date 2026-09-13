// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: "cekgacha",
    alias: ["cekgacha"],
    category: 'cek',
    description: 'Cek hoki gacha kamu',
    usage: '.cekgacha <nama>',
    example: '.cekgacha Budi',
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
    if (percent >= 90) desc = 'HOKI PARAH! SSR GUARANTEED! 💎'
    else if (percent >= 70) desc = 'Lucky! Pasti dapet SR keatas! 🍀'
    else if (percent >= 50) desc = 'Hoki-hoki dikit 😊'
    else if (percent >= 30) desc = 'Hmm... pray harder! 🙏'
    else desc = 'SIAL! Nanti aja gachanya! 💔'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "gacha",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kegachaan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kegachaan @${mentioned.split('@')[0]}`,
         `Tingkat kegachaan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("cekgacha", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }