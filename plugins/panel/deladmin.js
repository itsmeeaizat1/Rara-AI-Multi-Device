// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { hasFullAccess, getUserRole, VALID_SERVERS } from '../../src/lib/nova-roles-cpanel.js'
import te from '../../src/lib/nova-error.js'
const allCommands = VALID_SERVERS.slice(0, 5).map(v => `deladmin${v}`)
const allAliases = VALID_SERVERS.map(v => `hapusadmin${v}`)

const pluginConfig = {
    name: allCommands,
    alias: allAliases,
    category: 'panel',
    description: 'Hapus admin panel (v1-v100)',
    usage: '.deladminv1 userid',
    example: '.deladminv2 5',
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
    const pteroConfig = config.pterodactyl
    
    const { server: serverVersion, serverKey } = parseServerVersion(m.command, m.args)
    const serverLabel = serverVersion.toUpperCase()
    
    // FIX 10 Sep 2026 (request owner hierarki): hapus admin panel hanya
    // Owner & CEO (admin panel). Reseller tidak boleh menghapus admin panel.
    if (!hasFullAccess(m.sender, serverVersion, m.isOwner)) {
        const userRole = getUserRole(m.sender, serverVersion)
        return m.reply(novaWrap("deladmin", `❌ *akses ditolak*\n\n` +
            `Hapus admin panel hanya untuk *Owner* & *CEO (admin panel)*\n` +
            `Role kamu: *${userRole || 'Tidak ada'}* | Server: *${serverLabel}*`))
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
        return m.reply(novaWrap("deladmin", txt))
    }
    
    const userId = m.text?.trim()
    
    if (!userId || isNaN(userId)) {
        return m.reply( `⚠️ *cara pakai*\n\n` +
            `\`${m.prefix}${m.command} userid\`\n\n` +
            `Lihat user ID dengan \`${m.prefix}listadmin${serverVersion}\``, "deladmin")
    }
    
    try {
        const userRes = await axios.get(`${serverConfig.domain}/api/application/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        const user = userRes.data.attributes
        
        await axios.delete(`${serverConfig.domain}/api/application/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        return m.reply(`✅ *Admin Dihapus [${serverLabel}]*\n\n` +
            `User ID: \`${userId}\`\n` +
            `Username: \`${user.username}\`\n` +
            `Email: \`${user.email}\``)
        
    } catch (err) {
        return m.reply(novaWrap("deladmin", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }