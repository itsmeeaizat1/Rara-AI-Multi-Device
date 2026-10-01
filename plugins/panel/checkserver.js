// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js"
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js"
import axios from 'axios'

const pluginConfig = {
    name: 'cekserver',
    alias: ["cekserver"],
    category: 'panel',
    description: 'Cek status & resource usage server panel via Client API',
    usage: '.cekserver atau .cekserver <serverid>',
    example: '.cekserver',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function getPanelKey(m) {
    const db = getDatabase()
    const panelKeys = db.setting('panelClientKeys') || {}
    return panelKeys[m.sender] || null
}

const STATUS_MAP = {
    'running': 'ONLINE',
    'starting': 'STARTING',
    'stopping': 'STOPPING',
    'offline': 'OFFLINE',
    'crashed': 'CRASHED'
}

async function handler(m, { sock }) {
    const prefix = m.prefix || '.'
    const panelKey = await getPanelKey(m)
    
    if (!panelKey || !panelKey.ptlc) {
        return m.reply(raraWrap('Panel', 
            'Belum ada Client API Key (ptlc_) tersimpan\n\n' +
            'ptlc_ otomatis dibuat saat kamu create panel (.1gbv1)\n' +
            'Kalau panel dibuat sebelum fitur ini, generate manual di:\n' +
            'panel-lu.com/account/api'
        ))
    }
    
    const serverId = m.text?.trim()?.split(' ')[0] || panelKey.serverId
    if (!serverId) {
        return m.reply(raraWrap('Panel', 'Server ID tidak ditemukan. Gunakan: ' + prefix + 'cekserver <serverid>'))
    }
    
    try {
        // Get server state
        const stateRes = await axios.get(
            `${panelKey.domain}/api/client/servers/${serverId}/resources`,
            {
                headers: {
                    Authorization: `Bearer ${panelKey.ptlc}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                timeout: 10000
            }
        )
        
        // Get server details
        const detailsRes = await axios.get(
            `${panelKey.domain}/api/client/servers/${serverId}`,
            {
                headers: {
                    Authorization: `Bearer ${panelKey.ptlc}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                timeout: 10000
            }
        )
        
        const state = stateRes.data?.attributes || stateRes.data?.data?.attributes || {}
        const details = detailsRes.data?.attributes || detailsRes.data?.data?.attributes || {}
        const serverName = details.name || panelKey.serverLabel || serverId
        const status = STATUS_MAP[state.status] || state.current_state || 'UNKNOWN'
        
        // Resource usage
        const cpuUsage = state.resource_stats?.cpu_absolute || state.cpu_absolute || 0
        const memUsage = state.resource_stats?.memory_bytes || state.memory_bytes || 0
        const diskUsage = state.resource_stats?.disk_bytes || state.disk_bytes || 0
        
        // Format bytes to MB
        const fmtBytes = (b) => b > 0 ? (b / 1024 / 1024).toFixed(1) + ' MB' : '0 MB'
        
        let txt = `SERVER STATUS\n\n`
        txt += `Name: ${serverName}\n`
        txt += `Server ID: ${serverId}\n`
        txt += `Status: *${status}*\n`
        txt += `Panel: ${panelKey.domain}\n\n`
        txt += `RESOURCE USAGE\n\n`
        txt += `CPU: ${cpuUsage}%\n`
        txt += `Memory: ${fmtBytes(memUsage)}\n`
        txt += `Disk: ${fmtBytes(diskUsage)}\n`
        
        if (state.uptime !== undefined) {
            const uptimeSec = state.uptime
            if (uptimeSec > 0) {
                const hours = Math.floor(uptimeSec / 3600)
                const mins = Math.floor((uptimeSec % 3600) / 60)
                txt += `Uptime: ${hours}j ${mins}m\n`
            } else {
                txt += `Uptime: Offline\n`
            }
        }
        
        await m.reply(raraWrap('Panel', txt))
    } catch (err) {
        const rawMsg = err?.response?.data?.errors?.[0]?.detail || err.message
        return m.reply(raraWrap('Panel', `Gagal cek server\n\n${rawMsg}`))
    }
}

export { pluginConfig as config, handler }
