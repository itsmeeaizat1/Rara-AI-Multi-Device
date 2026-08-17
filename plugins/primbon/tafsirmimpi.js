// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "tafsirmimpi",
    alias: ["tafsirmimpi", "mimpi2", "tafsir"],
    category: 'primbon',
    description: 'Cari tafsir mimpi',
    usage: '.tafsirmimpi <kata kunci>',
    example: '.tafsirmimpi bertemu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const keyword = m.args.join(' ')
    if (!keyword) {
        return m.reply(`🌙 *Tafsir Mimpi*\n\n> Masukkan kata kunci mimpi\n\n\`Contoh: ${m.prefix}tafsirmimpi bertemu\``)
    }
    
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/tafsirmimpi?mimpi=${encodeURIComponent(keyword)}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data?.hasil?.length) {
            return m.reply(claraWrap("tafsirmimpi", `❌ *Gagal*\n\n> Tidak ditemukan tafsir untuk: ${keyword}`))
        }
        
        const r = data.data
        let response = `🌙 *Tafsir Mimpi*\n\n`
        response += `Kata kunci: *${r.keyword}*\n`
        response += `Ditemukan: *${r.total} hasil*\n\n`
        
        r.hasil.slice(0, 10).forEach((h, i) => {
            response += `*${i+1}. ${h.mimpi}*\n> ${h.tafsir}\n\n`
        })
        
        if (r.total > 10) {
            response += `_...dan ${r.total - 10} hasil lainnya_`
        }
        
        m.react('✅')
        await m.reply(response)
        
    } catch (error) {
        m.reply(claraWrap("tafsirmimpi", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }