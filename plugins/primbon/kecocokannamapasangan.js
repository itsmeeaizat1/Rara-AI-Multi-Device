import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'kecocokannamapasangan',
    alias: ['cocoknama', 'matchname'],
    category: 'primbon',
    description: 'Cek kecocokan nama pasangan',
    usage: '.kecocokannamapasangan <nama1> <nama2>',
    example: '.kecocokannamapasangan putu keyla',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (m.args.length < 2) {
        { const __navText = `💕 *ᴋᴇᴄᴏᴄᴏᴋᴀɴ ɴᴀᴍᴀ*\n\n> Format: nama1 nama2\n\n\`Contoh: ${m.prefix}kecocokannamapasangan putu keyla\``; return await m.reply(__navText); }
    }
    
    const [nama1, nama2] = m.args
    
    
    try {
        const url = `https://api.siputzx.my.id/api/primbon/kecocokan_nama_pasangan?nama1=${encodeURIComponent(nama1)}&nama2=${encodeURIComponent(nama2)}`
        const { data } = await axios.get(url, { timeout: 30000 })
        
        if (!data?.status || !data?.data) {
            return m.reply(claraWrap("kecocokannamapasangan", `❌ *ɢᴀɢᴀʟ*\n\n> Gagal menganalisa`))
        }
        
        const result = data.data
        const response = `💕 *ᴋᴇᴄᴏᴄᴏᴋᴀɴ ɴᴀᴍᴀ ᴘᴀsᴀɴɢᴀɴ*\n\n` +
            `> 👤 ${result.nama_anda}\n` +
            `> 💑 ${result.nama_pasangan}\n\n` +
            `✅ *ꜱɪꜱɪ ᴘᴏꜱɪᴛɪꜰ:*\n${result.sisi_positif}\n\n` +
            `❌ *ꜱɪꜱɪ ɴᴇɢᴀᴛɪꜰ:*\n${result.sisi_negatif}\n\n` +
            `> _${result.catatan}_`
        
        m.react('✅')
        await m.reply(response)
        
    } catch (error) {
        m.reply(claraWrap("kecocokannamapasangan", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }