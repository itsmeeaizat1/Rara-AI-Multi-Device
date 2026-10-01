// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekoverpower',
    alias: ["cekoverpower"],
    category: "fun",
    description: 'Cek tingkat overpower kamu',
    usage: '.cekoverpower <nama>',
    example: '.cekoverpower Budi',
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
    if (percent >= 90) desc = 'OVERPOWER BANGET! LEGEND! 👑🔥'
    else if (percent >= 70) desc = 'Kuat banget nih! 💪'
    else if (percent >= 50) desc = 'Lumayan strong~ 😎'
    else if (percent >= 30) desc = 'Biasa aja sih 🤔'
    else desc = 'Masih perlu latihan 📝'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "overpower",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat keoverpoweran kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat keoverpoweran @${mentioned.split('@')[0]}`,
         `Tingkat keoverpoweran dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, novaWrap("cekoverpower", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }