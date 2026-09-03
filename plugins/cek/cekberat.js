// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { cekFunAI } from "../../src/lib/nova-fun-ai.js";
const pluginConfig = {
    name: 'cekberat',
    alias: ["cekberat"],
    category: 'cek',
    description: 'Cek berat badan random',
    usage: '.cekberat <nama>',
    example: '.cekberat Budi',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
    const berat = Math.floor(Math.random() * 60) + 40
    const mentioned = m.mentionedJid?.[0] || m.sender
    
    let desc = ''
    if (berat >= 90) {
        desc = 'Big boy/girl! 💪'
    } else if (berat >= 70) {
        desc = 'Berisi dan sehat! 😊'
    } else if (berat >= 55) {
        desc = 'Ideal banget! 👍'
    } else if (berat >= 45) {
        desc = 'Langsing nih~'
    } else {
        desc = 'Kurus banget, makan yang banyak! 🍔'
    }
    

    // Coba AI buat deskripsi yang lebih lucu, fallback ke desc di atas
    try {
        const aiResult = await cekFunAI({
            botConfig: botConfig || {},
            cekType: "berat",
            percent: percent,
            fallbackDesc: desc,
        });
        if (aiResult.text) desc = aiResult.text;
    } catch {}

    let txt = mentioned === m.sender ? `Hai @${mentioned.split('@')[0]}
    
Berat badan kamu *${berat} kg*
\`\`\`${desc}\`\`\`` : `Kamu ingin ngecek berat badan @${mentioned.split('@')[0]} yak? 
    
Berat badan dia sebesar *${berat} kg*
\`\`\`${desc}\`\`\``
    
    await m.reply(claraWrap("cekberat", txt), { mentions: [mentioned] });
}

export { pluginConfig as config, handler }
