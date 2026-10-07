// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { isProtected as protectOn } from "../../src/lib/rara-cpanel-protect.js"
const pluginConfig = {
    name: 'delpanel',
    alias: ["delpanel"],
    category: 'panel',
    description: 'Hapus panel (server + user)',
    usage: '.delpanel [s1/s2/s3] serverid [full]',
    example: '.delpanel 5 atau .delpanel s2 5 full',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

function getServerConfig(pteroConfig, serverKey) {
    const num = parseInt(String(serverKey || '').replace('s', ''), 10)
    if (!(num >= 1 && num <= 100)) return pteroConfig.server1
    return pteroConfig['server' + num] || pteroConfig.server1
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
        const cfg = pteroConfig?.['server' + i]
        if (cfg?.domain && cfg?.apikey) available.push('s' + i)
    }
    return available
}

async function handler(m, { sock }) {
    // PROTEKSI (owner 7 Okt 2026): .cpanelprotect delete — owner bypass
    if (!m.isOwner && protectOn("delete")) {
        return m.reply(raraWrap("cpanelprotect", `🛡️ Panel sedang diproteksi owner.\n\nAksi hapus panel diblokir buat semua user (owner tetap bisa).\n\nStatus proteksi: ${(m.prefix || ".")}cpanelprotect settings`))
    }
    const pteroConfig = config.pterodactyl
    
    const args = m.text?.trim().split(' ') || []
    let serverKey = 's1'
    let restArgs = args
    
    // slot panel: s1 / 1 / 1-100 (default s1)
    const slotArg = String(args[0] || '').toLowerCase().match(/^s?(\d{1,3})$/)
    if (args[0] && slotArg) {
        const num = parseInt(slotArg[1], 10)
        if (num >= 1 && num <= 100) {
            serverKey = 's' + num
            restArgs = args.slice(1)
        }
    }
    
    const serverConfig = getServerConfig(pteroConfig, serverKey)
    const missingConfig = validateServerConfig(serverConfig)
    
    if (missingConfig.length > 0) {
        const available = getAvailableServers(pteroConfig)
        let txt = `⚠️ *sErver ${serverKey.toUpperCase()} Belum Konfig*\n\n`
        if (available.length > 0) {
            txt += `Server tersedia: *${available.join(', ')}*`
        }
        return await m.reply(raraWrap("delpanel", txt))
    }
    
    const serverId = restArgs[0]
    const option = restArgs[1]?.toLowerCase()
    const serverLabel = serverKey.toUpperCase()
    
    if (!serverId) {
        return m.reply(
            `⚠️ *cara pakai*\n\n` +
            `\`${m.prefix}delpanel ID\` - Hapus server saja\n` +
            `\`${m.prefix}delpanel ID full\` - Hapus server + user\n` +
            `\`${m.prefix}delpanel s2 ID\` - Dari server 2\n\n` +
            `Lihat ID dengan \`${m.prefix}listserver\``
        )
    }
    
    if (isNaN(serverId)) {
        return m.reply(raraWrap("delpanel", `❌ Server ID harus berupa angka.`))
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
        const userId = server.user
        
        let userInfo = null
        let isUserAdmin = false
        try {
            const userRes = await axios.get(`${serverConfig.domain}/api/application/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${serverConfig.apikey}` }
            })
            userInfo = userRes.data.attributes
            isUserAdmin = userInfo.root_admin
        } catch (e) { console.error('[delpanel.js]:', e.message); }
        
        await m.reply(`🗑️ *Menghapus Panel...*\n\nServer: *${serverLabel}*\nPanel: \`${server.name}\`\nMode: *${option === 'full' ? 'Server + User' : 'Server saja'}*`)
        
        await axios.delete(`${serverConfig.domain}/api/application/servers/${serverId}`, {
            headers: {
                'Authorization': `Bearer ${serverConfig.apikey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
        })
        
        let result = `✅ *sErver Dihapus [${serverLabel}]*\n\n`
        result += `Nama: \`${server.name}\`\n`
        result += `ID: \`${serverId}\`\n`
        
        if (option === 'full' && userInfo && !isUserAdmin) {
            try {
                await axios.delete(`${serverConfig.domain}/api/application/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${serverConfig.apikey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'Application/vnd.pterodactyl.v1+json'
                    }
                })
                result += `\n✅ *user dihapus*\n`
                result += `Username: \`${userInfo.username}\`\n`
                result += `ID: \`${userId}\``
            } catch (userErr) {
                result += `\n⚠️ User gagal dihapus (mungkin masih punya server lain)`
            }
        } else if (option === 'full' && isUserAdmin) {
            result += `\n⚠️ User adalah Admin, tidak dihapus`
        }
        
        return await m.reply(raraWrap("delpanel", result))
        
    } catch (err) {
        return m.reply(raraWrap("delpanel", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }