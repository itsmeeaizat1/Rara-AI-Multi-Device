import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'antiribut',
    alias: ['antiribut', 'antiaibut', 'antikonten', 'antigado'],
    category: 'group',
    description: 'Deteksi keributan/perkelahian di grup',
    usage: '.antiribut <on/off/kick/delete/warn/reset/resetall>',
    example: '.antiribut on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

// ═══════════════════════════════════════════════
// KERIBUTAN / PERKELAHIAN PATTERNS
// ═══════════════════════════════════════════════

const RIBUT_PATTERNS = [
    // Tantangan / ajak ribut
    { pattern: /\bmajuu?k?(an)?\b/i, score: 3, label: 'maju' },
    { pattern: /\bmaju\s+(gak|ga|gk|dong)\b/i, score: 4, label: 'maju dong' },
    { pattern: /\bkita\s+(ribut|kelahi|adu|berantem)\b/i, score: 4, label: 'kita ribut' },
    { pattern: /\bnge?pe?ru?se?l?eh?/i, score: 3, label: 'perusuh' },
    { pattern: /\bbe?re?n?te?m\b/i, score: 4, label: 'berantem' },
    { pattern: /\bbe?re?n?te?n?g\b/i, score: 4, label: 'beranteng' },
    { pattern: /\badu\s+(mulut|musuh|mata|tgl|tgl)\b/i, score: 3, label: 'adu' },
    { pattern: /\bnga?jak?\s+(ribut|kelahi|berantem|perang|dago)\b/i, score: 4, label: 'ngajak ribut' },
    { pattern: /\bnge?li?ku?k?(an)?\b/i, score: 3, label: 'ngelink' },
    { pattern: /\bka?sar\s+(kita|kita\s+dua|sini)\b/i, score: 3, label: 'kasar sini' },
    { pattern: /\bsem?pro?ut?(an)?\b/i, score: 3, label: 'semprot' },
    { pattern: /\bte?gu?r?\s+(sapa|sapa\s+kerja)\b/i, score: 1, label: 'tegur sapa' },
    { pattern: /\btega?l?a?/i, score: 1, label: 'tegal' },
    { pattern: /\bsini\s+(keluar|luar|luar\s+sini)\b/i, score: 4, label: 'sini keluar' },
    { pattern: /\bnge?re?k?\s+(kamu|kau|lu|lo)\b/i, score: 3, label: 'ngerek' },
    { pattern: /\bge?la?p?\s+(lu|lo|kamu|kau)\s+(pala|kepala|otak)\b/i, score: 3, label: 'gelap pala' },
    { pattern: /\bja?ga\s+(lu|lo|kamu|kau)\s+(sendiri|ini)\b/i, score: 2, label: 'jaga sendiri' },
    // Ancaman
    { pattern: /\baku\s+(bakal|akan|mau)\s+(pukul|tinju|hajar|gebug|bogem)\b/i, score: 4, label: 'ancaman pukul' },
    { pattern: /\baku\s+(bakal|akan|mau)\s+(baket|hajar|fisik)\b/i, score: 4, label: 'ancaman' },
    { pattern: /\bni?si?n\s+(aku|gue|gw|saya)\s+(tinju|hajar|pukul|gebug)\b/i, score: 4, label: 'ancaman pukul' },
    { pattern: /\baku\s+(gak|ga)\s+(takut|seram)\s+(kamu|kau|lu|lo)\b/i, score: 3, label: 'gak takut' },
    { pattern: /\bja?ngan\s+(lebay|riba|heboh)\b/i, score: 2, label: 'jangan lebay' },
    { pattern: /\bja?ngan\s+(bawa|bawak)\s+(agama|suku|ras)\b/i, score: 2, label: 'jangan bawa agama' },
    { pattern: /\bsu?ra?h?\s+(aku|gue|gw)\s+(mau|mauk)\s+(pukul|tinju|hajar)\b/i, score: 4, label: 'suruh hajar' },
    { pattern: /\bko?ndang\s+(gak|ga|gk)\s+(aku|gue|gw|lu|lo)\b/i, score: 3, label: 'condang' },
    { pattern: /\bau\s+(ribut|kelahi|berantem|perang)\s+(sini|yah|ya)\b/i, score: 4, label: 'au ribut' },
    { pattern: /\bsu?ra?h\s+(ribut|kelahi|berantem)\b/i, score: 4, label: 'suruh ribut' },
    { pattern: /\bla?yu?n\s+(kita|kita\s+dua)\s+(ribut|kelahi)\b/i, score: 4, label: 'layun ribut' },
    { pattern: /\bpe?rang?\s+(kita|kita\s+dua)\b/i, score: 4, label: 'perang kita' },
    { pattern: /\bp?u?koi?\b/i, score: 2, label: 'pukoi' },
    { pattern: /\bt?e?mp?u?k?\b/i, score: 3, label: 'tempuk' },
    { pattern: /\bng?e?nu?k?(an)?\b/i, score: 2, label: 'ngenuk' },
    // Emosi / marah berlebihan
    { pattern: /\be?mo?si\s+(lu|lo|kamu|kau)\s+(parah|banget|tinggi)\b/i, score: 3, label: 'emosi parah' },
    { pattern: /\be?mo?\b/i, score: 1, label: 'emo' },
    { pattern: /\bka?mu\s+(bau|bangat)\s+(tai|bangsat|busuk)\b/i, score: 4, label: 'kamu bau' },
    { pattern: /\bmu?ka?\s+(lu|lo|kamu|kau)\s+(je?le?k|busuk|buri)\b/i, score: 3, label: 'muka jelek' },
    { pattern: /\bot?ak\s+(lu|lo|kamu|kau)\s+(gak|ga)\s+(jalan|baik|beres)\b/i, score: 3, label: 'otak gak jalan' },
    { pattern: /\bmata\s+(lu|lo|kamu|kau)\s+(buta|pe?kat)\b/i, score: 3, label: 'mata buta' },
    // Provokasi
    { pattern: /\bsu?kain?\s+(lu|lo|kamu|kau)\s+(parah|banget|be?g?i?tu)\b/i, score: 2, label: 'sukain' },
    { pattern: /\ba?ji?b?\s+(lu|lo|kamu|kau)\s+(parah|banget)\b/i, score: 2, label: 'ajib' },
    { pattern: /\bri?bu?t?\s+(ya|yah|yuk)\b/i, score: 3, label: 'ribut yuk' },
    { pattern: /\bda?ga?\s+(ya|yah|yuk)\b/i, score: 3, label: 'daga yuk' },
    { pattern: /\bnga?jak?\s+(dago|dagoan|tempur)\b/i, score: 4, label: 'ngajak dago' },
    { pattern: /\bbe?k?e?r?sih?\s+(lu|lo|kamu|kau)\b/i, score: 2, label: 'bersih' },
    { pattern: /\bng?o?to?n?(an)?\s+(kita|kita\s+dua)\b/i, score: 3, label: 'ngotan' },
    { pattern: /\bta?ruh\s+(kita|kita\s+dua)\s+(di|ke)\s+(mana|mana\s+aja)\b/i, score: 2, label: 'taruh kita' },
]

const RIBUT_COMPACT_KEYWORDS = [
    { keyword: 'berantem', score: 4, label: 'berantem' },
    { keyword: 'perkelahian', score: 4, label: 'perkelahian' },
    { keyword: 'ribut', score: 3, label: 'ribut' },
    { keyword: 'majukan', score: 3, label: 'maju' },
    { keyword: 'semprotan', score: 3, label: 'semprot' },
    { keyword: 'ngajakdago', score: 4, label: 'ngajak dago' },
    { keyword: 'ngajakribut', score: 4, label: 'ngajak ribut' },
    { keyword: 'tinju', score: 3, label: 'tinju' },
    { keyword: 'hajar', score: 3, label: 'hajar' },
    { keyword: 'pukul', score: 3, label: 'pukul' },
    { keyword: 'gebug', score: 3, label: 'gebug' },
    { keyword: 'bogem', score: 3, label: 'bogem' },
    { keyword: 'tempur', score: 3, label: 'tempur' },
    { keyword: 'emosiparah', score: 3, label: 'emosi parah' },
    { keyword: 'otakgakjalan', score: 3, label: 'otak gak jalan' },
    { keyword: 'sinikeluar', score: 4, label: 'sini keluar' },
    { keyword: 'suruhribut', score: 4, label: 'suruh ribut' },
]

// ═══════════════════════════════════════════════
// DETECTION FUNCTION
// ═══════════════════════════════════════════════

function detectRibut(text) {
    if (!text || typeof text !== 'string') return { matched: false, score: 0, matches: [], type: null }

    const lowerText = text.toLowerCase().trim()
    if (!lowerText) return { matched: false, score: 0, matches: [], type: null }

    const compact = lowerText.replace(/[\s._\-]+/g, '')

    const matches = new Set()
    let totalScore = 0

    for (const { pattern, score, label } of RIBUT_PATTERNS) {
        if (score === 0) continue
        if (pattern.test(lowerText)) {
            matches.add(label)
            totalScore += score
        }
    }

    for (const { keyword, score, label } of RIBUT_COMPACT_KEYWORDS) {
        if (compact.includes(keyword)) {
            matches.add(label)
            totalScore += score
        }
    }

    const matched = totalScore >= 4
    return { matched, score: totalScore, matches: [...matches], type: 'ribut' }
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

async function handleAntiRibut(m, sock, db) {
    if (!m.isGroup) return false

    const groupData = db.getGroup(m.chat) || {}
    if (groupData.antiribut !== 'on') return false

    const text = String(m.body || m.text || '').trim()
    if (!text) return false

    const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    if (m.sender === botNumber) return false

    try {
        const groupMeta = await sock.groupMetadata(m.chat)
        const senderNum = m.sender?.replace(/[^0-9]/g, '') || ''
        const botNum = botNumber?.replace(/[^0-9]/g, '') || ''

        const isSenderAdmin = groupMeta.participants.some(p => {
            if (!p.admin) return false
            const pNum = (p.jid || p.id || '').replace(/[^0-9]/g, '')
            return pNum === senderNum || pNum.includes(senderNum) || senderNum.includes(pNum)
        })
        if (isSenderAdmin) return false

        const isBotAdmin = groupMeta.participants.some(p => {
            if (!p.admin) return false
            const pNum = (p.jid || p.id || '').replace(/[^0-9]/g, '')
            return pNum === botNum || pNum.includes(botNum) || botNum.includes(pNum)
        })

        const detected = detectRibut(text)
        if (!detected.matched) return false

        const maxWarn = groupData.ributMaxWarn || 3
        const kickMode = groupData.ributKickMode || 'on'
        const deleteMode = groupData.ributDeleteMode || 'on'

        if (!groupData.ributWarns) groupData.ributWarns = {}
        const currentWarn = (groupData.ributWarns[m.sender] || 0) + 1
        groupData.ributWarns[m.sender] = currentWarn
        db.setGroup(m.chat, groupData)

        const senderTag = m.sender.split('@')[0]
        const matchesStr = detected.matches.join(', ')

        if (deleteMode === 'on' && isBotAdmin) {
            try {
                await sock.sendMessage(m.chat, {
                    delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender }
                })
            } catch {}
        }

        if (currentWarn >= maxWarn) {
            groupData.ributWarns[m.sender] = 0
            db.setGroup(m.chat, groupData)

            if (kickMode === 'on' && isBotAdmin) {
                try {
                    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
                    await sock.sendMessage(m.chat, {
                        text: '╔┈┈「 🚫 *WARN LIMIT* 」╎❏\n┃ 👤 User: @' + senderTag + '\n┃ 🏷️ Pelanggaran: ⚔️ Keributan\n┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n┃ 🔍 Terdeteksi: ' + matchesStr + '\n┃ ❌ Aksi: KICK OTOMATIS\n╚┈┈❖\n_User dikeluarkan karena membuat keributan_',
                        mentions: [m.sender]
                    })
                } catch {
                    await sock.sendMessage(m.chat, {
                        text: '╔┈┈「 🚫 *WARN LIMIT* 」╎❏\n┃ 👤 User: @' + senderTag + '\n┃ 🏷️ Pelanggaran: ⚔️ Keributan\n┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n┃ ⚠️ Aksi: Bot bukan admin\n╚┈┈❖',
                        mentions: [m.sender]
                    })
                }
            } else if (kickMode === 'off') {
                await sock.sendMessage(m.chat, {
                    text: '╔┈┈「 ⚠️ *PERINGATAN MAX* 」╎❏\n┃ 👤 User: @' + senderTag + '\n┃ 🏷️ Pelanggaran: ⚔️ Keributan\n┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n┃ 📌 Auto-kick: OFF\n╚┈┈❖\n_Keributan terus tapi auto-kick dimatikan_',
                    mentions: [m.sender]
                })
            }
        } else {
            await sock.sendMessage(m.chat, {
                text: '╔┈┈「 ⚠️ *PERINGATAN* 」╎❏\n┃ 👤 User: @' + senderTag + '\n┃ 🏷️ Pelanggaran: ⚔️ Keributan\n┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n┃ 🔍 Terdeteksi: ' + matchesStr + '\n╚┈┈❖\n_Jaga suasana! ' + (maxWarn - currentWarn) + ' lagi = kick_',
                mentions: [m.sender]
            })
        }
        return true
    } catch (e) {
        console.error('[AntiRibut]', e.message)
        return false
    }
}

// ═══════════════════════════════════════════════
// COMMAND HANDLER
// ═══════════════════════════════════════════════

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}
    const args = m.args || []
    const sub = args[0]?.toLowerCase()

    if (!sub) {
        const status = groupData.antiribut === 'on' ? '✅ ON' : '❌ OFF'
        const maxWarn = groupData.ributMaxWarn || 3
        const kick = groupData.ributKickMode || 'on'
        const del = groupData.ributDeleteMode || 'on'
        const warnCount = groupData.ributWarns ? Object.keys(groupData.ributWarns).length : 0

        let txt = '╔┈┈「 ⚔️ *ANTI KERIBUTAN* 」╎❏\n'
        txt += '┃\n'
        txt += '┃ ❏ Status: *' + status + '*\n'
        txt += '┃ ❏ Max Warn: *' + maxWarn + 'x*\n'
        txt += '┃ ❏ Auto-Kick: *' + kick.toUpperCase() + '*\n'
        txt += '┃ ❏ Auto-Delete: *' + del.toUpperCase() + '*\n'
        txt += '┃ ❏ User Warned: *' + warnCount + '*\n'
        txt += '┃\n'
        txt += '┃ *📋 COMMAND:*\n'
        txt += '┃ ❏ `' + m.prefix + 'antiribut on/off`\n'
        txt += '┃ ❏ `' + m.prefix + 'antiribut warn <angka>`\n'
        txt += '┃ ❏ `' + m.prefix + 'antiribut kick on/off`\n'
        txt += '┃ ❏ `' + m.prefix + 'antiribut delete on/off`\n'
        txt += '┃ ❏ `' + m.prefix + 'antiribut reset @user`\n'
        txt += '┃ ❏ `' + m.prefix + 'antiribut resetall`\n'
        txt += '╚┈┈❖'
        return await m.reply(claraWrap("antiribut", txt))
    }

    if (sub === 'on') {
        db.setGroup(m.chat, { antiribut: 'on' })
        m.react('✅')
        return m.reply(claraWrap("Antiribut", '╔┈┈「 ✅ *ANTI RIBUT AKTIF* 」╎❏\n┃ Deteksi keributan diaktifkan\n┃ Sistem: Warn 3x lalu kick\n╚┈┈❖'))
    }
    if (sub === 'off') {
        db.setGroup(m.chat, { antiribut: 'off' })
        return m.reply(claraWrap("Antiribut", '╔┈┈「 ❌ *ANTI RIBUT MATI* 」╎❏\n┃ Deteksi keributan dinonaktifkan\n╚┈┈❖'))
    }
    if (sub === 'warn') {
        const count = parseInt(args[1])
        if (!count || count < 1 || count > 10) return m.reply(claraWrap("Antiribut", '❌ Masukkan angka 1-10'))
        db.setGroup(m.chat, { ributMaxWarn: count })
        m.react('✅')
        return m.reply('╔┈┈「 ✅ *MAX WARN* 」╎❏\n┃ Max peringatan: *' + count + 'x*\n╚┈┈❖')
    }
    if (sub === 'kick') {
        const opt = args[1]?.toLowerCase()
        if (opt === 'on') { db.setGroup(m.chat, { ributKickMode: 'on' }); m.react('✅'); return m.reply(claraWrap("Antiribut", '✅ Auto-kick anti-ribut ON')) }
        if (opt === 'off') { db.setGroup(m.chat, { ributKickMode: 'off' }); m.react('✅'); return m.reply(claraWrap("Antiribut", '⚠️ Auto-kick anti-ribut OFF, hanya warn')) }
        return m.reply('❌ Gunakan: `' + m.prefix + 'antiribut kick on/off`')
    }
    if (sub === 'delete') {
        const opt = args[1]?.toLowerCase()
        if (opt === 'on') { db.setGroup(m.chat, { ributDeleteMode: 'on' }); m.react('✅'); return m.reply(claraWrap("Antiribut", '✅ Auto-delete anti-ribut ON')) }
        if (opt === 'off') { db.setGroup(m.chat, { ributDeleteMode: 'off' }); m.react('✅'); return m.reply(claraWrap("Antiribut", '⚠️ Auto-delete anti-ribut OFF')) }
        return m.reply('❌ Gunakan: `' + m.prefix + 'antiribut delete on/off`')
    }
    if (sub === 'reset') {
        const target = m.mentionedJid?.[0] || (args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        if (!target || target === 'undefined@s.whatsapp.net') return m.reply('❌ Tag user')
        const updated = groupData
        if (updated.ributWarns?.[target]) delete updated.ributWarns[target]
        db.setGroup(m.chat, updated)
        m.react('✅')
        return m.reply('╔┈┈「 ✅ *WARN DIRESET* 」╎❏\n┃ 👤 User: @' + target.split('@')[0] + '\n┃ Warn Ribut: Direset\n╚┈┈❖', { mentions: [target] })
    }
    if (sub === 'resetall') {
        const updated = groupData
        updated.ributWarns = {}
        db.setGroup(m.chat, updated)
        m.react('✅')
        return m.reply(claraWrap("Antiribut", '╔┈┈「 ✅ *SEMUA WARN DIRESET* 」╎❏\n╚┈┈❖'))
    }
    return m.reply('❌ Ketik `' + m.prefix + 'antiribut` untuk daftar command')
}

export { pluginConfig as config, handler, handleAntiRibut, detectRibut }
