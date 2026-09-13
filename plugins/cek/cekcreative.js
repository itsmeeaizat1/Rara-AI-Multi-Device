// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekcreative',
    alias: ["cekcreative"],
    category: 'cek',
    description: 'Cek tingkat kreativitas kamu',
    usage: '.cekcreative <nama>',
    example: '.cekcreative Budi',
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
    if (percent >= 90) desc = 'SUPER KREATIF! Artis sejati! 🎨'
    else if (percent >= 70) desc = 'Imajinatif banget! 💡'
    else if (percent >= 50) desc = 'Cukup kreatif 😊'
    else if (percent >= 30) desc = 'Biasa aja sih 🤔'
    else desc = 'Kurang imajinasi nih 😅'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "creative",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kecreativean kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kecreativean @${mentioned.split('@')[0]}`,
         `Tingkat kecreativean dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("cekcreative", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }