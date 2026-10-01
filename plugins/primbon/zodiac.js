// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'zodiak',
    alias: ["zodiak"],
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
    try {
        const url = `https://api.siputzx.my.id/api/primbon/zodiak?zodiak=${zodiac}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data) {
            return m.reply(raraError("Zodiak", `❌ *gagal*\n\nGagal mendapatkan ramalan`))
        }
        
        const r = data.data
        const response = `⭐ *Zodiak ${zodiac.toUpperCase()}*\n\n` +
            `${r.zodiak}\n\n` +
            `🔢 *nomor:* ${r.nomor_keberuntungan}\n` +
            `*bunga:* ${r.bunga_keberuntungan}\n` +
            `🎨 *warna:* ${r.warna_keberuntungan}\n` +
            `💎 *batu:* ${r.batu_keberuntungan}\n` +
            `🔥 *elemen:* ${r.elemen_keberuntungan}\n` +
            `🪐 *planet:* ${r.planet_yang_mengitari}\n` +
            `💕 *pasangan:* ${r.pasangan_zodiak}`
        await m.reply(response)
        
    } catch (error) {
        m.reply(raraError("Zodiak", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }