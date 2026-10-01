// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { isLid, lidToJid } from '../../src/lib/rara-lid.js'
import { addRole, removeRole, listByRole, canManageRole, getUserRole, VALID_SERVERS } from '../../src/lib/rara-roles-cpanel.js'
const ROLES = ['owner', 'ceo', 'reseller']
const allCommands = []

// nama command suffix hanya v1-v5 (biar menu gak bengkak); slot 6-100 pakai bentuk bare + arg
const MENU_SERVERS = VALID_SERVERS.slice(0, 5)
const legacyAliases = []
ROLES.forEach(role => {
    MENU_SERVERS.forEach(ver => {
        if (role === 'owner') {
            // FIX 10 Sep 2026 (request owner): bentuk berversi owner panel DIGANTI
            // .addownerpanelv1 s/d .addownerpanelv5 — nama lama .addownervN jadi alias.
            allCommands.push(`addownerpanel${ver}`)
            allCommands.push(`delownerpanel${ver}`)
            allCommands.push(`listownerpanel${ver}`)
            legacyAliases.push(`addowner${ver}`, `delowner${ver}`, `listowner${ver}`)
        } else {
            allCommands.push(`add${role}${ver}`)
            allCommands.push(`del${role}${ver}`)
            allCommands.push(`list${role}${ver}`)
        }
    })
    // bentuk generik: .addreseller 50 @user / .addreseller v50 @user (v1-v100)
    // FIX 9 Sep 2026 (request owner): bentuk generik role owner DIGANTI NAMA jadi
    // .addownerpanel / .delownerpanel / .listownerpanel — .addowner/.delowner/
    // .listowner adalah command inti plugins/owner/addowner.js (kelola owner bot).
    // Kategori panel dimuat SETELAH owner, register terakhir menang → rolemanager
    // membajak command itu diam-diam (addowner nyasar ke role cpanel 'v1').
    // Bentuk berversi owner (.addownerpanelv1 s/d v5) milik rolemanager.
    if (role === 'owner') {
        allCommands.push('addownerpanel', 'delownerpanel', 'listownerpanel')
    } else {
        allCommands.push(`add${role}panel`) // .addceopanel / .addresellerpanel (kata "panel" beda format arg)
        allCommands.push(`add${role}`, `del${role}`, `list${role}`)
    }
})

