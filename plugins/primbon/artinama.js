// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'artinama',
    alias: ['namameaning', 'artinamaku'],
    category: 'primbon',
    description: 'Cek arti nama menurut primbon',
    usage: '.artinama <nama>',
    example: '.artinama putu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const nama = m.args.join(' ')
    if (!nama) {
        return m.reply(`📛 *ᴀʀᴛɪ ɴᴀᴍᴀ*\n\n> Masukkan nama\n\n\`Contoh: ${m.prefix}artinama putu\``)
    }
    
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/artinama?nama=${encodeURIComponent(nama)}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data) {
            return m.reply(claraWrap("Artinama", `❌ *ɢᴀɢᴀʟ*\n\n> Tidak dapat menganalisa nama`))
        }
        
        const result = data.data
        const response = `📛 *ᴀʀᴛɪ ɴᴀᴍᴀ*\n\n` +
            `> Nama: *${result.nama}*\n\n` +
            `${result.arti}\n\n` +
            `> _${result.catatan}_`
        
        m.react('✅')
        await m.reply(response)
        
    } catch (error) {
        m.reply(claraWrap("artinama", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }