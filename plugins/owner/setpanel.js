// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import config from '../../config.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js"
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js"

const pluginConfig = {
    name: 'setpanel',
    alias: ['setdomainpanel', 'panelset', 'updatepanel'],
    category: 'owner',
    description: 'Update domain & key panel pterodactyl (untuk Cloudflare tunnel dinamis)',
    usage: '.setpanel <v1-v5> <domain> atau .setpanel <v1-v5> apikey <key> atau .setpanel <v1-v5> capikey <key>',
    example: '.setpanel v1 https://abc.trycloudflare.com',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const CONFIG_PATH = path.join(process.cwd(), 'config.js')

function updateConfigField(serverKey, field, value) {
    if (!fs.existsSync(CONFIG_PATH)) return { success: false, error: 'config.js tidak ditemukan' }

    let content = fs.readFileSync(CONFIG_PATH, 'utf8')

    // Pattern: cari server block, lalu cari field di dalamnya
    // Contoh: server1: { ... domain: "" ... }
    const serverBlockPattern = new RegExp(
        '(' + serverKey + '\\s*:\\s*\\{[^}]*?' + field + '\\s*:\\s*)"[^"]*"',
        's'
    )

    if (serverBlockPattern.test(content)) {
        content = content.replace(serverBlockPattern, '$1"' + value + '"')
        fs.writeFileSync(CONFIG_PATH, content, 'utf8')
        return { success: true }
    }

    return { success: false, error: 'Field ' + field + ' di ' + serverKey + ' tidak ditemukan' }
}

async function handler(m, { sock }) {
    const prefix = m.prefix || '.'
    const args = m.args || []
    const text = m.text || ''

    if (!args[0]) {
        const ptero = config.pterodactyl || {}
        const getStatus = (cfg) => (cfg?.domain && cfg?.apikey) ? 'ON' : 'OFF'

        let txt = 'SET PANEL CONFIG\n\n'
        txt += 'Update domain & key panel langsung dari sini.\nCocok untuk Cloudflare tunnel yang URL-nya berubah.\n\n'
        txt += 'Status Panel:\n'
        for (let i = 1; i <= 5; i++) {
            const s = ptero['server' + i] || {}
            txt += '  v' + i + ': ' + getStatus(s) + '\n'
            if (s.domain) txt += '    Domain: ' + s.domain + '\n'
        }

        txt += '\nCara pakai:\n'
        txt += '  ' + prefix + 'setpanel v1 https://domain.com\n'
        txt += '  (set domain panel server v1)\n\n'
        txt += '  ' + prefix + 'setpanel v1 apikey ptla_xxxx\n'
        txt += '  (set application API key)\n\n'
        txt += '  ' + prefix + 'setpanel v1 capikey ptlc_xxxx\n'
        txt += '  (set client API key)\n\n'
        txt += '  ' + prefix + 'setpanel v1 egg 15\n'
        txt += '  (set egg ID)\n\n'
        txt += '  ' + prefix + 'setpanel v1 nestid 5\n'
        txt += '  (set nest ID)\n\n'
        txt += '  ' + prefix + 'setpanel v1 location 1\n'
        txt += '  (set location ID)\n\n'
        txt += '  ' + prefix + 'setpanel status\n'
        txt += '  (cek status semua server)'

        return m.reply(claraWrap('setpanel', txt))
    }

    // .setpanel status
    if (args[0].toLowerCase() === 'status') {
        const ptero = config.pterodactyl || {}
        let txt = 'PANEL STATUS\n\n'
        for (let i = 1; i <= 5; i++) {
            const s = ptero['server' + i] || {}
            const hasDomain = s.domain ? 'YES' : 'NO'
            const hasApi = s.apikey ? 'YES' : 'NO'
            const hasCApi = s.capikey ? 'YES' : 'NO'
            txt += 'v' + i + ':\n'
            txt += '  Domain: ' + hasDomain + (s.domain ? ' (' + s.domain + ')' : '') + '\n'
            txt += '  API Key: ' + hasApi + '\n'
            txt += '  Client Key: ' + hasCApi + '\n'
            if (s.egg) txt += '  Egg: ' + s.egg + ' | Nest: ' + s.nestid + ' | Loc: ' + s.location + '\n'
            txt += '\n'
        }
        return m.reply(claraWrap('setpanel', txt))
    }

    // Parse: .setpanel v1 <domain> atau .setpanel v1 <field> <value>
    const serverArg = args[0].toLowerCase()
    const serverNum = serverArg.match(/^v?([1-5])$/)?.[1]
    if (!serverNum) {
        return m.reply(claraWrap('setpanel', 'Server tidak valid. Gunakan v1 sampai v5.\n\nContoh: ' + prefix + 'setpanel v1 https://domain.com'))
    }

    const serverKey = 'server' + serverNum

    // Cek apakah args[1] adalah field name atau domain
    const fieldNames = ['apikey', 'capikey', 'egg', 'nestid', 'location']
    const secondArg = args[1]?.toLowerCase()

    if (secondArg && fieldNames.includes(secondArg)) {
        // .setpanel v1 apikey <value>
        const value = args[2]
        if (!value) {
            return m.reply(claraWrap('setpanel', 'Value tidak boleh kosong.\n\nContoh: ' + prefix + 'setpanel v1 apikey ptla_xxxx'))
        }

        // Jangan tampilkan key di response
        const maskedValue = secondArg.includes('key') ? value.substring(0, 6) + '...' : value
        const result = updateConfigField(serverKey, secondArg, value)
        if (result.success) {
            // Update config object in memory juga
            if (config.pterodactyl?.[serverKey]) {
                config.pterodactyl[serverKey][secondArg] = value
            }
            return m.reply(claraWrap('setpanel', serverArg.toUpperCase() + ' ' + secondArg + ' berhasil diupdate\n\nNilai: ' + maskedValue + '\n\nPerubahan langsung aktif, tidak perlu restart'))
        } else {
            return m.reply(claraWrap('setpanel', 'Gagal update: ' + result.error))
        }
    } else if (args[1]) {
        // .setpanel v1 https://domain.com (set domain)
        let domain = args[1]
        // Pastikan ada https://
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
            domain = 'https://' + domain
        }
        // Hapus trailing slash
        domain = domain.replace(/\/+$/, '')

        const result = updateConfigField(serverKey, 'domain', domain)
        if (result.success) {
            if (config.pterodactyl?.[serverKey]) {
                config.pterodactyl[serverKey].domain = domain
            }
            return m.reply(claraWrap('setpanel', serverArg.toUpperCase() + ' domain berhasil diupdate\n\nDomain: ' + domain + '\n\nPerubahan langsung aktif, tidak perlu restart'))
        } else {
            return m.reply(claraWrap('setpanel', 'Gagal update domain: ' + result.error))
        }
    } else {
        return m.reply(claraWrap('setpanel', 'Format salah.\n\nContoh:\n  ' + prefix + 'setpanel v1 https://domain.com\n  ' + prefix + 'setpanel v1 apikey ptla_xxxx'))
    }
}

export { pluginConfig as config, handler }
