// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: "ramalanjodoh",
    alias: ["ramalanjodoh", "jodoh2"],
    category: 'primbon',
    description: 'Ramalan jodoh berdasarkan primbon Jawa',
    usage: '.ramalanjodoh nama1 tgl1 bln1 thn1 nama2 tgl2 bln2 thn2',
    example: '.ramalanjodoh putu 16 11 2007 keyla 1 1 2008',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (m.args.length < 8) {
        return m.reply(`💑 *Ramalan Jodoh*\n\n> Format:\nrama1 tgl1 bln1 thn1 nama2 tgl2 bln2 thn2\n\n\`Contoh:\n${m.prefix}ramalanjodoh putu 16 11 2007 keyla 1 1 2008\``)
    }
    
    const [nama1, tgl1, bln1, thn1, nama2, tgl2, bln2, thn2] = m.args
    
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/ramalanjodoh?nama1=${encodeURIComponent(nama1)}&tgl1=${tgl1}&bln1=${bln1}&thn1=${thn1}&nama2=${encodeURIComponent(nama2)}&tgl2=${tgl2}&bln2=${bln2}&thn2=${thn2}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data?.result) {
            return m.reply(claraWrap("ramalanjodoh", `❌ *Gagal*\n\n> Gagal meramal`))
        }
        
        const r = data.data.result
        let response = `💑 *Ramalan Jodoh*\n\n`
        response += `👤 *${r.orang_pertama.nama}*\n> ${r.orang_pertama.tanggal_lahir}\n\n`
        response += `👤 *${r.orang_kedua.nama}*\n> ${r.orang_kedua.tanggal_lahir}\n\n`
        response += `📜 *HaꜱIl Ramalan:*\n`
        
        r.hasil_ramalan.forEach((h, i) => {
            response += `${i+1}. ${h}\n\n`
        })
        
        response += `⚠️ _${data.data.peringatan}_`
        
        m.react('✅')
        await m.reply(response)
        
    } catch (error) {
        m.reply(claraWrap("ramalanjodoh", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }