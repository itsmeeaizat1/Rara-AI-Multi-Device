// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import config from '../../config.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js"
import { setPanelField, clearPanelField, MAX_PANELS } from "../../src/lib/panel/index.js"

const pluginConfig = {
    name: 'setpanel',
    alias: ["setpanel"],
    category: 'owner',
    description: 'Update domain & key panel pterodactyl (untuk Cloudflare tunnel dinamis)',
    usage: '.setpanel <v1-v100> <domain> atau .setpanel <v1-v100> apikey <key> atau .setpanel <v1-v100> capikey <key>',
    example: '.setpanel v1 https://abc.trycloudflare.com',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}


function updateConfigField(serverKey, field, value) {
    // Persistence via JSON store (src/data/ptero-panels.json) — merge otomatis ke config saat startup
    // (menggantikan edit config.js via regex yang gak match lagi sejak config pindah ke external.js)
    const num = String(serverKey || '').replace('server', '')
    return setPanelField(num, field, value)
}

async function handler(m, { sock }) {
    const prefix = m.prefix || '.'
    const args = m.args || []
    const text = m.text || ''

    if (!args[0]) {
        const ptero = config.pterodactyl || {}
        const getStatus = (cfg) => (cfg?.domain && cfg?.apikey) ? 'ON' : 'OFF'

        let txt = 'SET PANEL CONFIG\n\n'
        txt += 'Update domain & key panel langsung dari sini.\nCocok untuk Cloudflare tunnel yang URL-nya berubah.\n'
        txt += 'Slot panel: v1 - v100 (100 domain panel berbeda)\n\n'
        txt += 'Status Panel (yang terkonfigurasi):\n'
        let configured = 0
        for (let i = 1; i <= MAX_PANELS; i++) {
            const s = ptero['server' + i] || {}
            if (!s.domain && !s.apikey) continue
            configured++
            txt += '  v' + i + ': ' + getStatus(s) + '\n'
            if (s.domain) txt += '    Domain: ' + s.domain + '\n'
        }
        if (configured === 0) txt += '  (belum ada panel terkonfigurasi)\n'

        txt += 'Jenis key (beda peran, boleh barengan):\n'
        txt += '  apikey  = PTLA (awalan ptla_) key application\n'
        txt += '  → WAJIB: create akun/server & kontrol semua\n'
        txt += '  capikey = PTLC (awalan ptlc_) key client\n'
        txt += '  → opsional: operasi client tanpa login\n'
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

        return m.reply(raraWrap('setpanel', txt))
    }

    // .setpanel status
    if (args[0].toLowerCase() === 'status') {
        const ptero = config.pterodactyl || {}
        let txt = 'PANEL STATUS\n\n'
        let configured = 0
        for (let i = 1; i <= MAX_PANELS; i++) {
            const s = ptero['server' + i] || {}
            if (!s.domain && !s.apikey) continue
            configured++
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
        if (configured === 0) txt += '(belum ada panel terkonfigurasi)\n'
        txt += 'Total terkonfigurasi: ' + configured + '/' + MAX_PANELS + ' slot\n'
        return m.reply(raraWrap('setpanel', txt))
    }

    // Parse: .setpanel v1 <domain> atau .setpanel v1 <field> <value>
    const serverArg = args[0].toLowerCase()
    const serverNum = serverArg.match(/^v?(\d{1,3})$/)?.[1]
    const serverNumInt = parseInt(serverNum, 10)
    if (!serverNum || !(serverNumInt >= 1 && serverNumInt <= MAX_PANELS)) {
        return m.reply(raraWrap('setpanel', 'Server tidak valid. Gunakan v1 sampai v100.\n\n💡 *Contoh:* ' + prefix + 'setpanel v1 https://domain.com'))
    }

    const serverKey = 'server' + serverNum

    // Cek apakah args[1] adalah field name atau domain
    const fieldNames = ['apikey', 'capikey', 'egg', 'nestid', 'location']
    const secondArg = args[1]?.toLowerCase()

    if (secondArg && fieldNames.includes(secondArg)) {
        // .setpanel v1 apikey <value>
        const value = args[2]
        if (!value) {
            return m.reply(raraWrap('setpanel', 'Value tidak boleh kosong.\n\n💡 *Contoh:* ' + prefix + 'setpanel v1 apikey ptla_xxxx'))
        }

        // Jangan tampilkan key di response
        const maskedValue = secondArg.includes('key') ? value.substring(0, 6) + '...' : value
        const result = updateConfigField(serverKey, secondArg, value)
        if (result.success) {
            // Update config object in memory juga
            if (config.pterodactyl?.[serverKey]) {
                config.pterodactyl[serverKey][secondArg] = value
            }
            return m.reply(raraWrap('setpanel', serverArg.toUpperCase() + ' ' + secondArg + ' berhasil diupdate\n\nNilai: ' + maskedValue + '\n\nPerubahan langsung aktif, tidak perlu restart'))
        } else {
            return m.reply(raraWrap('setpanel', 'Gagal update: ' + result.error))
        }
    } else if (args[1]) {
        // .setpanel v1 https://domain.com (set domain)
        let domain = args[1]
        // (guard 8 Okt) key yang tanpa sengaja diketik sebagai domain → arahkan ke apikey/capikey
        if (/^ptl[ac]_/i.test(domain)) {
            const jenis = domain.toLowerCase().startsWith('ptla_') ? 'apikey' : 'capikey'
            return m.reply(raraWrap('setpanel', 'Itu API key, bukan domain.\n\nGunakan:\n  ' + prefix + 'setpanel v1 ' + jenis + ' ' + domain + '\n\nDomain diisi URL panel, contoh:\n  ' + prefix + 'setpanel v1 https://panel.domainmu.com'))
        }
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
            return m.reply(raraWrap('setpanel', serverArg.toUpperCase() + ' domain berhasil diupdate\n\nDomain: ' + domain + '\n\nPerubahan langsung aktif, tidak perlu restart'))
        } else {
            return m.reply(raraWrap('setpanel', 'Gagal update domain: ' + result.error))
        }
    } else {
        return m.reply(raraWrap('setpanel', 'Format salah.\n\nContoh:\n  ' + prefix + 'setpanel v1 https://domain.com\n  ' + prefix + 'setpanel v1 apikey ptla_xxxx'))
    }
}

export { pluginConfig as config, handler }
