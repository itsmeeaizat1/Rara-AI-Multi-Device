// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { isLid, lidToJid } from '../../src/lib/nova-lid.js'
import { addRole, removeRole, listByRole, canManageRole, getUserRole, VALID_SERVERS } from '../../src/lib/nova-roles-cpanel.js'
const ROLES = ['owner', 'ceo', 'reseller']
const allCommands = []

// nama command suffix hanya v1-v5 (biar menu gak bengkak); slot 6-100 pakai bentuk bare + arg
const MENU_SERVERS = VALID_SERVERS.slice(0, 5)
ROLES.forEach(role => {
    MENU_SERVERS.forEach(ver => {
        allCommands.push(`add${role}${ver}`)
        allCommands.push(`del${role}${ver}`)
        allCommands.push(`list${role}${ver}`)
    })
    // bentuk generik: .addreseller 50 @user / .addreseller v50 @user (v1-v100)
    // FIX 9 Sep 2026 (request owner): bentuk generik role owner DIGANTI NAMA jadi
    // .addownerpanel / .delownerpanel / .listownerpanel — .addowner/.delowner/
    // .listowner adalah command inti plugins/owner/addowner.js (kelola owner bot).
    // Kategori panel dimuat SETELAH owner, register terakhir menang → rolemanager
    // membajak command itu diam-diam (addowner nyasar ke role cpanel 'v1').
    // Bentuk berversi (.addownerv1 s/d v5) TETAP milik rolemanager.
    if (role === 'owner') {
        allCommands.push('addownerpanel', 'delownerpanel', 'listownerpanel')
    } else {
        allCommands.push(`add${role}`, `del${role}`, `list${role}`)
    }
})

const pluginConfig = {
    name: allCommands,
    alias: [],
    category: 'panel',
    description: 'Kelola owner/ceo/reseller per server',
    usage: '.addownerpanel @user atau .addownerv1 @user atau .listceov2',
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
    // .addresellerv3 (suffix) / .addreseller 50 (arg) — v1-v100
    const suffixMatch = cmd.match(/^(add|del|list)(owner|ceo|reseller)(v\d{1,3})$/i)
    if (suffixMatch) {
        const num = parseInt(suffixMatch[3].replace('v', ''), 10)
        if (!(num >= 1 && num <= 100)) return null
        return { action: suffixMatch[1], role: suffixMatch[2], server: 'v' + num }
    }
    const bareMatch = cmd.match(/^(add|del|list)(owner|ceo|reseller)$/i)
    if (bareMatch) {
        const am = String(args?.[0] || '').trim().match(/^v?(\d{1,3})$/i)
        const num = am ? parseInt(am[1], 10) : 1
        if (!(num >= 1 && num <= 100)) return null
        return { action: bareMatch[1], role: bareMatch[2], server: 'v' + num }
    }
    return null
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function handler(m, { sock }) {
    const parsed = parseCommand(m.command, m.args)
    if (!parsed) {
        return m.reply(claraWrap("rolemanager", `❌ Command tidak valid.`))
    }
    
    const { action, role, server } = parsed
    const serverLabel = server.toUpperCase()
    const roleLabel = capitalize(role)
    
    if (action === 'list') {
        const list = listByRole(server, role)
        if (list.length === 0) {
            return m.reply(claraWrap("rolemanager", `📋 *Daftar ${roleLabel.toUpperCase()} ${serverLabel}*\n\nBelum ada ${role} terdaftar.`))
        }
        
        let txt = `📋 *Daftar ${roleLabel.toUpperCase()} ${serverLabel}*\n\n`
        txt += `Total: *${list.length}* ${role}\n\n`
        list.forEach((num, i) => {
            txt += `${i + 1}. \`${num}\`\n`
        })
        txt += `\n_Role: ${roleLabel} | Server: ${serverLabel}_`
        return m.reply(claraWrap("rolemanager", txt))
    }
    
    if (!canManageRole(m.sender, server, role, m.isOwner)) {
        const userRole = getUserRole(m.sender, server)
        return m.reply(claraWrap("rolemanager", `❌ *ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ*\n\n` +
            `Kamu tidak bisa mengelola *${roleLabel}* di *${serverLabel}*\n` +
            `Role kamu: *${userRole ? capitalize(userRole) : 'Tidak ada'}*\n\n` +
            `Hirarki: Owner > CEO > Reseller`))
    }
    
    let targetUser = null
    if (m.quoted?.sender) {
        targetUser = getNumber(m.quoted.sender)
    } else if (m.mentionedJid?.length > 0) {
        targetUser = getNumber(m.mentionedJid[0])
    } else if (m.text?.trim()) {
        targetUser = m.text.trim().replace(/[^0-9]/g, '')
    }
    
    if (!targetUser) {
        return m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `\`${m.prefix}${m.command} @user\`\n` +
            `\`${m.prefix}${m.command} 628xxx\`\n` +
            `Reply pesan user`, "rolemanager")
    }
    
    if (action === 'add') {
        const result = addRole(targetUser, server, role)
        if (!result.success) {
            return m.reply(claraWrap("rolemanager", `❌ *ɢᴀɢᴀʟ*\n\n${result.error}`))
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
            return m.reply(claraWrap("rolemanager", `❌ *ɢᴀɢᴀʟ*\n\n${result.error}`))
        }
        return m.reply(`✅ *${roleLabel.toUpperCase()} Dihapus*\n\n` +
            `Nomor: \`${targetUser}\`\n` +
            `Server: *${serverLabel}*\n` +
            `Total: *${listByRole(server, role).length}* ${role}`)
    }
}

export { pluginConfig as config, handler }