const pluginConfig = {
    name: allCommands,
    alias: [...legacyAliases, 'addresspanel'],
    category: 'panel',
    description: 'Kelola owner/ceo/reseller per server',
    usage: '.addownerpanel 62123457889 1 / .addceopanel 62123456789 1 / .addresspanel @user 1 (angka terakhir = server)',
    example: '.addownerpanel @user',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function cleanJid(jid) {
    if (!jid) return null
    if (isLid(jid)) jid = lidToJid(jid)
    return jid.includes('@') ? jid : jid + '@s.whatsapp.net'
}

function getNumber(jid) {
    const clean = cleanJid(jid)
    return clean ? clean.split('@')[0] : null
}

function parseCommand(cmd, args) {
    // .addownerpanelv2 / .addresellerv3 (suffix) / .addreseller 50 (arg) — v1-v100
    // ownerpanelvN = nama baru; ownervN = alias legacy yang tetap diterima
    const suffixMatch = cmd.match(/^(add|del|list)(ownerpanel|owner|ceo|reseller)(v\d{1,3})$/i)
    if (suffixMatch) {
        const num = parseInt(suffixMatch[3].replace('v', ''), 10)
        if (!(num >= 1 && num <= 100)) return null
        const role = suffixMatch[2] === 'ownerpanel' ? 'owner' : suffixMatch[2]
        return { action: suffixMatch[1], role, server: 'v' + num }
    }
    const bareMatch = cmd.match(/^(add|del|list)(ownerpanel|owner|ceo|reseller)$/i)
    if (bareMatch) {
        const am = String(args?.[0] || '').trim().match(/^v?(\d{1,3})$/i)
        const num = am ? parseInt(am[1], 10) : 1
        if (!(num >= 1 && num <= 100)) return null
        const role = bareMatch[2] === 'ownerpanel' ? 'owner' : bareMatch[2]
        return { action: bareMatch[1], role, server: 'v' + num }
    }
    return null
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

// .addownerpanel / .addceopanel / .addresspanel — format owner 10 Sep 2026: <nomor|@user|reply> <serverN>
// Contoh: .addceopanel 62123456789 1  (1 = server pertama v1)
// Reply/tag @user tanpa nyebutin nomor juga bisa: .addceopanel @user 1
function parsePanelAdd(m) {
    const cmd = String(m.command || '').toLowerCase()
    if (!/^(addownerpanel|addceopanel|addresellerpanel|addresspanel)$/.test(cmd)) return null
    const role = cmd === 'addceopanel' ? 'ceo' : (cmd === 'addresellerpanel' || cmd === 'addresspanel') ? 'reseller' : 'owner'

    let server = 'v1'
    const args = [...(m.args || [])]
    const lastArg = String(args[args.length - 1] || '').trim()
    const sm = lastArg.match(/^v?(\d{1,3})$/i)
    if (sm) {
        const num = parseInt(sm[1], 10)
        if (num >= 1 && num <= 100) {
            server = 'v' + num
            args.pop()
        }
    }

    let targetUser = null
    if (m.quoted?.sender) {
        targetUser = getNumber(m.quoted.sender)
    } else if (m.mentionedJid?.length > 0) {
        targetUser = getNumber(m.mentionedJid[0])
    } else {
        targetUser = args.map(a => String(a).replace(/[^0-9]/g, '')).find(n => n.length >= 7) || null
    }
    return { action: 'add', role, server, targetUser }
}

function handler(m, { sock }) {
    const parsed = parsePanelAdd(m) || parseCommand(m.command, m.args)
    if (!parsed) {
        return m.reply(raraWrap("rolemanager", `❌ Command tidak valid.`))
    }
    
    const { action, role, server } = parsed
    const serverLabel = server.toUpperCase()
    const roleLabel = capitalize(role)
    
    if (action === 'list') {
        const list = listByRole(server, role)
        if (list.length === 0) {
            return m.reply(raraWrap("rolemanager", `📋 *Daftar ${roleLabel.toUpperCase()} ${serverLabel}*\n\nBelum ada ${role} terdaftar.`))
        }
        
        let txt = `📋 *Daftar ${roleLabel.toUpperCase()} ${serverLabel}*\n\n`
        txt += `Total: *${list.length}* ${role}\n\n`
        list.forEach((num, i) => {
            txt += `${i + 1}. \`${num}\`\n`
        })
        txt += `\n_Role: ${roleLabel} | Server: ${serverLabel}_`
        return m.reply(raraWrap("rolemanager", txt))
    }
    
    if (!canManageRole(m.sender, server, role, m.isOwner)) {
        const userRole = getUserRole(m.sender, server)
        return m.reply(raraWrap("rolemanager", `❌ *akses ditolak*\n\n` +
            `Kamu tidak bisa mengelola *${roleLabel}* di *${serverLabel}*\n` +
            `Role kamu: *${userRole ? capitalize(userRole) : 'Tidak ada'}*\n\n` +
            `Hirarki: Owner > CEO > Reseller`))
    }
    
    let targetUser = parsed.targetUser || null
    if (!targetUser) {
        if (m.quoted?.sender) {
            targetUser = getNumber(m.quoted.sender)
        } else if (m.mentionedJid?.length > 0) {
            targetUser = getNumber(m.mentionedJid[0])
        } else if (m.text?.trim()) {
            targetUser = m.text.trim().replace(/[^0-9]/g, '')
        }
    }
    
    if (!targetUser) {
        const isPanelAdd = /panel$/.test(m.command || '')
        return m.reply( `⚠️ *cara pakai*\n\n` +
            (isPanelAdd
                ? `\`${m.prefix}${m.command} 62123456789 1\` (angka terakhir = server)\n` +
                  `\`${m.prefix}${m.command} @user 1\`\n` +
                  `Reply pesan user + \`${m.prefix}${m.command} 1\``
                : `\`${m.prefix}${m.command} @user\`\n` +
                  `\`${m.prefix}${m.command} 628xxx\`\n` +
                  `Reply pesan user`), "rolemanager")
    }
    
    if (action === 'add') {
        const result = addRole(targetUser, server, role)
        if (!result.success) {
            return m.reply(raraWrap("rolemanager", `❌ *gagal*\n\n${result.error}`))
        }
        return m.reply(`✅ *${roleLabel.toUpperCase()} Ditambahkan*\n\n` +
            "" +
            `📱 Nomor: \`${targetUser}\`\n` +
            `🏷️ Role: \`${roleLabel}\`\n` +
            `🖥️ sErver: \`${serverLabel}\`\n` +
            `📊 Total: \`${listByRole(server, role).length}\` ${role}\n` +
            "")
    }
    
    if (action === 'del') {
        const result = removeRole(targetUser, server, role)
        if (!result.success) {
            return m.reply(raraWrap("rolemanager", `❌ *gagal*\n\n${result.error}`))
        }
        return m.reply(`✅ *${roleLabel.toUpperCase()} Dihapus*\n\n` +
            `Nomor: \`${targetUser}\`\n` +
            `Server: *${serverLabel}*\n` +
            `Total: *${listByRole(server, role).length}* ${role}`)
    }
}

export { pluginConfig as config, handler }