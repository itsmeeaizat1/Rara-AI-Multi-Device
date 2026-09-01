// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import { hasAccessToServer, getUserRole, VALID_SERVERS } from '../../src/lib/nova-roles-cpanel.js'
import te from '../../src/lib/nova-error.js'
const allCommands = VALID_SERVERS.map(v => `serverinfo${v}`)
const allAliases = VALID_SERVERS.map(v => `sinfo${v}`)

const pluginConfig = {
    name: allCommands,
    alias: allAliases,
    category: 'panel',
    description: 'Info detail server (v1-v5)',
    usage: '.serverinfov1 serverid',
    example: '.serverinfov2 5',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function parseServerVersion(cmd) {
    const match = cmd.match(/v([1-5])$/i)
    if (!match) return { server: 'v1', serverKey: 's1' }
    return { server: 'v' + match[1], serverKey: 's' + match[1] }
}

function getServerConfig(pteroConfig, serverKey) {
    const serverConfigs = {
        's1': pteroConfig.server1,
        's2': pteroConfig.server2,
        's3': pteroConfig.server3,
        's4': pteroConfig.server4,
        's5': pteroConfig.server5
    }
    return serverConfigs[serverKey] || null
}

function validateServerConfig(serverConfig) {
    const missing = []
    if (!serverConfig?.domain) missing.push('domain')
    if (!serverConfig?.apikey) missing.push('apikey (PTLA)')
    return missing
}

function getAvailableServers(pteroConfig) {
    const available = []
    for (let i = 1; i <= 5; i++) {
        const cfg = pteroConfig[`server${i}`]
        if (cfg?.domain && cfg?.apikey) available.push(`v${i}`)
    }
    return available
}

function formatBytes(bytes) {
    if (bytes === 0) return 'Unlimited'
    const mb = bytes
    if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
    return `${mb} MB`
}

async function handler(m, { sock }) {
    const pteroConfig = config.pterodactyl
    
    const { server: serverVersion, serverKey } = parseServerVersion(m.command)
    const serverLabel = serverVersion.toUpperCase()
    
    if (!hasAccessToServer(m.sender, serverVersion, m.isOwner)) {
        const userRole = getUserRole(m.sender, serverVersion)
        return m.reply(claraWrap("serverinfo", `❌ *ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ*\n\n` +
            `Kamu tidak punya akses ke *${serverLabel}*\n` +
            `Role kamu: *${userRole || 'Tidak ada'}*`))
    }
    
    const serverId = m.text?.trim()
    
    const serverConfig = getServerConfig(pteroConfig, serverKey)
    const missingConfig = validateServerConfig(serverConfig)
    
    if (missingConfig.length > 0) {
        const available = getAvailableServers(pteroConfig)
        let txt = `⚠️ *sErver ${serverLabel} Belum Konfig*\n\n`
        if (available.length > 0) {
            txt += `Server tersedia: *${available.join(', ')}*`
        }
        return m.reply(claraWrap("serverinfo", txt))
    }
    
    if (!serverId || isNaN(serverId)) {
        return m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `\`${m.prefix}${m.command} serverid\`\n\n` +
            `Lihat ID dengan \`${m.prefix}listserver${serverVersion}\``, "serverinfo")
    }
    
    try {
        const serverRes = await axios.get(`${serverConfig.domain}/api/application/servers/${serverId}`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        const s = serverRes.data.attributes
        const limits = s.limits || {}
        const features = s.feature_limits || {}
        
        let txt = `📊 *Info sErver [${serverLabel}]*\n\n`
        txt += ""
        txt += `🆔 \`Id\`: *${s.id}*\n`
        txt += `📛 \`Nama\`: *${s.name}*\n`
        txt += `👤 \`Owner Id\`: *${s.user}*\n`
        txt += `📝 \`Deskripsi\`: *${s.description || '-'}*\n`
        txt += `📊 \`sTatus\`: *${s.suspended ? '⛔ Suspended' : '✅ Active'}*\n`
        txt += `\n`
        txt += ""
        txt += `💾 \`Ram\`: *${formatBytes(limits.memory)}*\n`
        txt += `⚡ \`Cpu\`: *${limits.cpu === 0 ? 'Unlimited' : limits.cpu + '%'}*\n`
        txt += `📦 \`Disk\`: *${formatBytes(limits.disk)}*\n`
        txt += `🔄 \`sWap\`: *${limits.swap} MB*\n`
        txt += `\n`
        txt += ""
        txt += `🗄️ \`Database\`: *${features.databases}*\n`
        txt += `💾 \`Backup\`: *${features.backups}*\n`
        txt += `🔌 \`Allocations\`: *${features.allocations}*\n`
        txt += ""
        
        return m.reply(claraWrap("serverinfo", txt))
        
    } catch (err) {
        return m.reply(claraWrap("serverinfo", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }