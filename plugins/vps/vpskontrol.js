// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'

const pluginConfig = {
    name: ['turnon', 'turnoff', 'restartvps', 'rebootvps'],
    alias: ["turnon", "turnoff", "restartvps", "rebootvps"],
    category: 'vps',
    description: 'Kontrol VPS (on/off/restart)',
    usage: '.turnon <id>',
    example: '.turnon 123456789',
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
        return m.reply( `DigitalOcean belum disetup. Isi digitalocean.token di config.js`, "turnon")
    }
    
    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(raraWrap("Akses Ditolak", "\U0001f6ab Fitur ini hanya untuk Owner/Seller."))
    }
    
    const dropletId = m.text?.trim()
    if (!dropletId) {
        return m.reply( raraWrap("vpskontrol", `Cara pakai:\n${m.prefix}${m.command} <droplet_id>`, "guide"), "turnon")
    }
    
    const actions = {
        'turnon': { type: 'power_on', text: 'menghidupkan' },
        'turnoff': { type: 'power_off', text: 'mematikan' },
        'restartvps': { type: 'reboot', text: 'merestart' },
        'rebootvps': { type: 'reboot', text: 'merestart' }
    }
    
    const action = actions[m.command]
    if (!action) {
        return m.reply( `Aksi tidak dikenali.`, "turnon")
    }
    
    await m.reply(raraWrap("VPS", `\u23f3 Sedang ${action.text} VPS...\nID: ${dropletId}`))
    
    try {
        const response = await axios.post(
            `https://api.digitalocean.com/v2/droplets/${dropletId}/actions`,
            { type: action.type },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        )
        
        const actionResult = response.data.action
        await m.reply(`✅ *Aksi Berhasil*\n\n` +
            `VPS: ${dropletId}\n` +
            `Aksi: ${action.text}\n` +
            `Status: ${actionResult.status}`)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName, err))
    }
}

export { pluginConfig as config, handler };
