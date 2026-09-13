// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekrezeki',
    alias: ["cekrezeki"],
    category: 'cek',
    description: 'Cek tingkat rezeki kamu hari ini',
    usage: '.cekrezeki <nama>',
    example: '.cekrezeki Budi',
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
    if (percent >= 90) desc = 'Rezeki melimpah! Jackpot! 💰🎉'
    else if (percent >= 70) desc = 'Rezeki lancar hari ini~ 💵'
    else if (percent >= 50) desc = 'Rezeki cukup, bersyukurlah 🙏'
    else if (percent >= 30) desc = 'Rezeki pas-pasan 😅'
    else desc = 'Sabar ya, rezeki akan datang~ 🫂'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "rezeki",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kerezekian kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kerezekian @${mentioned.split('@')[0]}`,
         `Tingkat kerezekian dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("cekrezeki", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }