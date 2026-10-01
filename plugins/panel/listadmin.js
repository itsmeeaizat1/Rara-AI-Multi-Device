// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { hasAccessToServer, getUserRole, VALID_SERVERS } from '../../src/lib/rara-roles-cpanel.js'
import te from '../../src/lib/rara-error.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const allCommands = VALID_SERVERS.slice(0, 5).map(v => `listadmin${v}`)
const allAliases = VALID_SERVERS.map(v => `admins${v}`)

const pluginConfig = {
    name: allCommands,
    alias: allAliases,
    category: 'panel',
    description: 'List semua admin panel (v1-v100)',
    usage: '.listadminv1 atau .listadminv2',
    example: '.listadminv1',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
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
    const pteroConfig = config.pterodactyl
    
    const { server: serverVersion, serverKey } = parseServerVersion(m.command, m.args)
    const serverLabel = serverVersion.toUpperCase()
    
    if (!hasAccessToServer(m.sender, serverVersion, m.isOwner)) {
        const userRole = getUserRole(m.sender, serverVersion)
        return m.reply(raraWrap("listadmin", `❌ *akses ditolak*\n\n` +
            `Kamu tidak punya akses ke *${serverLabel}*\n` +
            `Role kamu: *${userRole || 'Tidak ada'}*`))
    }
    
    const serverConfig = getServerConfig(pteroConfig, serverKey)
    const missingConfig = validateConfig(serverConfig)
    
    if (missingConfig.length > 0) {
        const available = getAvailableServers(pteroConfig)
        let txt = `⚠️ *sErver ${serverLabel} Belum Konfig*\n\n`
        if (available.length > 0) {
            txt += `Server tersedia: *${available.join(', ')}*`
        } else {
            txt += `Isi di \`config.js\` bagian \`pterodactyl.server1\``
        }
        return m.reply(raraWrap("listadmin", txt))
    }
    
    try {
        const res = await axios.get(`${serverConfig.domain}/api/application/users`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        const users = res.data.data || []
        const admins = users.filter(u => u.attributes.root_admin)
        
        if (admins.length === 0) {
            return m.reply(raraWrap("listadmin", `📋 *Daftar Admin [${serverLabel}]*\n\nTidak ada admin terdaftar.`))
        }
        
        let txt = `📋 *Daftar Admin [${serverLabel}]*\n\n`
        txt += `Total: *${admins.length}* admin\n\n`
        
        admins.forEach((u, i) => {
            const attr = u.attributes
            txt += `${i + 1}. *${attr.username}*\n`
            txt += `   └ ID: \`${attr.id}\` | Email: \`${attr.email}\`\n`
        })
        
        return m.reply(raraWrap("listadmin", txt))
        
    } catch (err) {
        return m.reply(raraWrap("listadmin", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }