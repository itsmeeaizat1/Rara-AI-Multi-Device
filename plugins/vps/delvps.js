// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'

const pluginConfig = {
    name: ['delvps', 'deldroplet', 'deletevps'],
    alias: ["delvps", "deldroplet", "deletevps"],
    category: 'vps',
    description: 'Hapus VPS DigitalOcean',
    usage: '.delvps <id>',
    example: '.delvps 123456789',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

function hasAccess(sender, isOwner) {
    if (isOwner) return true
    const cleanSender = sender?.split('@')[0]
    if (!cleanSender) return false
    const doConfig = config.digitalocean || {}
    return (doConfig.sellers || []).includes(cleanSender) || 
           (doConfig.ownerPanels || []).includes(cleanSender)
}

async function handler(m, { sock }) {
    const token = config.digitalocean?.token
    
    if (!token) {
        return m.reply( `DigitalOcean belum disetup. Isi digitalocean.token di config.js`, "delvps")
    }
    
    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(raraWrap("Akses Ditolak", "🚫 Fitur ini hanya untuk Owner/Seller."))
    }
    
    const dropletId = m.text?.trim()
    if (!dropletId) {
        return m.reply( raraWrap("delvps", `Cara pakai:\n${m.prefix}delvps <droplet_id>\n\nGunakan ${m.prefix}listvps untuk melihat ID`, "guide"), "delvps")
    }
    
    await m.reply(raraWrap("VPS", `\u23f3 Menghapus VPS...\nID: ${dropletId}`))
    
    try {
        await axios.delete(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        await m.reply(`
*ID:* ${dropletId}
│ *Status:* Berhasil dihapus
`)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName, err))
    }
}

export { pluginConfig as config, handler };
