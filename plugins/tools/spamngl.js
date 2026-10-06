// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import config from "../../config.js";
const pluginConfig = {
    name: 'spamngl',
    alias: ["spamngl"],
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
    if(!link) return m.reply( raraWrap("spamngl", `*LINK NGL NYA MANA ??*\n💡 *Contoh:* \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`, "guide"), "spamngl")
    if(!kata) return m.reply( raraWrap("spamngl", `*KATA KATA NYA MANA ??*\n\n💡 *Contoh:* \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`, "guide"), "spamngl")
    if(!jumlah) return m.reply( raraWrap("spamngl", `*JUMLAH NYA MANA ??*\n\n💡 *Contoh:* \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`, "guide"), "spamngl")
    if(isNaN(jumlah)) { const __navText = `*jumlah nya harus angka*\n\n💡 *Contoh:* \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10`; return await m.reply(__navText); }
    try {
    await m.react("🕒");
        for(let i = 0; i < jumlah; i++) {
            axios.get(`https://api.cuki.biz.id/api/tools/sendngl?apikey=${config.APIkey.cuki}&link=${encodeURIComponent(link)}&text=${encodeURIComponent(kata)}`, {
                timeout: 30000
            })
            await new Promise(resolve => setTimeout(resolve, 4000))
        }
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
            text: `✅ *done*\n\nBerhasil mengirim spam NGL Message!\nTarget: ${link}\nPesan: ${kata} (${jumlah}x)`
        }, { quoted: m })
        
    } catch (error) {
    await m.react("❌");
        m.reply(raraWrap("spamngl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }