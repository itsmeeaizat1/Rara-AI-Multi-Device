// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekgamer',
    alias: ["cekgamer"],
    category: "fun",
    description: 'Cek seberapa pro gamer kamu',
    usage: '.cekgamer <nama>',
    example: '.cekgamer Budi',
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
        desc = 'PRO PLAYER! Esports level! 🏆'
    } else if (percent >= 70) {
        desc = 'Jago banget! 🎮'
    } else if (percent >= 50) {
        desc = 'Lumayan pro 👍'
    } else if (percent >= 30) {
        desc = 'Masih noob nih 😅'
    } else {
        desc = 'Mending main masak-masakan 🍳'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "gamer",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kegameran kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kegameran @${mentioned.split('@')[0]}`,
         `Tingkat kegameran dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, novaWrap("cekgamer", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }