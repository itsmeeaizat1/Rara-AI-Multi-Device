// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'zodiak',
    alias: ["zodiak", "ramalanzodiak", "zodiac"],
    category: 'primbon',
    description: 'Ramalan zodiak',
    usage: '.zodiak <nama zodiak>',
    example: '.zodiak aries',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const validZodiacs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagitarius', 'capricorn', 'aquarius', 'pisces']

async function handler(m, { sock }) {
    const zodiac = m.args[0]?.toLowerCase()
    
    if (!zodiac || !validZodiacs.includes(zodiac)) {
        return m.reply(`⭐ *Zodiak*\n\nMasukkan nama zodiak:\n\n${validZodiacs.map(z => `${z}`).join('\n')}\n\n\`Contoh: ${m.prefix}zodiak aries\``)
    }
    
    m.react('🕐')
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/zodiak?zodiak=${zodiac}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data) {
            return m.reply(claraWrap("zodiak", `❌ *Gagal*\n\nGagal mendapatkan ramalan`))
        }
        
        const r = data.data
        const response = `⭐ *Zodiak ${zodiac.toUpperCase()}*\n\n` +
            `${r.zodiak}\n\n` +
            `🔢 *Nomor:* ${r.nomor_keberuntungan}\n` +
            `🌸 *Bunga:* ${r.bunga_keberuntungan}\n` +
            `🎨 *Warna:* ${r.warna_keberuntungan}\n` +
            `💎 *Batu:* ${r.batu_keberuntungan}\n` +
            `🔥 *Elemen:* ${r.elemen_keberuntungan}\n` +
            `🪐 *Planet:* ${r.planet_yang_mengitari}\n` +
            `💕 *Pasangan:* ${r.pasangan_zodiak}`
        
        m.react('✅')
        await m.reply(response)
        
    } catch (error) {
        m.reply(claraWrap("zodiak", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }