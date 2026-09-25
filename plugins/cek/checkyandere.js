// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekyandere',
    alias: ["cekyandere"],
    category: 'cek',
    description: 'Cek tingkat yandere kamu',
    usage: '.cekyandere <nama>',
    example: '.cekyandere Budi',
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
    if (percent >= 90) desc = 'Kamu milikku selamanya~ 🔪💕'
    else if (percent >= 70) desc = 'Jangan dekati dia ya... 👁️'
    else if (percent >= 50) desc = 'Overprotective sedikit~ 🫂'
    else if (percent >= 30) desc = 'Agak posesif 😅'
    else desc = 'Normal kok, santai~ 😊'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "yandere",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat keyanderean kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat keyanderean @${mentioned.split('@')[0]}`,
         `Tingkat keyanderean dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("cekyandere", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }