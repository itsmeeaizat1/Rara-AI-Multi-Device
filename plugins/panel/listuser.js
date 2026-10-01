// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import { hasAccessToServer, getUserRole, VALID_SERVERS } from '../../src/lib/nova-roles-cpanel.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const allCommands = VALID_SERVERS.slice(0, 5).map(v => `listuser${v}`)
const allAliases = [
    ...VALID_SERVERS.map(v => `users${v}`),
    ...VALID_SERVERS.map(v => `listpanel${v}`)
]

const pluginConfig = {
    name: allCommands,
    alias: allAliases,
    category: 'panel',
    description: 'List semua user di panel (v1-v100)',
    usage: '.listuserv1 atau .listuserv2',
    example: '.listuserv1',
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

function validateServerConfig(serverConfig) {
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
        return m.reply(claraWrap("listuser", `❌ *akses ditolak*\n\n` +
            `Kamu tidak punya akses ke *${serverLabel}*\n` +
            `Role kamu: *${userRole || 'Tidak ada'}*`))
    }
    
    const serverConfig = getServerConfig(pteroConfig, serverKey)
    const missingConfig = validateServerConfig(serverConfig)
    
    if (missingConfig.length > 0) {
        const available = getAvailableServers(pteroConfig)
        let txt = `⚠️ *sErver ${serverLabel} Belum Konfig*\n\n`
        if (available.length > 0) {
            txt += `Server tersedia: *${available.join(', ')}*\n`
            txt += `Contoh: \`${m.prefix}listuser${available[0]}\``
        } else {
            txt += `Isi config pterodactyl di \`config.js\``
        }
        return m.reply(claraWrap("listuser", txt))
    }
    
    try {
        const res = await axios.get(`${serverConfig.domain}/api/application/users?per_page=100`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        const users = res.data.data || []
        
        if (users.length === 0) {
            return m.reply(claraWrap("listuser", `📋 *Daftar User [${serverLabel}]*\n\nTidak ada user terdaftar.`))
        }
        
        let txt = `📋 *Daftar User [${serverLabel}]*\n\n`
        txt += `Total: *${users.length}* user\n\n`
        
        users.slice(0, 20).forEach((u, i) => {
            const attr = u.attributes
            const isAdmin = attr.root_admin ? ' 👑' : ''
            txt += `${i + 1}. *${attr.username}*${isAdmin}\n`
            txt += `   ├ ID: \`${attr.id}\`\n`
            txt += `   └ Email: \`${attr.email}\`\n`
        })
        
        if (users.length > 20) {
            txt += `\n... dan ${users.length - 20} user lainnya`
        }
        
        const available = getAvailableServers(pteroConfig)
        if (available.length > 1) {
            txt += `\n\nServer lain: *${available.filter(s => s !== serverVersion).join(', ')}*`
        }
        
        return m.reply(claraWrap("listuser", txt))
        
    } catch (err) {
        return m.reply(claraWrap("listuser", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }