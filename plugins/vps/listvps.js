// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'

const pluginConfig = {
    name: ['listvps', 'listdroplet', 'vpslist'],
    alias: ["listvps", "listdroplet", "vpslist"],
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
        return m.reply(claraWrap("Akses Ditolak", "\U0001f6ab Fitur ini hanya untuk Owner/Seller."))
    }
    await m.reply(claraWrap("VPS", "\u23f3 Mengambil data VPS..."))
    
    try {
        const response = await axios.get('https://api.digitalocean.com/v2/droplets', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        const droplets = response.data.droplets || []
        
        if (droplets.length === 0) {
            return m.reply(`
Tidak ada VPS yang tersedia
`)
        }
        
        let txt = `
Total: ${droplets.length} droplet
`
        
        for (const droplet of droplets) {
            const ip = droplet.networks?.v4?.find(n => n.type === 'public')?.ip_address || '-'
            const status = droplet.status === 'active' ? 'Active' : 'Off'
            
            txt += `

*status:* ${status}
│ *ID:* ${droplet.id}
│ *IP:* ${ip}
│ *ram:* ${droplet.memory} MB
│ *cpu:* ${droplet.vcpus} vCPU
│ *disk:* ${droplet.disk} GB
│ *region:* ${droplet.region?.slug || '-'}
`
        }
        await m.reply(txt)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler };
