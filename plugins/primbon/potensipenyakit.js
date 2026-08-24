// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'potensipenyakit',
    alias: ['cekpenyakit', 'penyakit'],
    category: 'primbon',
    description: 'Cek potensi penyakit berdasarkan tanggal lahir',
    usage: '.potensipenyakit <tgl> <bln> <thn>',
    example: '.potensipenyakit 12 05 1998',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (m.args.length < 3) {
        return m.reply(`🏥 *Potensi Penyakit*\n\n> Format: tgl bln thn\n\n\`Contoh: ${m.prefix}potensipenyakit 12 05 1998\``)
    }
    
    const [tgl, bln, thn] = m.args
    
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/cek_potensi_penyakit?tgl=${tgl}&bln=${bln}&thn=${thn}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data) {
            return m.reply(claraWrap("potensipenyakit", `❌ *Gagal*\n\n> Gagal menganalisa`))
        }
        
        const result = data.data
        const response = `🏥 *Potensi Penyakit*\n\n` +
            `Tanggal: *${tgl}-${bln}-${thn}*\n\n` +
            `📊 *Elemen:*\n${result.sektor}\n\n` +
            `⚠️ *Potensi:*\n${result.elemen}\n\n` +
            `_${result.catatan}_`
        
        m.react('✅')
        await m.reply(response)
        
    } catch (error) {
        m.reply(claraWrap("potensipenyakit", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }