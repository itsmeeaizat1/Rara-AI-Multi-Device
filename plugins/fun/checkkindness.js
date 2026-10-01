// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekbaik',
    alias: ["cekbaik"],
    category: "fun",
    description: 'Cek seberapa baik kamu',
    usage: '.cekbaik <nama>',
    example: '.cekbaik Budi',
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
        desc = 'Mantappp! kamu adalah orang paling Baik di dunia ini! 😇'
    } else if (percent >= 70) {
        desc = 'Baik hati dan tidak sombong! 💝'
    } else if (percent >= 50) {
        desc = 'Lumayan baik 😊'
    } else if (percent >= 30) {
        desc = 'Sedikit baik 🙂'
    } else {
        desc = 'Hmm, perlu introspeksi ?? 🤔'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "baik",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kebaikan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kebaikan @${mentioned.split('@')[0]}`,
         `Tingkat kebaikan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekbaik", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }