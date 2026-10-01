// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekngantuk',
    alias: ["cekngantuk"],
    category: "fun",
    description: 'Cek tingkat ngantuk kamu',
    usage: '.cekngantuk <nama>',
    example: '.cekngantuk Budi',
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
    if (percent >= 90) desc = 'ZZZZZ... Tidur sana! 😴💤'
    else if (percent >= 70) desc = 'Mata 5 watt nih~ 😪'
    else if (percent >= 50) desc = 'Agak ngantuk dikit 🥱'
    else if (percent >= 30) desc = 'Masih fresh! ☕'
    else desc = 'Melek banget! Insomnia? 👀'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "ngantuk",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kengantukan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kengantukan @${mentioned.split('@')[0]}`,
         `Tingkat kengantukan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekngantuk", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }