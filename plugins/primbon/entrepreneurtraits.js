// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'sifatusahabisnis',
    alias: ["sifatusahabisnis"],
    category: 'primbon',
    description: 'Cek sifat usaha/bisnis berdasarkan tanggal lahir',
    usage: '.sifatusahabisnis <tgl> <bln> <thn>',
    example: '.sifatusahabisnis 1 1 2000',
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
        return m.reply(`*sIfat Usaha/Bisnis*\n\nFormat: tgl bln thn\n\n\`Contoh: ${m.prefix}sifatusahabisnis 1 1 2000\``)
    }
    
    const [tgl, bln, thn] = m.args
    
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/sifat_usaha_bisnis?tgl=${tgl}&bln=${bln}&thn=${thn}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data) {
            return m.reply(novaError("SifatUsahaBisnis", `❌ *ɢᴀɢᴀʟ*\n\nGagal menganalisa`))
        }
        
        const r = data.data
        const response = `💼 *sIfat Usaha/Bisnis*\n\n` +
            `Lahir: *${r.hari_lahir}*\n\n` +
            `📊 *ᴀɴᴀʟɪꜱᴀ:*\n${r.usaha}\n\n` +
            `_${r.catatan}_`
        await m.reply(response)
        
    } catch (error) {
        m.reply(novaError("SifatUsahaBisnis", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }