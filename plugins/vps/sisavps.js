// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'

const pluginConfig = {
    name: ['sisavps', 'sisadroplet', 'vpsquota'],
    alias: ["sisavps", "sisadroplet", "vpsquota"],
    category: 'vps',
    description: 'Cek sisa kuota VPS',
    usage: '.sisavps',
    example: '.sisavps',
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
        return m.reply( `DigitalOcean belum disetup. Isi digitalocean.token di config.js`, "sisavps")
    }
    
    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(raraWrap("Akses Ditolak", "\U0001f6ab Fitur ini hanya untuk Owner/Seller."))
    }
    try {
        const [accountRes, dropletsRes] = await Promise.all([
            axios.get('https://api.digitalocean.com/v2/account', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            axios.get('https://api.digitalocean.com/v2/droplets', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ])
        
        const account = accountRes.data.account
        const droplets = dropletsRes.data.droplets || []
        const dropletLimit = account.droplet_limit
        const dropletsUsed = droplets.length
        const dropletsRemaining = dropletLimit - dropletsUsed
        
        let txt = `*Kuota DigitalOcean*\n\n` +
            `Limit: ${dropletLimit} droplet\n` +
            `Terpakai: ${dropletsUsed} droplet\n` +
            `Sisa: ${dropletsRemaining} droplet\n` +
            `Email: ${account.email}\n` +
            `Status: ${account.status}`
        await m.reply(txt)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName, err))
    }
}

export { pluginConfig as config, handler };
