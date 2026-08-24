// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js"
import { getDatabase } from "../../src/lib/nova-database.js"
import axios from 'axios'

const pluginConfig = {
    name: 'stopserver',
    alias: ['stoppanel', 'stopsrv'],
    category: 'panel',
    description: 'Stop server panel via Client API (ptlc_)',
    usage: '.stopserver atau .stopserver <serverid>',
    example: '.stopserver',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function getPanelKey(m) {
    const db = getDatabase()
    const panelKeys = db.setting('panelClientKeys') || {}
    return panelKeys[m.sender] || null
}

async function handler(m, { sock }) {
    const prefix = m.prefix || '.'
    const panelKey = await getPanelKey(m)
    
    if (!panelKey || !panelKey.ptlc) {
        return m.reply(claraWrap('Panel', 
            'Belum ada Client API Key (ptlc_) tersimpan\n\n' +
            'ptlc_ otomatis dibuat saat kamu create panel (.1gbv1)\n' +
            'Kalau panel dibuat sebelum fitur ini, generate manual di:\n' +
            'panel-lu.com/account/api'
        ))
    }
    
    const serverId = m.text?.trim()?.split(' ')[0] || panelKey.serverId
    if (!serverId) {
        return m.reply(claraWrap('Panel', 'Server ID tidak ditemukan. Gunakan: ' + prefix + 'stopserver <serverid>'))
    }
    
    try {
        const res = await axios.post(
            `${panelKey.domain}/api/client/servers/${serverId}/power`,
            { signal: 'stop' },
            {
                headers: {
                    Authorization: `Bearer ${panelKey.ptlc}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                timeout: 10000
            }
        )
        
        await m.reply(claraWrap('Panel', 
            `Server Stopped\n\n` +
            `Server: ${panelKey.serverLabel || serverId}\n` +
            `Domain: ${panelKey.domain}\n` +
            `Status: Stopping...`
        ))
    } catch (err) {
        const rawMsg = err?.response?.data?.errors?.[0]?.detail || err.message
        return m.reply(claraWrap('Panel', `Gagal stop server\n\n${rawMsg}`))
    }
}

export { pluginConfig as config, handler }
