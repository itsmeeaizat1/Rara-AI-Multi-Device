// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'

const VPS_SPECS = {
    'vps1g1c': { size: 's-1vcpu-1gb', ram: '1GB', cpu: '1 vCPU' },
    'vps2g1c': { size: 's-1vcpu-2gb', ram: '2GB', cpu: '1 vCPU' },
    'vps2g2c': { size: 's-2vcpu-2gb', ram: '2GB', cpu: '2 vCPU' },
    'vps4g2c': { size: 's-2vcpu-4gb', ram: '4GB', cpu: '2 vCPU' },
    'vps8g4c': { size: 's-4vcpu-8gb', ram: '8GB', cpu: '4 vCPU' }
}

const vpsCommands = Object.keys(VPS_SPECS)

const pluginConfig = {
    name: vpsCommands,
    alias: [],
    category: 'vps',
    description: 'Create DigitalOcean VPS',
    usage: '.vps1g1c <hostname>',
    example: '.vps1g1c myserver',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

function generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let password = ''
    for (let i = 0; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)]
    }
    return password
}

function hasAccess(sender, isOwner) {
    if (isOwner) return true
    const cleanSender = sender?.split('@')[0]
    if (!cleanSender) return false
    const doConfig = config.digitalocean || {}
    const sellers = doConfig.sellers || []
    const ownerPanels = doConfig.ownerPanels || []
    return sellers.includes(cleanSender) || ownerPanels.includes(cleanSender)
}

async function handler(m, { sock }) {
    const doConfig = config.digitalocean || {}
    const token = doConfig.token
    
    if (!token) {
        return m.reply( `DigitalOcean belum disetup. Isi digitalocean.token di config.js`, "createvps")
    }
    
    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(raraWrap("Akses Ditolak", "🚫 Fitur ini hanya untuk Owner/Seller."))
    }
    
    const hostname = m.text?.trim()
    if (!hostname) {
        let paketTxt = `Cara pakai:\n${m.prefix}${m.command} <hostname>\n\n💡 *Contoh:* ${m.prefix}${m.command} myserver\n\nPaket tersedia:\n`
        for (const [cmd, spec] of Object.entries(VPS_SPECS)) {
            paketTxt += `${m.prefix}${cmd} - ${spec.ram} RAM, ${spec.cpu}\n`
        }
        return m.reply( paketTxt, "createvps")
    }
    
    if (!/^[a-zA-Z0-9-]+$/.test(hostname)) {
        return m.reply(raraWrap("Info", "❌ Hostname hanya boleh huruf, angka, dan dash."))
    }
    
    const spec = VPS_SPECS[m.command]
    if (!spec) {
        return m.reply( `Paket VPS tidak ditemukan.`, "createvps")
    }
    
    const password = generatePassword()
    const region = doConfig.region || 'sgp1'
    
    const dropletData = {
        name: hostname,
        region: region,
        size: spec.size,
        image: 'ubuntu-22-04-x64',
        ssh_keys: null,
        backups: false,
        ipv6: true,
        user_data: `#cloud-config
password: ${password}
chpasswd: { expire: False }
ssh_pwauth: True`,
        private_networking: null,
        volumes: null,
        tags: ['rara-bot']
    }
    await m.react("🕒");
    
    try {
        const response = await axios.post('https://api.digitalocean.com/v2/droplets', dropletData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        
        const droplet = response.data.droplet
        const dropletId = droplet.id
        
        await m.reply(raraWrap("VPS", `Menunggu VPS siap...\nID: ${dropletId}\nEstimasi: 60 detik`))
        
        await new Promise(resolve => setTimeout(resolve, 60000))
        
        const infoRes = await axios.get(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        const dropletInfo = infoRes.data.droplet
        const ipv4 = dropletInfo.networks?.v4?.find(n => n.type === 'public')
        const ip = ipv4?.ip_address || 'Tidak tersedia'
        
        const detailTxt = `
*ID:* ${dropletId}
│ *hostname:* ${hostname}
│ *IP:* ${ip}
│ *user:* root
│ *password:* ${password}


*ram:* ${spec.ram}
│ *cpu:* ${spec.cpu}
│ *region:* ${region}
│ *OS:* Ubuntu 22.04

Simpan data ini baik-baik!`
        
        await sock.sendMessage(m.sender, { text: detailTxt })
        await m.reply(raraWrap("VPS", "✅ VPS berhasil dibuat. Data dikirim ke private chat."))
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName, err))
    }
}

export { pluginConfig as config, handler };
