// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { runCekAnim } from "../../src/lib/nova-cek-anim.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: "cekjodoh",
    alias: ["cekjodoh"],
    category: 'cek',
    description: 'Cek kecocokan jodoh',
    usage: '.cekjodoh <nama1> & <nama2>',
    example: '.cekjodoh Budi & Ani',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
    const input = m.text?.trim() || ''
    const parts = input.split(/[&,]/).map(s => s.trim()).filter(s => s)
    
    if (parts.length < 2) {
        { const __navText = claraWrap("Cek Jodoh", `Masukkan 2 nama!\n\n💡 *Contoh:* ${m.prefix}cekjodoh Budi & Ani`); return await m.reply(__navText, "cekjodoh"); }
    }
    
    const percent = Math.floor(Math.random() * 101)
    const mentioned = m.mentionedJid[0] || m.sender
                    
    let desc = ''
    if (percent >= 90) {
        desc = 'Jodoh banget! Langsung nikah aja! 💍'
    } else if (percent >= 70) {
        desc = 'Cocok banget! 💕'
    } else if (percent >= 50) {
        desc = 'Lumayan cocok~ 😊'
    } else if (percent >= 30) {
        desc = 'Hmm, perlu usaha lebih 🤔'
    } else {
        desc = 'Mungkin cari yang lain? 😅'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "jodoh",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kejodohan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kejodohan @${mentioned.split('@')[0]}`,
         `Tingkat kejodohan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, claraWrap("Cek Jodoh", txt), { mentions: [mentioned] }, { subject: m.command })
}

export { pluginConfig as config, handler }