// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import config from "../../config.js";
const pluginConfig = {
    name: 'spamngl',
    alias: [],
    category: 'tools',
    description: 'Send NGL Spam',
    usage: '.spamngl <url> | <text> | <jumlah>',
    example: '.spamngl https://ngl.link/xxxx | hai | 10',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.split('|')
    const [ link, kata, jumlah ] = text
    if(!link) return sendReplyWithNav(sock, m, `*LINK NGL NYA MANA ??*\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`, "spamngl")
    if(!kata) return sendReplyWithNav(sock, m, `*KATA KATA NYA MANA ??*\n\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`, "spamngl")
    if(!jumlah) return sendReplyWithNav(sock, m, `*JUMLAH NYA MANA ??*\n\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`, "spamngl")
    if(isNaN(jumlah)) { const __navText = `*JUMLAH NYA HARUS ANGKA*\n\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`; return await m.reply(__navText); }
    m.react('🕐')
    
    try {
        for(let i = 0; i < jumlah; i++) {
            axios.get(`https://api.cuki.biz.id/api/tools/sendngl?apikey=${config.APIkey.cuki}&link=${encodeURIComponent(link)}&text=${encodeURIComponent(kata)}`, {
                timeout: 30000
            })
            await new Promise(resolve => setTimeout(resolve, 4000))
        }
        await m.react('✅')
        await sock.sendMessage(m.chat, {
            text: `✅ *DONE*\n\nBerhasil mengirim spam NGL Message!\nTarget: ${link}\nPesan: ${kata} (${jumlah}x)`
        }, { quoted: m })
        
    } catch (error) {
        m.reply(claraWrap("spamngl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }