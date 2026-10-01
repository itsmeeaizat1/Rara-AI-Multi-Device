// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekkaya',
    alias: ["cekkaya"],
    category: "fun",
    description: 'Cek seberapa kaya kamu',
    usage: '.cekkaya <nama>',
    example: '.cekkaya Budi',
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
    let emoji = ''
    if (percent >= 90) {
        desc = 'Sultan! Crazy rich! 💎'
        emoji = '👑'
    } else if (percent >= 70) {
        desc = 'Tajir melintir! 💰'
        emoji = '💎'
    } else if (percent >= 50) {
        desc = 'Lumayan berada 💵'
        emoji = '💰'
    } else if (percent >= 30) {
        desc = 'Cukup lah buat hidup 😊'
        emoji = '💵'
    } else {
        desc = 'Semangat nabung! 🙏'
        emoji = '🪙'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "kaya",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kekayaan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kekayaan @${mentioned.split('@')[0]}`,
         `Tingkat kekayaan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekkaya", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }