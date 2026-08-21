// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'

const pluginConfig = {
    name: ['turnon', 'turnoff', 'restartvps', 'rebootvps'],
    alias: [],
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
        return sendReplyWithNav(sock, m, `DigitalOcean belum disetup. Isi digitalocean.token di config.js`, "turnon")
    }
    
    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(`Akses ditolak. Fitur ini hanya untuk Owner/Seller.`)
    }
    
    const dropletId = m.text?.trim()
    if (!dropletId) {
        return sendReplyWithNav(sock, m, `Cara pakai:\n${m.prefix}${m.command} <droplet_id>`, "turnon")
    }
    
    const actions = {
        'turnon': { type: 'power_on', text: 'menghidupkan' },
        'turnoff': { type: 'power_off', text: 'mematikan' },
        'restartvps': { type: 'reboot', text: 'merestart' },
        'rebootvps': { type: 'reboot', text: 'merestart' }
    }
    
    const action = actions[m.command]
    if (!action) {
        return sendReplyWithNav(sock, m, `Aksi tidak dikenali.`, "turnon")
    }
    
    await m.reply(`Sedang ${action.text} VPS...\nID: ${dropletId}`)
    
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
        
        m.react('✅')
        await m.reply(`❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Aksi Berhasil
┊
  ┊  ➶ *VPS:* ${dropletId}
  ┊  ➶ *Aksi:* ${action.text}
  ┊  ➶ *Status:* ${actionResult.status}
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler };
