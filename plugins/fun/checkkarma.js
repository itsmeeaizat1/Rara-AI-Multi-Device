// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { runCekAnim } from "../../src/lib/rara-cek-anim.js";
import { cekFunAI } from "../../src/lib/rara-fun-ai.js";
const pluginConfig = {
    name: 'cekkarma',
    alias: ["cekkarma"],
    category: "fun",
    description: 'Cek tingkat karma kamu',
    usage: '.cekkarma <nama>',
    example: '.cekkarma Budi',
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
    if (percent >= 80) desc = 'Karma baik! Surga menantimu~'
    else if (percent >= 60) desc = 'Cukup baik, terus tingkatkan! 🙏'
    else if (percent >= 40) desc = 'Netral, perbanyak kebaikan~ ⚖️'
    else if (percent >= 20) desc = 'Hati-hati dengan karma buruk! ⚠️'
    else desc = 'Wah perlu banyak tobat nih... 😱'
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "karma",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender
      ? [`Hai @${mentioned.split('@')[0]}`,
         `Tingkat kekarmaan kamu: ${percent}%`,
         `"${desc}"`].join("\n")
      : [`Cek tingkat kekarmaan @${mentioned.split('@')[0]}`,
         `Tingkat kekarmaan dia: ${percent}%`,
         `"${desc}"`].join("\n")
    
    await runCekAnim(m, sock, raraWrap("cekkarma", txt), { mentions: [mentioned] }, { subject: m.command });
}

export { pluginConfig as config, handler }