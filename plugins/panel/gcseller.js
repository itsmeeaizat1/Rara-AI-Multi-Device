// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import fs from 'fs'
import path from 'path'
import config from '../../config.js'
import { isLid, lidToJid } from '../../src/lib/rara-lid.js'
const CPANEL_DIR = path.join(process.cwd(), "src", "database", "panel", 'cpanel')
const VALID_SERVERS = ['v1', 'v2', 'v3', 'v4', 'v5']

function ensureDir() {
    if (!fs.existsSync(CPANEL_DIR)) {
        fs.mkdirSync(CPANEL_DIR, { recursive: true })
    }
}

function getFilePath(version) {
    return path.join(CPANEL_DIR, `gcseller_${version}.json`)
}

function loadGcSeller(version) {
    ensureDir()
    const filePath = getFilePath(version)
    if (!fs.existsSync(filePath)) return null
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch {
        return null
    }
}

function saveGcSeller(version, groupJid) {
    ensureDir()
    fs.writeFileSync(getFilePath(version), JSON.stringify(groupJid), 'utf8')
}

function isGcSeller(chatJid, version) {
    if (!chatJid?.endsWith('@g.us')) return false
    return loadGcSeller(version) === chatJid
}

function getGcSellerVersion(chatJid) {
    if (!chatJid?.endsWith('@g.us')) return null
    for (const ver of VALID_SERVERS) {
        if (loadGcSeller(ver) === chatJid) return ver
    }
    return null
}

const allCommands = []
// suffix v1-v5 biar menu gak bengkak; slot 6-100 pakai bare + arg: .addgcseller 50
VALID_SERVERS.slice(0, 5).forEach(ver => {
    allCommands.push(`addgcseller${ver}`, `resetgcseller${ver}`)
})
allCommands.push('addgcseller', 'resetgcseller')

const pluginConfig = {
    name: allCommands,
    alias: [],
    category: 'panel',
    description: 'Daftarkan grup sebagai GC Seller panel (akses command create server)',
    usage: '.addgcsellerv1 / .addgcseller 50 (di dalam grup, v1-v100)',
    example: '.addgcsellerv1',
    isOwner: true,
    isGroup: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function hasAccess(senderJid, isOwner) {
    if (isOwner) return true
    let jid = senderJid
    if (isLid(jid)) jid = lidToJid(jid)
    const number = jid?.replace(/@.*$/, '')
    const ownerPanels = config.pterodactyl?.ownerPanels || []
    return ownerPanels.includes(number)
}

function parseCommand(cmd, args) {
    // .addgcsellerv3 (suffix) / .addgcseller 50 (arg) — v1-v100
    const suffix = cmd.match(/^(addgcseller|resetgcseller)(v\d{1,3})$/i)
    if (suffix) {
        const num = parseInt(suffix[2].replace('v', ''), 10)
        if (!(num >= 1 && num <= 100)) return null
        return { action: suffix[1].toLowerCase().startsWith('add') ? 'add' : 'reset', version: 'v' + num }
    }
    const bare = cmd.match(/^(addgcseller|resetgcseller)$/i)
    if (bare) {
        const am = String(args?.[0] || '').trim().match(/^v?(\d{1,3})$/i)
        const num = am ? parseInt(am[1], 10) : 1
        if (!(num >= 1 && num <= 100)) return null
        return { action: bare[1].toLowerCase().startsWith('add') ? 'add' : 'reset', version: 'v' + num }
    }
    return null
}

function handler(m, { sock }) {
    const parsed = parseCommand(m.command, m.args)
    if (!parsed) return m.reply( '❌ Command tidak valid.', "gcseller")

    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply( '❌ *akses ditolak*\n\nFitur ini hanya untuk Owner atau Owner Panel.', "gcseller")
    }

    const { action, version } = parsed
    const serverLabel = version.toUpperCase()

    if (action === 'add') {
        const current = loadGcSeller(version)
        if (current === m.chat) {
            return m.reply(raraWrap("gcseller", `❌ Grup ini sudah terdaftar sebagai GC Seller *${serverLabel}*.`))
        }

        saveGcSeller(version, m.chat)
        let txt = `✅ *Gc sEller ${serverLabel} Ditambahkan*\n\n`
        txt += ""
        txt += `🖥️ sErver: \`${serverLabel}\`\n`
        txt += `👥 Grup: \`${m.groupName || m.chat}\`\n`
        txt += `🔓 Akses: \`1gb${version}\` - \`10gb${version}\`, \`unli${version}\`\n`
        if (current) {
            txt += `⚠️ Prev: \`${current}\` (diganti)\n`
        }
        txt += `\n`
        txt += `Semua member grup ini sekarang bisa create server ${serverLabel}.`
        return m.reply(raraWrap("gcseller", txt))
    }

    if (action === 'reset') {
        const current = loadGcSeller(version)
        if (!current) {
            return m.reply(raraWrap("${serverLabel}", `❌ Belum ada GC Seller terdaftar untuk *${serverLabel}*.`))
        }

        saveGcSeller(version, null)
        return m.reply(`✅ *Gc sEller ${serverLabel} Direset*\n\n` +
            `Grup: \`${current}\`\n` +
            `Server *${serverLabel}* tidak lagi terhubung ke grup manapun.`)
    }
}

export { pluginConfig as config, handler, loadGcSeller, saveGcSeller, isGcSeller, getGcSellerVersion, VALID_SERVERS }