// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'

const pluginConfig = {
    name: ['listvps', 'listdroplet', 'vpslist'],
    alias: [],
    category: 'vps',
    description: 'List semua VPS DigitalOcean',
    usage: '.listvps',
    example: '.listvps',
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
        return m.reply( `DigitalOcean belum disetup. Isi digitalocean.token di config.js`, "listvps")
    }
    
    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(`Akses ditolak. Fitur ini hanya untuk Owner/Seller.`)
    }
    
    await m.react("🕒")
    await m.reply(`Mengambil data VPS...`)
    
    try {
        const response = await axios.get('https://api.digitalocean.com/v2/droplets', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        const droplets = response.data.droplets || []
        
        if (droplets.length === 0) {
            return m.reply(`╭──「 *List VPS 」
┊
│ ❏ Tidak ada VPS yang tersedia
╰──────────❀`)
        }
        
        let txt = `╭──「 *List VPS 」
┊
│ ❏ Total: ${droplets.length} droplet
╰──────────❀
`
        
        for (const droplet of droplets) {
            const ip = droplet.networks?.v4?.find(n => n.type === 'public')?.ip_address || '-'
            const status = droplet.status === 'active' ? 'Active' : 'Off'
            
            txt += `
╭──「 *${droplet.name} 」
┊
│ ❏ *ꜱᴛᴀᴛᴜꜱ:* ${status}
│ ❏ *ID:* ${droplet.id}
│ ❏ *IP:* ${ip}
│ ❏ *ʀᴀᴍ:* ${droplet.memory} MB
│ ❏ *ᴄᴘᴜ:* ${droplet.vcpus} vCPU
│ ❏ *ᴅɪꜱᴋ:* ${droplet.disk} GB
│ ❏ *ʀᴇɢɪᴏɴ:* ${droplet.region?.slug || '-'}
╰──────────❀
`
        }
        
        m.react("🐣")
        await m.reply(txt)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler };
