// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA

import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { raraWarning } from "../../src/lib/rara-group-protection.js";

const pluginConfig = {
    name: 'antibucin',
    alias: ["antibucin"],
    category: 'group',
    description: 'Deteksi kata kata bucin/gombal/simp di grup',
    usage: '.antibucin <on/off/kick/delete/warn/reset/resetall>',
    example: '.antibucin on',
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
// BUCIN / GOMBAL / SIMP PATTERNS
// ═══════════════════════════════════════════════

const BUCIN_PATTERNS = [
    { pattern: /\baku\s+(cinta|sayang|suka)\s+(kamu|kau|mu|love)\b/i, score: 3, label: 'aku cinta kamu' },
    { pattern: /\bkamu\s+(cantik|manis|imut|lucu)\s+(banget|skali|sekali)\b/i, score: 3, label: 'pujian berlebih' },
    { pattern: /\bkau\s+(cantik|manis|imut|lucu)\s+(banget|skali)\b/i, score: 3, label: 'pujian berlebih' },
    { pattern: /\bgue\s+(cinta|sayang)\s+(kamu|kau|lu)\b/i, score: 3, label: 'gue cinta kamu' },
    { pattern: /\bgw\s+(cinta|sayang)\s+(kamu|kau|lu)\b/i, score: 3, label: 'gw cinta kamu' },
    { pattern: /\baku\s+(mau|ingin)\s+(jadi\s+)?pacarmu\b/i, score: 3, label: 'mau jadi pacar' },
    { pattern: /\bmau\s+gak\s+(jadi|jadi\s+)?pacar\s+(ku|aku)\b/i, score: 4, label: 'tembak pacar' },
    { pattern: /\bmau\s+ga\s+(jadi\s+)?pacar/i, score: 4, label: 'tembak' },
    { pattern: /\bmaaf\s+(terlalu|terlalu\s+suka)\s+(cantik|manis|imut)\b/i, score: 3, label: 'gombal cantik' },
    { pattern: /\bsuka\s+sama\s+(kamu|kau|mu|lu)\b/i, score: 2, label: 'suka sama kamu' },
    { pattern: /\bcinta\s+sama\s+(kamu|kau|mu|lu)\b/i, score: 3, label: 'cinta sama kamu' },
    { pattern: /\bmiss\s+you\s+(so|so\s+much|very)\b/i, score: 3, label: 'miss you' },
    { pattern: /\bi\s+love\s+you\s+(so\s+)?(much|more)\b/i, score: 4, label: 'i love you' },
    { pattern: /\biloveyou\b/i, score: 4, label: 'iloveyou' },
    { pattern: /\bily\s+(sm|so\s+much)\b/i, score: 3, label: 'ily' },
    { pattern: /\bjadian\s+(gak|ga|yuk|gk)\b/i, score: 3, label: 'jadian' },
    { pattern: /\bjadian\s+(yuk|yukk)\b/i, score: 3, label: 'jadian yuk' },
    { pattern: /\btembak\s+(kamu|kau|dia|lu)\b/i, score: 2, label: 'tembak' },
    { pattern: /\bsimp\s+(untuk|buat)\b/i, score: 3, label: 'simp' },
    { pattern: /\bsimping\b/i, score: 3, label: 'simping' },
    { pattern: /\bau\s+gelut\s+aku\s+ngambek/i, score: 3, label: 'gelut ngambek' },
    { pattern: /\bau\s+(sayang|cinta)\b/i, score: 3, label: 'au sayang' },
    { pattern: /\baku\s+(sayang|cinta)\s+au\b/i, score: 3, label: 'aku sayang au' },
    { pattern: /\bsayang\s+banget\s+(sama|sma)\s+(kamu|kau|mu|lu)\b/i, score: 3, label: 'sayang banget' },
    { pattern: /\bcinta\s+banget\s+(sama|sma)\s+(kamu|kau|mu|lu)\b/i, score: 3, label: 'cinta banget' },
    { pattern: /\bminta\s+(wa|nomor|nomornya)\s+(kak|kk|mbak|mba)\b/i, score: 2, label: 'minta nomor' },
    { pattern: /\bboleh\s+minta\s+(wa|nomor| kontak)\b/i, score: 2, label: 'minta kontak' },
    { pattern: /\bkamu\s+(tuh|itu)\s+(cantik|manis|imut)\s+banget/i, score: 3, label: 'pujian berlebih' },
    { pattern: /\bsetiap\s+ngelihat\s+(kamu|kau|lu)/i, score: 3, label: 'gombal ngelihat' },
    { pattern: /\bhati\s+(ku|aku)\s+(berdebar|berdebar-debar|deg-degan)\b/i, score: 3, label: 'hati berdebar' },
    { pattern: /\bjantung\s+(ku|aku)\s+(berdebar|deg)/i, score: 3, label: 'jantung berdebar' },
    { pattern: /\baku\s+(bisa|mau)\s+(menunggu|nungguin)\s+(kamu|kau)\s+selamanya/i, score: 4, label: 'menunggu selamanya' },
    { pattern: /\bngerusahain\s+(kamu|kau)\s+(gak|ga)\s+(maaf|mau)\b/i, score: 2, label: 'gombal' },
    { pattern: /\bkalo\s+(kamu|kau)\s+(senang|senyum)\s+(aku|gue)\s+(senang|senyum)\s+banget/i, score: 3, label: 'gombal senyum' },
    { pattern: /\bwkwk\s+(sayang|cinta)\b/i, score: 1, label: 'sayang casual' },
    { pattern: /\bgombal\s+(parah|banget)\b/i, score: 2, label: 'gombal' },
    { pattern: /\bpacar\s+(ku|aku)\s+yang\s+(cantik|manis|imut)/i, score: 2, label: 'pacar cantik' },
    { pattern: /\bpeluk\s+(kamu|kau)\s+(cium|ciuman)\b/i, score: 2, label: 'peluk cium' },
    { pattern: /\bnyemil\s+(kamu|kau)\s+(manis|imut)\b/i, score: 3, label: 'nyemil' },
    { pattern: /\bcolong\s+(hati|hatimu)\b/i, score: 3, label: 'colong hati' },
    { pattern: /\bjatuh\s+cinta\s+(sama|sma|kepada)\b/i, score: 3, label: 'jatuh cinta' },
    { pattern: /\bsimpanan\s+(ku|aku)\s+(cantik|manis|imut)/i, score: 3, label: 'simpanan' },
    { pattern: /\bkhodam\s+(ku|aku)\s+(cantik|manis|imut)/i, score: 1, label: 'khodam' },
    { pattern: /\bau\s+(aku|ku)\s+(sayang|cinta)\s+selamanya/i, score: 4, label: 'sayang selamanya' },
    { pattern: /\baku\s+(mau|ingin)\s+(sama|sma)\s+(kamu|kau)\s+terus/i, score: 3, label: 'mau terus' },
    { pattern: /\btanpa\s+(kamu|kau)\s+(aku|gue)\s+(gak|ga)\s+(bisa|mungkin)/i, score: 4, label: 'tanpa kamu gak bisa' },
    { pattern: /\bmaaf\s+(kak|kk|mbak)\s+boleh\s+(minta|kasih)\s+(wa|nomor)/i, score: 3, label: 'minta wa' },
    { pattern: /\bkok\s+(cantik|manis|imut)\s+banget\s+sih/i, score: 3, label: 'kok cantik' },
    { pattern: /\bcakep\s+banget\s+(sih|sih)\b/i, score: 2, label: 'cakep banget' },
]

const BUCIN_COMPACT_KEYWORDS = [
    { keyword: 'sayangkamu', score: 3, label: 'sayang kamu' },
    { keyword: 'cintakamu', score: 3, label: 'cinta kamu' },
    { keyword: 'iloveyou', score: 4, label: 'iloveyou' },
    { keyword: 'ilyso', score: 3, label: 'ily' },
    { keyword: 'pacarku', score: 1, label: 'pacar ku' },
    { keyword: 'simpping', score: 3, label: 'simping' },
    { keyword: 'colonghati', score: 3, label: 'colong hati' },
    { keyword: 'jatuhcinta', score: 3, label: 'jatuh cinta' },
]

// ═══════════════════════════════════════════════
// DETECTION FUNCTION
// ═══════════════════════════════════════════════

function detectBucin(text) {
    if (!text || typeof text !== 'string') return { matched: false, score: 0, matches: [], type: null }

    const lowerText = text.toLowerCase().trim()
    if (!lowerText) return { matched: false, score: 0, matches: [], type: null }

    const compact = lowerText.replace(/[\s._\-]+/g, '')

    const matches = new Set()
    let totalScore = 0

    for (const { pattern, score, label } of BUCIN_PATTERNS) {
        if (score === 0) continue
        if (pattern.test(lowerText)) {
            matches.add(label)
            totalScore += score
        }
    }

    for (const { keyword, score, label } of BUCIN_COMPACT_KEYWORDS) {
        if (compact.includes(keyword)) {
            matches.add(label)
            totalScore += score
        }
    }

    const matched = totalScore >= 4
    return { matched, score: totalScore, matches: [...matches], type: 'bucin' }
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

async function handleAntiBucin(m, sock, db) {
    if (!m.isGroup) return false

    const groupData = db.getGroup(m.chat) || {}
    if (groupData.antibucin !== 'on') return false

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

        const detected = detectBucin(text)
        if (!detected.matched) return false

        const maxWarn = groupData.bucinMaxWarn || 3
        const kickMode = groupData.bucinKickMode || 'on'
        const deleteMode = groupData.bucinDeleteMode || 'on'

        if (!groupData.bucinWarns) groupData.bucinWarns = {}
        const currentWarn = (groupData.bucinWarns[m.sender] || 0) + 1
        groupData.bucinWarns[m.sender] = currentWarn
        db.setGroup(m.chat, groupData)

        const senderTag = m.sender.split('@')[0]
        const matchesStr = detected.matches.join(', ')

        if (deleteMode === 'on' && isBotAdmin) {
            try {
                await sock.sendMessage(m.chat, {
                    delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.sender }
                })
            } catch (e) { console.error('[antibucin.js]:', e.message); }
        }

        if (currentWarn >= maxWarn) {
            groupData.bucinWarns[m.sender] = 0
            db.setGroup(m.chat, groupData)

            if (kickMode === 'on' && isBotAdmin) {
                try {
                    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
                    await sock.sendMessage(m.chat, {
                        text: raraWarning("ANTI BUCIN — TINDAKAN", [
    ["Pengirim", `@${senderTag}`],
    ["Pelanggaran", "Bucin berlebihan terdeteksi"],
    ["Terdeteksi", matchesStr],
    ["Peringatan", `${currentWarn} dari ${maxWarn}`],
    ["Tindakan", "Dikeluarkan dari grup otomatis"],
], "Bucin berlebihan tidak diperbolehkan di grup ini."),
                        mentions: [m.sender]
                    })
                } catch {
                    await sock.sendMessage(m.chat, {
                        text: raraWarning("ANTI BUCIN — INFO", [
    ["Pengirim", `@${senderTag}`],
    ["Pelanggaran", "Bucin berlebihan terdeteksi"],
    ["Peringatan", `${currentWarn} dari ${maxWarn}`],
    ["Tindakan", "Tidak dieksekusi — bot bukan admin"],
], "Jadikan bot admin agar auto-kick bisa berjalan."),
                        mentions: [m.sender]
                    })
                }
            } else if (kickMode === 'off') {
                await sock.sendMessage(m.chat, {
                    text: raraWarning("ANTI BUCIN — PERINGATAN MAKSIMAL", [
    ["Pengirim", `@${senderTag}`],
    ["Pelanggaran", "Bucin berlebihan terdeteksi"],
    ["Terdeteksi", matchesStr],
    ["Peringatan", `${currentWarn} dari ${maxWarn}`],
    ["Tindakan", "Auto-kick dimatikan di grup ini"],
], "Kurangi gombalanmu — admin dapat mengeluarkanmu secara manual."),
                    mentions: [m.sender]
                })
            }
        } else {
            await sock.sendMessage(m.chat, {
                text: raraWarning("ANTI BUCIN — PERINGATAN", [
    ["Pengirim", `@${senderTag}`],
    ["Pelanggaran", "Bucin berlebihan terdeteksi"],
    ["Terdeteksi", matchesStr],
    ["Peringatan", `${currentWarn} dari ${maxWarn}`],
    ["Tindakan", "Pesan dihapus"],
], `Kurangi gombalanmu — ${maxWarn - currentWarn} peringatan lagi kamu akan dikeluarkan dari grup.`),
                mentions: [m.sender]
            })
        }
        return true
    } catch (e) {
        console.error('[AntiBucin]', e.message)
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
        const status = groupData.antibucin === 'on' ? '✅ ON' : '❌ OFF'
        const maxWarn = groupData.bucinMaxWarn || 3
        const kick = groupData.bucinKickMode || 'on'
        const del = groupData.bucinDeleteMode || 'on'
        const warnCount = groupData.bucinWarns ? Object.keys(groupData.bucinWarns).length : 0

        let txt = '│\n'
        txt += '│\n'
        txt += '│ Status: *' + status + '*\n'
        txt += '│ Max Warn: *' + maxWarn + 'x*\n'
        txt += '│ Auto-Kick: *' + kick.toUpperCase() + '*\n'
        txt += '│ Auto-Delete: *' + del.toUpperCase() + '*\n'
        txt += '│ User Warned: *' + warnCount + '*\n'
        txt += '│\n'
        txt += '│ *📋 COMMAND:*\n'
        txt += '│ `' + m.prefix + 'antibucin on/off`\n'
        txt += '│ `' + m.prefix + 'antibucin warn <angka>`\n'
        txt += '│ `' + m.prefix + 'antibucin kick on/off`\n'
        txt += '│ `' + m.prefix + 'antibucin delete on/off`\n'
        txt += '│ `' + m.prefix + 'antibucin reset @user`\n'
        txt += '│ `' + m.prefix + 'antibucin resetall`\n'
        txt += ''
        return await m.reply(raraWrap("antibucin", txt))
    }

    if (sub === 'on') {
        db.setGroup(m.chat, { antibucin: 'on' })
        return m.reply(raraWrap("Antibucin", `
│ Deteksi bucin/gombal diaktifkan
│ Sistem: Warn 3x lalu kick
`, "info"))
    }
    if (sub === 'off') {
        db.setGroup(m.chat, { antibucin: 'off' })
        return m.reply(raraWrap("Antibucin", `
│ Deteksi bucin dinonaktifkan
`, "info"))
    }
    if (sub === 'warn') {
        const count = parseInt(args[1])
        if (!count || count < 1 || count > 10) return m.reply(raraWrap("Antibucin", '❌ Masukkan angka 1-10'))
        db.setGroup(m.chat, { bucinMaxWarn: count })
        return m.reply(raraWrap("Antibucin", `Max peringatan: ${count}x`, "info"))
    }
    if (sub === 'kick') {
        const opt = args[1]?.toLowerCase()
        if (opt === 'on') { db.setGroup(m.chat, { bucinKickMode: 'on' }); m.react('✅'); return m.reply(raraWrap("Antibucin", '✅ Auto-kick anti-bucin ON')) }
        if (opt === 'off') { db.setGroup(m.chat, { bucinKickMode: 'off' }); m.react('✅'); return m.reply(raraWrap("Antibucin", '⚠️ Auto-kick anti-bucin OFF, hanya warn')) }
        return m.reply('❌ Gunakan: `' + m.prefix + 'antibucin kick on/off`')
    }
    if (sub === 'delete') {
        const opt = args[1]?.toLowerCase()
        if (opt === 'on') { db.setGroup(m.chat, { bucinDeleteMode: 'on' }); m.react('✅'); return m.reply(raraWrap("Antibucin", '✅ Auto-delete anti-bucin ON')) }
        if (opt === 'off') { db.setGroup(m.chat, { bucinDeleteMode: 'off' }); m.react('✅'); return m.reply(raraWrap("Antibucin", '⚠️ Auto-delete anti-bucin OFF')) }
        return m.reply('❌ Gunakan: `' + m.prefix + 'antibucin delete on/off`')
    }
    if (sub === 'reset') {
        const target = m.mentionedJid?.[0] || (args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        if (!target || target === 'undefined@s.whatsapp.net') return m.reply('❌ Tag user')
        const updated = groupData
        if (updated.bucinWarns?.[target]) delete updated.bucinWarns[target]
        db.setGroup(m.chat, updated)
        return m.reply(raraWrap("Antibucin", `Warn warn bucin @${target.split('@')[0]} direset`, "info"), { mentions: [target] })
    }
    if (sub === 'resetall') {
        const updated = groupData
        updated.bucinWarns = {}
        db.setGroup(m.chat, updated)
        return m.reply(raraWrap("Antibucin", `Semua warn bucin direset`, "info"))
    }
    return m.reply('❌ Ketik `' + m.prefix + 'antibucin` untuk daftar command')
}

export { pluginConfig as config, handler, handleAntiBucin, detectBucin }
