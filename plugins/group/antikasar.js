// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA

import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { raraWarning } from "../../src/lib/rara-group-protection.js";

const pluginConfig = {
    name: 'antikasar',
    alias: ["antikasar"],
    category: 'group',
    description: 'Deteksi kata kata kasar/kotor/jorok di grup',
    usage: '.antikasar <on/off/kick/delete/warn/reset/resetall>',
    example: '.antikasar on',
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
// KATA KASAR / KOTOR PATTERNS
// ═══════════════════════════════════════════════

const KASAR_PATTERNS = [
    // Makian dasar
    { pattern: /\banj(\s)?(g|k|ng|ing)\b/i, score: 3, label: 'anjing' },
    { pattern: /\banjg?t\b/i, score: 3, label: 'anjg/t' },
    { pattern: /\bkomeng\b/i, score: 2, label: 'komeng' },
    { pattern: /\basu\b/i, score: 3, label: 'asu' },
    { pattern: /\bang?sa?yu\b/i, score: 3, label: 'asu' },
    { pattern: /\bbangsat\b/i, score: 3, label: 'bangsat' },
    { pattern: /\bbangke?t\b/i, score: 3, label: 'bangsat' },
    { pattern: /\bnig?a\b/i, score: 3, label: 'niga' },
    { pattern: /\bnjix\b/i, score: 3, label: 'njix' },
    { pattern: /\bke?nt[ou]?l\b/i, score: 3, label: 'kontol' },
    { pattern: /\bke?ntol\b/i, score: 3, label: 'kontol' },
    { pattern: /\bk?nt[o0]l\b/i, score: 3, label: 'kontol' },
    { pattern: /\bme?mek\b/i, score: 3, label: 'memek' },
    { pattern: /\bmek?(i|y)?\b/i, score: 2, label: 'meki' },
    { pattern: /\bnge?nt[ou]t?\b/i, score: 4, label: 'ngentot' },
    { pattern: /\bnge?w?s\b/i, score: 3, label: 'ngewe' },
    { pattern: /\bte?mek\b/i, score: 3, label: 'temek' },
    { pattern: /\bje?le?k\b/i, score: 1, label: 'jelek' },
    { pattern: /\bg?ob?lo?k\b/i, score: 3, label: 'goblok' },
    { pattern: /\bg?ob?lo?g\b/i, score: 3, label: 'goblog' },
    { pattern: /\bguob?lo?k\b/i, score: 3, label: 'goblok' },
    { pattern: /\bd?o?bi?o?l\b/i, score: 3, label: 'dobiol' },
    { pattern: /\bidio?t\b/i, score: 3, label: 'idiot' },
    { pattern: /\bkin?ti?l\b/i, score: 3, label: 'kintil' },
    { pattern: /\bpe?le?r\b/i, score: 3, label: 'peler' },
    { pattern: /\bje?mu?t\b/i, score: 3, label: 'jemut' },
    { pattern: /\bje?ma?w?a\b/i, score: 3, label: 'jemawa' },
    { pattern: /\bta[eio]k\b/i, score: 3, label: 'taek' },
    { pattern: /\btaik\b/i, score: 3, label: 'taik' },
    { pattern: /\bta?hi?l\b/i, score: 3, label: 'tahi' },
    { pattern: /\bta?hi\b/i, score: 2, label: 'tahi' },
    { pattern: /\bmu?me?k\b/i, score: 3, label: 'mumek' },
    { pattern: /\bng?e?we?k\b/i, score: 3, label: 'ngewe' },
    { pattern: /\bka?mp?e?t\b/i, score: 3, label: 'kampret' },
    { pattern: /\bkamp?e?t\b/i, score: 3, label: 'kampret' },
    { pattern: /\bka?nt?o?l\b/i, score: 3, label: 'kontol' },
    { pattern: /\bpel?e?r\b/i, score: 3, label: 'peler' },
    { pattern: /\bbo?do?h\b/i, score: 2, label: 'bodoh' },
    { pattern: /\bs?ta?gi?n\b/i, score: 3, label: 'stagin' },
    { pattern: /\bba?bi?\b/i, score: 3, label: 'babi' },
    { pattern: /\bs?ta?gi?n\b/i, score: 3, label: 'stagin' },
    { pattern: /\bbu?zi?m?\b/i, score: 3, label: 'buzim' },
    { pattern: /\bp?u?ki?\b/i, score: 3, label: 'puki' },
    { pattern: /\bje?mi?k\b/i, score: 3, label: 'jemik' },
    { pattern: /\bba?bi?\s+(lu|lo|kamu|kau)\b/i, score: 4, label: 'babi lu' },
    { pattern: /\bmon?yet\b/i, score: 2, label: 'monyet' },
    { pattern: /\b(kata\s+)?kasar/i, score: 1, label: 'kasar' },
    // Kutukan
    { pattern: /\bke?parat\b/i, score: 3, label: 'keparat' },
    { pattern: /\bke?parad\b/i, score: 3, label: 'keparat' },
    { pattern: /\bla?ka?n?ta?k\b/i, score: 3, label: 'lancang' },
    { pattern: /\bla?ca?k\b/i, score: 3, label: 'lacak' },
    { pattern: /\bkun?yu?k\b/i, score: 2, label: 'konyuk' },
    { pattern: /\bje?le?ma?\b/i, score: 2, label: 'jelema' },
    // Singkatan umum
    { pattern: /\bktl\b/i, score: 3, label: 'ktl' },
    { pattern: /\bmmk\b/i, score: 3, label: 'mmk' },
    { pattern: /\banj\b/i, score: 2, label: 'anj' },
    { pattern: /\bbs?d\b/i, score: 3, label: 'bsd' },
    { pattern: /\bf?u?ck\b/i, score: 4, label: 'fuck' },
    { pattern: /\bfv?ck\b/i, score: 3, label: 'fck' },
    { pattern: /\bs?ht\b/i, score: 3, label: 'sht' },
    { pattern: /\bbt?ch\b/i, score: 3, label: 'bitch' },
    { pattern: /\bsh?i?t\b/i, score: 3, label: 'shit' },
    { pattern: /\bd?a?mn\b/i, score: 2, label: 'damn' },
    { pattern: /\bh?e?ll\b/i, score: 1, label: 'hell' },
    { pattern: /\ba?ss?(hole|hat)\b/i, score: 3, label: 'asshole' },
    { pattern: /\bba?sta?rd\b/i, score: 3, label: 'bastard' },
    { pattern: /\bga?y\b/i, score: 1, label: 'gay' },
]

const KASAR_COMPACT_KEYWORDS = [
    { keyword: 'anjing', score: 3, label: 'anjing' },
    { keyword: 'bangsat', score: 3, label: 'bangsat' },
    { keyword: 'kontol', score: 3, label: 'kontol' },
    { keyword: 'memek', score: 3, label: 'memek' },
    { keyword: 'ngentot', score: 4, label: 'ngentot' },
    { keyword: 'ngewe', score: 3, label: 'ngewe' },
    { keyword: 'goblok', score: 3, label: 'goblok' },
    { keyword: 'goblog', score: 3, label: 'goblog' },
    { keyword: 'idiot', score: 3, label: 'idiot' },
    { keyword: 'babi', score: 3, label: 'babi' },
    { keyword: 'kampret', score: 3, label: 'kampret' },
    { keyword: 'keparat', score: 3, label: 'keparat' },
    { keyword: 'taik', score: 3, label: 'taik' },
    { keyword: 'tahi', score: 2, label: 'tahi' },
    { keyword: 'peler', score: 3, label: 'peler' },
    { keyword: 'jemut', score: 3, label: 'jemut' },
    { keyword: 'kintil', score: 3, label: 'kintil' },
    { keyword: 'meki', score: 3, label: 'meki' },
    { keyword: 'asu', score: 3, label: 'asu' },
    { keyword: 'buzim', score: 3, label: 'buzim' },
    { keyword: 'puki', score: 3, label: 'puki' },
    { keyword: 'fuck', score: 4, label: 'fuck' },
    { keyword: 'bitch', score: 3, label: 'bitch' },
    { keyword: 'shit', score: 3, label: 'shit' },
    { keyword: 'asshole', score: 3, label: 'asshole' },
    { keyword: 'bastard', score: 3, label: 'bastard' },
    { keyword: 'stagin', score: 3, label: 'stagin' },
    { keyword: 'dobiol', score: 3, label: 'dobiol' },
]

// ═══════════════════════════════════════════════
// DETECTION FUNCTION
// ═══════════════════════════════════════════════

function detectKasar(text) {
    if (!text || typeof text !== 'string') return { matched: false, score: 0, matches: [], type: null }

    const lowerText = text.toLowerCase().trim()
    if (!lowerText) return { matched: false, score: 0, matches: [], type: null }

    const compact = lowerText.replace(/[\s._\-]+/g, '')

    const matches = new Set()
    let totalScore = 0

    for (const { pattern, score, label } of KASAR_PATTERNS) {
        if (score === 0) continue
        if (pattern.test(lowerText)) {
            matches.add(label)
            totalScore += score
        }
    }

    for (const { keyword, score, label } of KASAR_COMPACT_KEYWORDS) {
        if (compact.includes(keyword)) {
            matches.add(label)
            totalScore += score
        }
    }

    const matched = totalScore >= 3
    return { matched, score: totalScore, matches: [...matches], type: 'kasar' }
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

async function handleAntiKasar(m, sock, db) {
    if (!m.isGroup) return false

    const groupData = db.getGroup(m.chat) || {}
    if (groupData.antikasar !== 'on') return false

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

        const detected = detectKasar(text)
        if (!detected.matched) return false

        const maxWarn = groupData.kasarMaxWarn || 3
        const kickMode = groupData.kasarKickMode || 'on'
        const deleteMode = groupData.kasarDeleteMode || 'on'

        if (!groupData.kasarWarns) groupData.kasarWarns = {}
        const currentWarn = (groupData.kasarWarns[m.sender] || 0) + 1
        groupData.kasarWarns[m.sender] = currentWarn
        db.setGroup(m.chat, groupData)

        const senderTag = m.sender.split('@')[0]
        const matchesStr = detected.matches.join(', ')

        if (deleteMode === 'on' && isBotAdmin) {
            try {
                await sock.sendMessage(m.chat, {
                    delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender }
                })
            } catch (e) { console.error('[antikasar.js]:', e.message); }
        }

        if (currentWarn >= maxWarn) {
            groupData.kasarWarns[m.sender] = 0
            db.setGroup(m.chat, groupData)

            if (kickMode === 'on' && isBotAdmin) {
                try {
                    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
                    await sock.sendMessage(m.chat, {
                        text: raraWarning("ANTI KASAR — TINDAKAN", [
                            ["Pengirim", `@${senderTag}`],
                            ["Pelanggaran", "Kata kasar terdeteksi"],
                            ["Terdeteksi", matchesStr],
                            ["Peringatan", `${currentWarn} dari ${maxWarn}`],
                            ["Tindakan", "Dikeluarkan dari grup otomatis"],
                        ], "Kata kasar tidak diperbolehkan di grup ini."),
                        mentions: [m.sender]
                    })
                } catch {
                    await sock.sendMessage(m.chat, {
                        text: raraWarning("ANTI KASAR — INFO", [
                            ["Pengirim", `@${senderTag}`],
                            ["Pelanggaran", "Kata kasar terdeteksi"],
                            ["Peringatan", `${currentWarn} dari ${maxWarn}`],
                            ["Tindakan", "Tidak dieksekusi — bot bukan admin"],
                        ], "Jadikan bot admin agar auto-kick bisa berjalan."),
                        mentions: [m.sender]
                    })
                }
            } else if (kickMode === 'off') {
                await sock.sendMessage(m.chat, {
                    text: raraWarning("ANTI KASAR — PERINGATAN MAKSIMAL", [
                    ["Pengirim", `@${senderTag}`],
                    ["Pelanggaran", "Kata kasar terdeteksi"],
                    ["Terdeteksi", matchesStr],
                    ["Peringatan", `${currentWarn} dari ${maxWarn}`],
                    ["Tindakan", "Auto-kick dimatikan di grup ini"],
                ], "Jaga perkataanmu — admin dapat mengeluarkanmu secara manual."),
                    mentions: [m.sender]
                })
            }
        } else {
            await sock.sendMessage(m.chat, {
                text: raraWarning("ANTI KASAR — PERINGATAN", [
                ["Pengirim", `@${senderTag}`],
                ["Pelanggaran", "Kata kasar terdeteksi"],
                ["Terdeteksi", matchesStr],
                ["Peringatan", `${currentWarn} dari ${maxWarn}`],
                ["Tindakan", "Pesan dihapus"],
            ], `Jaga perkataanmu — ${maxWarn - currentWarn} peringatan lagi kamu akan dikeluarkan dari grup.`),
                mentions: [m.sender]
            })
        }
        return true
    } catch (e) {
        console.error('[AntiKasar]', e.message)
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
        const status = groupData.antikasar === 'on' ? '✅ ON' : '❌ OFF'
        const maxWarn = groupData.kasarMaxWarn || 3
        const kick = groupData.kasarKickMode || 'on'
        const del = groupData.kasarDeleteMode || 'on'
        const warnCount = groupData.kasarWarns ? Object.keys(groupData.kasarWarns).length : 0

        let txt = '│\n'
        txt += '│\n'
        txt += '│ Status: *' + status + '*\n'
        txt += '│ Max Warn: *' + maxWarn + 'x*\n'
        txt += '│ Auto-Kick: *' + kick.toUpperCase() + '*\n'
        txt += '│ Auto-Delete: *' + del.toUpperCase() + '*\n'
        txt += '│ User Warned: *' + warnCount + '*\n'
        txt += '│\n'
        txt += '│ *📋 COMMAND:*\n'
        txt += '│ `' + m.prefix + 'antikasar on/off`\n'
        txt += '│ `' + m.prefix + 'antikasar warn <angka>`\n'
        txt += '│ `' + m.prefix + 'antikasar kick on/off`\n'
        txt += '│ `' + m.prefix + 'antikasar delete on/off`\n'
        txt += '│ `' + m.prefix + 'antikasar reset @user`\n'
        txt += '│ `' + m.prefix + 'antikasar resetall`\n'
        txt += ''
        return await m.reply(raraWrap("antikasar", txt))
    }

    if (sub === 'on') {
        db.setGroup(m.chat, { antikasar: 'on' })
        return m.reply(raraWrap("Antikasar", `
│ Deteksi kata kasar diaktifkan
│ Sistem: Warn 3x lalu kick
`, "info"))
    }
    if (sub === 'off') {
        db.setGroup(m.chat, { antikasar: 'off' })
        return m.reply(raraWrap("Antikasar", `
│ Deteksi kata kasar dinonaktifkan
`, "info"))
    }
    if (sub === 'warn') {
        const count = parseInt(args[1])
        if (!count || count < 1 || count > 10) return m.reply(raraWrap("Antikasar", '❌ Masukkan angka 1-10'))
        db.setGroup(m.chat, { kasarMaxWarn: count })
        return m.reply(raraWrap("Antikasar", `Max peringatan: ${count}x`, "info"))
    }
    if (sub === 'kick') {
        const opt = args[1]?.toLowerCase()
        if (opt === 'on') { db.setGroup(m.chat, { kasarKickMode: 'on' }); m.react('✅'); return m.reply(raraWrap("Antikasar", '✅ Auto-kick anti-kasar ON')) }
        if (opt === 'off') { db.setGroup(m.chat, { kasarKickMode: 'off' }); m.react('✅'); return m.reply(raraWrap("Antikasar", '⚠️ Auto-kick anti-kasar OFF, hanya warn')) }
        return m.reply('❌ Gunakan: `' + m.prefix + 'antikasar kick on/off`')
    }
    if (sub === 'delete') {
        const opt = args[1]?.toLowerCase()
        if (opt === 'on') { db.setGroup(m.chat, { kasarDeleteMode: 'on' }); m.react('✅'); return m.reply(raraWrap("Antikasar", '✅ Auto-delete anti-kasar ON')) }
        if (opt === 'off') { db.setGroup(m.chat, { kasarDeleteMode: 'off' }); m.react('✅'); return m.reply(raraWrap("Antikasar", '⚠️ Auto-delete anti-kasar OFF')) }
        return m.reply('❌ Gunakan: `' + m.prefix + 'antikasar delete on/off`')
    }
    if (sub === 'reset') {
        const target = m.mentionedJid?.[0] || (args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        if (!target || target === 'undefined@s.whatsapp.net') return m.reply('❌ Tag user')
        const updated = groupData
        if (updated.kasarWarns?.[target]) delete updated.kasarWarns[target]
        db.setGroup(m.chat, updated)
        return m.reply(raraWrap("Antikasar", `Warn warn kasar @${target.split('@')[0]} direset`, "info"), { mentions: [target] })
    }
    if (sub === 'resetall') {
        const updated = groupData
        updated.kasarWarns = {}
        db.setGroup(m.chat, updated)
        return m.reply(raraWrap("Antikasar", `Semua warn kasar direset`, "info"))
    }
    return m.reply('❌ Ketik `' + m.prefix + 'antikasar` untuk daftar command')
}

export { pluginConfig as config, handler, handleAntiKasar, detectKasar }
