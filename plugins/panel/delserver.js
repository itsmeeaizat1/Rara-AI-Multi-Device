// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { hasAccessToServer, getUserRole, VALID_SERVERS } from '../../src/lib/rara-roles-cpanel.js'
import te from '../../src/lib/rara-error.js'
import { isProtected as protectOn } from "../../src/lib/rara-cpanel-protect.js"
const allCommands = VALID_SERVERS.slice(0, 5).map(v => `delserver${v}`)
const allAliases = VALID_SERVERS.map(v => `hapusserver${v}`)

const pluginConfig = {
    name: allCommands,
    alias: allAliases,
    category: 'panel',
    description: 'Hapus server dari panel (v1-v100)',
    usage: '.delserverv1 serverid',
    example: '.delserverv2 5',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

function parseServerVersion(cmd, args) {
    let num = null
    const suffix = String(cmd || '').match(/v(\d{1,3})$/i)
    if (suffix) num = parseInt(suffix[1], 10)
    // Override via argumen: .listserver 50 / .listserver v50 (support v1-v100)
    if (args && args.length) {
        const am = String(args[0] || '').trim().match(/^v?(\d{1,3})$/i)
        if (am) num = parseInt(am[1], 10)
    }
    if (num === null || !(num >= 1 && num <= 100)) num = 1
    return { server: 'v' + num, serverKey: 's' + num }
}

function getServerConfig(pteroConfig, serverKey) {
    const num = parseInt(String(serverKey || '').replace('s', ''), 10)
    if (!(num >= 1 && num <= 100)) return null
    return pteroConfig['server' + num] || null
}

function validateConfig(serverConfig) {
    const missing = []
    if (!serverConfig?.domain) missing.push('domain')
    if (!serverConfig?.apikey) missing.push('apikey (PTLA)')
    return missing
}

function getAvailableServers(pteroConfig) {
    const available = []
    for (let i = 1; i <= 100; i++) {
        const cfg = pteroConfig[`server${i}`]
        if (cfg?.domain && cfg?.apikey) available.push(`v${i}`)
    }
    return available
}

async function handler(m, { sock }) {
    // PROTEKSI (owner 7 Okt 2026): .cpanelprotect delete — owner bypass
    if (!m.isOwner && protectOn("delete")) {
        return m.reply(raraWrap("cpanelprotect", `🛡️ Server sedang diproteksi owner.\n\nAksi hapus server diblokir buat semua user (owner tetap bisa).\n\nStatus proteksi: ${(m.prefix || ".")}cpanelprotect settings`))
    }
    const pteroConfig = config.pterodactyl
    
    const { server: serverVersion, serverKey } = parseServerVersion(m.command, m.args)
    const serverLabel = serverVersion.toUpperCase()
    
    if (!hasAccessToServer(m.sender, serverVersion, m.isOwner)) {
        const userRole = getUserRole(m.sender, serverVersion)
        return m.reply(raraWrap("delserver", `❌ *akses ditolak*\n\n` +
            `Kamu tidak punya akses ke *${serverLabel}*\n` +
            `Role kamu: *${userRole || 'Tidak ada'}*`))
    }
    
    const serverId = m.text?.trim()
    
    const serverConfig = getServerConfig(pteroConfig, serverKey)
    const missingConfig = validateConfig(serverConfig)
    
    if (missingConfig.length > 0) {
        const available = getAvailableServers(pteroConfig)
        let txt = `⚠️ *sErver ${serverLabel} Belum Konfig*\n\n`
        if (available.length > 0) {
            txt += `Server tersedia: *${available.join(', ')}*\n`
            txt += `Contoh: \`${m.prefix}delserver${available[0]} serverid\``
        } else {
            txt += `Isi config pterodactyl di \`config.js\``
        }
        return m.reply(raraWrap("delserver", txt))
    }
    
    if (!serverId || isNaN(serverId)) {
        const available = getAvailableServers(pteroConfig)
        return m.reply( `⚠️ *cara pakai*\n\n` +
            `\`${m.prefix}${m.command} serverid\`\n\n` +
            `Server tersedia: *${available.join(', ') || 'none'}*\n` +
            `Lihat ID dengan \`${m.prefix}listserver${serverVersion}\``, "delserver")
    }
    
    try {
        const serverRes = await axios.get(`${serverConfig.domain}/api/application/servers/${serverId}`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        const server = serverRes.data.attributes
        
        await axios.delete(`${serverConfig.domain}/api/application/servers/${serverId}`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        return m.reply(`✅ *Server Dihapus*\n\n` +
            `Panel: *${serverLabel}*\n` +
            `Server ID: \`${serverId}\`\n` +
            `Nama: \`${server.name}\``)
        
    } catch (err) {
        return m.reply(raraWrap("delserver", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }