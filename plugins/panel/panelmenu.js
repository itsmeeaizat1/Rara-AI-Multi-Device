// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// panelmenu.js — Menu panel Pterodactyl (dipindah dari .cpanel yang kini jadi pusat kontrol)
import config from '../../config.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js"
import { getAccessibleServers, hasAccessToServer, VALID_SERVERS } from '../../src/lib/rara-roles-cpanel.js'

// command suffix hanya diregistrasi v1-v5; slot 6-100 pakai bentuk argumen (.listserver 50)
const MENU_SERVERS = VALID_SERVERS.slice(0, 5)

const pluginConfig = {
    name: 'panelmenu',
    alias: ["panelmenu"],
    category: 'panel',
    description: 'Menu panel pterodactyl (v1-v100)',
    usage: '.panelmenu',
    example: '.panelmenu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    // Cek akses: owner atau punya panel role (reseller/ceo/owner panel)
    if (!m.isOwner) {
        const userServers = getAccessibleServers(m.sender)
        if (userServers.length === 0) {
            return m.reply(raraWrap("panelmenu",
                "Akses Ditolak\n\n" +
                "Hanya *bot owner* atau *Reseller/CEO Panel* yang bisa akses menu ini\n\n" +
                "Minta owner untuk add kamu sebagai reseller:\n" +
                ".addreseller v1 @tag"
            ))
        }
    }

    const pteroConfig = config.pterodactyl
    const prefix = m.prefix || '.'
    
    const getStatus = (cfg) => (cfg?.domain && cfg?.apikey) ? '✅' : '❌'
    
    // status slot: tampil yang terkonfigurasi (1-100)
    const statusParts = []
    for (let i = 1; i <= 100; i++) {
        const cfg = pteroConfig?.['server' + i]
        if (cfg?.domain || cfg?.apikey) statusParts.push(`v${i}: ${getStatus(cfg)}`)
    }
    
    const userServers = getAccessibleServers(m.sender)
    const userRoleList = userServers.map(s => s.server.toUpperCase() + ':' + s.role).join(', ') || 'Tidak ada'
    
    let txt = `Cpanel Menu v3.0\n\n`
    txt += statusParts.length > 0
        ? `Panel Aktif (dari 100 slot):\n${statusParts.join(' | ')}\n`
        : `Belum ada panel terkonfigurasi (100 slot tersedia)\n`
    txt += `\nRole kamu: *${m.isOwner ? 'Bot Owner' : userRoleList}*\n`
    txt += `Pusat kontrol: \`${prefix}cpanel\` (start/stop/restart/status/upload/create)\n\n`
    
    // Reseller hanya lihat command yang relevan
    const isResellerOnly = !m.isOwner && userServers.every(s => s.role === 'reseller')
    
    if (!isResellerOnly) {
        txt += "\n"
        for (const ver of MENU_SERVERS) {
            txt += `\`${prefix}addowner${ver}\` | \`${prefix}delowner${ver}\` | \`${prefix}listowner${ver}\`\n`
        }
        txt += `\n`
        
        for (const ver of MENU_SERVERS) {
            txt += `\`${prefix}addceo${ver}\` | \`${prefix}delceo${ver}\` | \`${prefix}listceo${ver}\`\n`
        }
        txt += `\n`
        
        for (const ver of MENU_SERVERS) {
            txt += `\`${prefix}addreseller${ver}\` | \`${prefix}delreseller${ver}\` | \`${prefix}listreseller${ver}\`\n`
        }
        txt += `\n`
    }
    
    txt += "\n"
    for (const ver of MENU_SERVERS) {
        txt += `\`${prefix}1gb${ver}\` - \`${prefix}10gb${ver}\` | \`${prefix}unli${ver}\`\n`
    }
    txt += `Slot 6-100: \`${prefix}cpanel <ram> <username>,<nomor>,<idpanel>\`\n\n`
    
    txt += "\n"
    for (const ver of MENU_SERVERS) {
        txt += `\`${prefix}cadmin${ver}\` | \`${prefix}deladmin${ver}\` | \`${prefix}listadmin${ver}\`\n`
    }
    txt += `\n`
    
    for (const ver of MENU_SERVERS) {
        txt += `\`${prefix}listserver${ver}\` | \`${prefix}delserver${ver}\` | \`${prefix}serverinfo${ver}\`\n`
    }
    txt += `Slot 6-100: \`${prefix}listserver 50\` | \`${prefix}delserver 50\` | \`${prefix}serverinfo 50\`\n\n`
    
    for (const ver of MENU_SERVERS) {
        txt += `\`${prefix}listuser${ver}\`\n`
    }
    txt += `Slot 6-100: \`${prefix}listuser 50\`\n\n`
    
    if (!isResellerOnly) {
        txt += "\n"
        for (const ver of MENU_SERVERS) {
            txt += `\`${prefix}addgcseller${ver}\` | \`${prefix}resetgcseller${ver}\`\n`
        }
        txt += `\n`
        
        const doConfig = config.digitalocean || {}
        const doHasToken = doConfig.token ? '✅' : '❌'
        
        txt += "\n"
        txt += `Status: ${doHasToken} Token\n`
        txt += `│\n`
        txt += `Create Vps:\n`
        txt += `\`${prefix}vps1g1c\` - 1GB/1CPU\n`
        txt += `\`${prefix}vps2g1c\` - 2GB/1CPU\n`
        txt += `\`${prefix}vps4g2c\` - 4GB/2CPU\n`
        txt += `\`${prefix}vps8g4c\` - 8GB/4CPU\n`
        txt += `│\n`
        txt += `Manage:\n`
        txt += `\`${prefix}listvps\` | \`${prefix}cekvps\` | \`${prefix}delvps\` | \`${prefix}sisavps\`\n`
        txt += `\`${prefix}myvps\` | \`${prefix}gantipwvps <id/ip>\` | \`${prefix}installpanel\` | \`${prefix}installtema\`\n`
        txt += `│\n`
        txt += `Kontrol:\n`
        txt += `\`${prefix}turnon\` | \`${prefix}turnoff\` | \`${prefix}restartvps\`\n`
        txt += `\n`
    }
    
    txt += `_Powered by ${config.info?.website || 'RaraAI'}_`
    return m.reply(raraWrap("panelmenu", txt))
}

export { pluginConfig as config, handler }
