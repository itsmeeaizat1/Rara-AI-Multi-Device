// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import { getDatabase } from '../../src/lib/nova-database.js'

const pluginConfig = {
    name: 'anti18plus',
    alias: ["anti18plus"],
    category: 'group',
    description: 'Deteksi konten 18+ di grup dengan sistem warn',
    usage: '.anti18plus <on/off/metode/warn/reset>',
    example: '.anti18plus on',
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
// 18+ DETECTION PATTERNS
// ═══════════════════════════════════════════════

const NSFW_PATTERNS = [
    { pattern: /\bbokep\b/i, score: 3, label: 'bokep' },
    { pattern: /\bporn(hub|o)?\b/i, score: 3, label: 'porno' },
    { pattern: /\bxxx\b/i, score: 3, label: 'xxx' },
    { pattern: /\bngent[oe]k?\b/i, score: 3, label: 'ngentot' },
    { pattern: /\bmemek\b/i, score: 3, label: 'memek' },
    { pattern: /\bkontol\b/i, score: 3, label: 'kontol' },
    { pattern: /\bmeki\b/i, score: 3, label: 'meki' },
    { pattern: /\bentot\b/i, score: 3, label: 'entot' },
    { pattern: /\bentotin\b/i, score: 3, label: 'entotin' },
    { pattern: /\bngewe\b/i, score: 3, label: 'ngewe' },
    { pattern: /\bnewes\b/i, score: 3, label: 'newes' },
    { pattern: /\bsex\b/i, score: 3, label: 'sex' },
    { pattern: /\bsexy\b/i, score: 2, label: 'sexy' },
    { pattern: /\bhentai\b/i, score: 3, label: 'hentai' },
    { pattern: /\bcolmek\b/i, score: 3, label: 'colmek' },
    { pattern: /\bcoli\b/i, score: 2, label: 'coli' },
    { pattern: /\bbokep\s+(indo|viral|terbaru|hd|gratis)\b/i, score: 4, label: 'bokep+kata kunci' },
    { pattern: /\blink\s+(bokep|porno|18\+|nsfw)\b/i, score: 4, label: 'link 18+' },
    { pattern: /\bnonton\s+bokep\b/i, score: 4, label: 'nonton bokep' },
    { pattern: /\bdownload\s+bokep\b/i, score: 4, label: 'download bokep' },
    { pattern: /\bstreaming\s+bokep\b/i, score: 4, label: 'streaming bokep' },
    { pattern: /\barisan\s+bokep\b/i, score: 3, label: 'aritan bokep' },
    { pattern: /\bmontok\b/i, score: 2, label: 'montok' },
    { pattern: /\btobrut\b/i, score: 3, label: 'tobrut' },
    { pattern: /\btransfer\s+(bokep|video\s+18)\b/i, score: 4, label: 'transfer bokep' },
    { pattern: /\bsange\b/i, score: 2, label: 'sange' },
    { pattern: /\bsangek\b/i, score: 2, label: 'sangek' },
    { pattern: /\bdildo\b/i, score: 3, label: 'dildo' },
    { pattern: /\bvagina\b/i, score: 3, label: 'vagina' },
    { pattern: /\bpenis\b/i, score: 3, label: 'penis' },
    { pattern: /\bblowjob\b/i, score: 3, label: 'blowjob' },
    { pattern: /\bhandjob\b/i, score: 3, label: 'handjob' },
    { pattern: /\banal\s+sex\b/i, score: 3, label: 'anal sex' },
    { pattern: /\boral\s+sex\b/i, score: 3, label: 'oral sex' },
    { pattern: /\bcreampie\b/i, score: 3, label: 'creampie' },
    { pattern: /\bteen\s+sex\b/i, score: 4, label: 'teen sex' },
    { pattern: /\bonly\s?fans\b/i, score: 2, label: 'onlyfans' },
    { pattern: /\bdiscord\s+18\+\b/i, score: 3, label: 'discord 18+' },
    { pattern: /\bgroup\s+18\+\b/i, score: 3, label: 'group 18+' },
    { pattern: /\bwa\.me.*18\+/i, score: 3, label: 'wa.me 18+' },
    { pattern: /\bsharing\s+(bokep|video\s+18)\b/i, score: 4, label: 'sharing bokep' },
    { pattern: /\bsepong\b/i, score: 3, label: 'sepong' },
    { pattern: /\bgratis\s+bokep\b/i, score: 4, label: 'gratis bokep' },
    { pattern: /\bfull\s+video\s+(18|bokep|sex)\b/i, score: 4, label: 'full video 18+' },
    { pattern: /\bjilat\s+(memek|kontol)\b/i, score: 3, label: 'jilat' },
]

const NSFW_COMPACT_KEYWORDS = [
    { keyword: 'bokep', score: 3, label: 'bokep' },
    { keyword: 'pornhub', score: 3, label: 'pornhub' },
    { keyword: 'porno', score: 3, label: 'porno' },
    { keyword: 'xxx', score: 3, label: 'xxx' },
    { keyword: 'ngentot', score: 3, label: 'ngentot' },
    { keyword: 'ngewe', score: 3, label: 'ngewe' },
    { keyword: 'memek', score: 3, label: 'memek' },
    { keyword: 'kontol', score: 3, label: 'kontol' },
    { keyword: 'meki', score: 3, label: 'meki' },
    { keyword: 'colmek', score: 3, label: 'colmek' },
    { keyword: 'hentai', score: 3, label: 'hentai' },
    { keyword: 'sex', score: 3, label: 'sex' },
    { keyword: 'tobrut', score: 3, label: 'tobrut' },
    { keyword: 'sepong', score: 3, label: 'sepong' },
    { keyword: 'entot', score: 3, label: 'entot' },
    { keyword: 'sange', score: 2, label: 'sange' },
    { keyword: 'coli', score: 2, label: 'coli' },
    { keyword: 'montok', score: 2, label: 'montok' },
    { keyword: 'dildo', score: 3, label: 'dildo' },
    { keyword: 'blowjob', score: 3, label: 'blowjob' },
    { keyword: 'onlyfans', score: 2, label: 'onlyfans' },
    { keyword: 'bokepindo', score: 4, label: 'bokep indo' },
    { keyword: 'bokepviral', score: 4, label: 'bokep viral' },
    { keyword: 'downloadbokep', score: 4, label: 'download bokep' },
    { keyword: 'linkbokep', score: 4, label: 'link bokep' },
    { keyword: 'gratisbokep', score: 4, label: 'gratis bokep' },
    { keyword: 'sharingbokep', score: 4, label: 'sharing bokep' },
    { keyword: 'group18+', score: 3, label: 'group 18+' },
    { keyword: 'discord18+', score: 3, label: 'discord 18+' },
]

// ═══════════════════════════════════════════════
// JUDI PATTERNS (extended from existing)
// ═══════════════════════════════════════════════

const JUDI_PATTERNS = [
    { pattern: /\bjud[iol]{1,4}\b/i, score: 3, label: 'judi' },
    { pattern: /\bslot\b/i, score: 3, label: 'slot' },
    { pattern: /\bgacor\b/i, score: 3, label: 'gacor' },
    { pattern: /\bslot\s+gacor\b/i, score: 4, label: 'slot gacor' },
    { pattern: /\bmax\s?win\b/i, score: 3, label: 'maxwin' },
    { pattern: /\bscatter\b/i, score: 2, label: 'scatter' },
    { pattern: /\btogel\b/i, score: 3, label: 'togel' },
    { pattern: /\bcasino\b/i, score: 3, label: 'casino' },
    { pattern: /\brtp\b/i, score: 2, label: 'rtp' },
    { pattern: /\bpragmatic\b/i, score: 2, label: 'pragmatic' },
    { pattern: /\bpg\s?soft\b/i, score: 2, label: 'pgsoft' },
    { pattern: /\b(habanero|joker|spadegaming|microgaming)\b/i, score: 2, label: 'provider' },
    { pattern: /\bjackpot\b/i, score: 2, label: 'jackpot' },
    { pattern: /\bfree\s?spin\b/i, score: 2, label: 'free spin' },
    { pattern: /\bspin\s?gratis\b/i, score: 2, label: 'spin gratis' },
    { pattern: /\bpola\s?slot\b/i, score: 2, label: 'pola slot' },
    { pattern: /\bdeposit\b/i, score: 1, label: 'deposit' },
    { pattern: /\bdepo\b/i, score: 1, label: 'depo' },
    { pattern: /\bwithdraw\b/i, score: 1, label: 'withdraw' },
    { pattern: /\bwd\b/i, score: 1, label: 'wd' },
    { pattern: /bonus\s+new\s+member/i, score: 2, label: 'bonus new member' },
    { pattern: /bonus\s+(member|new\s*member)/i, score: 2, label: 'bonus member' },
    { pattern: /link\s+alternatif/i, score: 2, label: 'link alternatif' },
    { pattern: /bandar\s+(slot|togel|judi)/i, score: 2, label: 'bandar' },
    { pattern: /\btaruhan\b/i, score: 2, label: 'taruhan' },
    { pattern: /\bmin\s?dep(o|osit)\b/i, score: 2, label: 'min depo' },
    { pattern: /\bwd\s+(besar|kecil|gampang|lancar)\b/i, score: 2, label: 'wd iklan' },
    { pattern: /\bslot\s+(online|onlen)\b/i, score: 3, label: 'slot online' },
    { pattern: /\btogel\s+(online|onlen|hongkong|sgp|sydney)\b/i, score: 3, label: 'togel online' },
    { pattern: /\bagen\s+(casino|togel|slot|judi)\b/i, score: 3, label: 'agen' },
    { pattern: /\bpoker\s+(online|onlen|uang\s+asli)\b/i, score: 3, label: 'poker' },
    { pattern: /\bcapsa\b/i, score: 3, label: 'capsa' },
    { pattern: /\bdomino\s+(online|qq|kiu)\b/i, score: 3, label: 'domino' },
    { pattern: /\bsbotop\b/i, score: 3, label: 'sbotop' },
    { pattern: /\bcmd368\b/i, score: 3, label: 'cmd368' },
    { pattern: /\bsv388\b/i, score: 3, label: 'sv388' },
    { pattern: /\bbola\s+(online|onlen|betting)\b/i, score: 2, label: 'bola online' },
    { pattern: /\bbet\s+(online|onlen|gratis)\b/i, score: 2, label: 'bet online' },
    { pattern: /\bslot\s+(pragmatic|pg|habanero|joker)\b/i, score: 3, label: 'slot provider' },
    { pattern: /\brtp\s+(live|tertinggi|hari\s*ini)\b/i, score: 3, label: 'rtp live' },
    { pattern: /\bgampang\s+(menang|jackpot|maxwin)\b/i, score: 3, label: 'gampang menang' },
    { pattern: /\banti\s+(kalah|rungkad)\b/i, score: 2, label: 'anti kalah' },
    { pattern: /\bpolagacor\b/i, score: 3, label: 'pola gacor' },
    { pattern: /\bduit\s+mas\b/i, score: 2, label: 'duit mas' },
]

const JUDI_COMPACT_KEYWORDS = [
    { keyword: 'judi', score: 3, label: 'judi' },
    { keyword: 'judol', score: 3, label: 'judol' },
    { keyword: 'slot', score: 3, label: 'slot' },
    { keyword: 'gacor', score: 3, label: 'gacor' },
    { keyword: 'slotgacor', score: 4, label: 'slot gacor' },
    { keyword: 'maxwin', score: 3, label: 'maxwin' },
    { keyword: 'scatter', score: 2, label: 'scatter' },
    { keyword: 'togel', score: 3, label: 'togel' },
    { keyword: 'casino', score: 3, label: 'casino' },
    { keyword: 'rtp', score: 2, label: 'rtp' },
    { keyword: 'pragmatic', score: 2, label: 'pragmatic' },
    { keyword: 'pgsoft', score: 2, label: 'pgsoft' },
    { keyword: 'jackpot', score: 2, label: 'jackpot' },
    { keyword: 'freespin', score: 2, label: 'free spin' },
    { keyword: 'spingratis', score: 2, label: 'spin gratis' },
    { keyword: 'polaslot', score: 2, label: 'pola slot' },
    { keyword: 'bonusmember', score: 2, label: 'bonus member' },
    { keyword: 'bonusnewmember', score: 2, label: 'bonus new member' },
    { keyword: 'linkalternatif', score: 2, label: 'link alternatif' },
    { keyword: 'bandarslot', score: 2, label: 'bandar slot' },
    { keyword: 'bandartogel', score: 2, label: 'bandar togel' },
    { keyword: 'bandarjudi', score: 2, label: 'bandar judi' },
    { keyword: 'slotonline', score: 3, label: 'slot online' },
    { keyword: 'togelonline', score: 3, label: 'togel online' },
    { keyword: 'agenslot', score: 3, label: 'agen slot' },
    { keyword: 'agentogel', score: 3, label: 'agen togel' },
    { keyword: 'sbotop', score: 3, label: 'sbotop' },
    { keyword: 'cmd368', score: 3, label: 'cmd368' },
    { keyword: 'sv388', score: 3, label: 'sv388' },
    { keyword: 'polagacor', score: 3, label: 'pola gacor' },
    { keyword: 'gampangmenang', score: 3, label: 'gampang menang' },
    { keyword: 'gampangjackpot', score: 3, label: 'gampang jackpot' },
    { keyword: 'gampangmaxwin', score: 3, label: 'gampang maxwin' },
    { keyword: 'antikalah', score: 2, label: 'anti kalah' },
    { keyword: 'antirungkad', score: 2, label: 'anti rungkad' },
]

// ═══════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════

function detectNSFW(text) {
    if (!text || typeof text !== 'string') return { matched: false, score: 0, matches: [], type: null }

    const lowerText = text.toLowerCase().trim()
    if (!lowerText) return { matched: false, score: 0, matches: [], type: null }

    const compact = lowerText.replace(/[\s._\-]+/g, '')

    const matches = new Set()
    let totalScore = 0

    for (const { pattern, score, label } of NSFW_PATTERNS) {
        if (score === 0) continue
        if (pattern.test(lowerText)) {
            matches.add(label)
            totalScore += score
        }
    }

    for (const { keyword, score, label } of NSFW_COMPACT_KEYWORDS) {
        if (compact.includes(keyword)) {
            matches.add(label)
            totalScore += score
        }
    }

    const matched = totalScore >= 3
    return { matched, score: totalScore, matches: [...matches], type: '18+' }
}

function detectJudi(text) {
    if (!text || typeof text !== 'string') return { matched: false, score: 0, matches: [], type: null }

    const lowerText = text.toLowerCase().trim()
    if (!lowerText) return { matched: false, score: 0, matches: [], type: null }

    const compact = lowerText.replace(/[\s._\-]+/g, '')

    const matches = new Set()
    let totalScore = 0

    for (const { pattern, score, label } of JUDI_PATTERNS) {
        if (pattern.test(lowerText)) {
            matches.add(label)
            totalScore += score
        }
    }

    for (const { keyword, score, label } of JUDI_COMPACT_KEYWORDS) {
        if (compact.includes(keyword)) {
            matches.add(label)
            totalScore += score
        }
    }

    const matched = totalScore >= 3
    return { matched, score: totalScore, matches: [...matches], type: 'judi' }
}

// ═══════════════════════════════════════════════
// MAIN HANDLER - Called from message pipeline
// ═══════════════════════════════════════════════

async function handleAntiNSFW(m, sock, db) {
    if (!m.isGroup) return false

    const groupData = db.getGroup(m.chat) || {}

    const anti18On = groupData.anti18plus === 'on'
    const antiJudiOn = groupData.antijudolWarn === 'on'

    if (!anti18On && !antiJudiOn) return false

    const text = String(m.body || m.text || '').trim()
    if (!text) return false

    // Skip bot itself
    const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    if (m.sender === botNumber) return false

    try {
        const groupMeta = await sock.groupMetadata(m.chat)
        const senderNum = m.sender?.replace(/[^0-9]/g, '') || ''
        const botNum = botNumber?.replace(/[^0-9]/g, '') || ''

        // Skip if sender is admin
        const isSenderAdmin = groupMeta.participants.some(p => {
            if (!p.admin) return false
            const pNum = (p.jid || p.id || '').replace(/[^0-9]/g, '')
            return pNum === senderNum || pNum.includes(senderNum) || senderNum.includes(pNum)
        })
        if (isSenderAdmin) return false

        // Check if bot is admin
        const isBotAdmin = groupMeta.participants.some(p => {
            if (!p.admin) return false
            const pNum = (p.jid || p.id || '').replace(/[^0-9]/g, '')
            return pNum === botNum || pNum.includes(botNum) || botNum.includes(pNum)
        })

        // Detect content
        let detected = null

        if (anti18On) {
            const nsfwResult = detectNSFW(text)
            if (nsfwResult.matched) {
                detected = nsfwResult
            }
        }

        if (!detected && antiJudiOn) {
            const judiResult = detectJudi(text)
            if (judiResult.matched) {
                detected = judiResult
            }
        }

        if (!detected) return false

        // Get warn settings
        const isNSFW = detected.type === '18+'
        const warnKey = isNSFW ? 'nsfwWarns' : 'judiWarns'
        const maxWarn = groupData[isNSFW ? 'nsfwMaxWarn' : 'judiMaxWarn'] || 3
        const kickMode = groupData[isNSFW ? 'nsfwKickMode' : 'judiKickMode'] || 'on'
        const deleteMode = groupData[isNSFW ? 'nsfwDeleteMode' : 'judiDeleteMode'] || 'on'

        // Initialize warn tracking
        if (!groupData[warnKey]) groupData[warnKey] = {}
        const currentWarn = (groupData[warnKey][m.sender] || 0) + 1
        groupData[warnKey][m.sender] = currentWarn
        db.setGroup(m.chat, groupData)

        const senderTag = m.sender.split('@')[0]
        const typeLabel = isNSFW ? '🔞 18+' : '🎰 Judi'
        const matchesStr = detected.matches.join(', ')

        // Delete message if enabled
        if (deleteMode === 'on' && isBotAdmin) {
            try {
                await sock.sendMessage(m.chat, {
                    delete: {
                        remoteJid: m.chat,
                        fromMe: false,
                        id: m.key.id,
                        participant: m.sender,
                    },
                })
            } catch (e) { console.error('[anti18plus.js]:', e.message); }
        }

        // Check if warn limit reached
        if (currentWarn >= maxWarn) {
            // Reset warn count
            groupData[warnKey][m.sender] = 0
            db.setGroup(m.chat, groupData)

            if (kickMode === 'on' && isBotAdmin) {
                try {
                    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
                    await sock.sendMessage(m.chat, {
                        text:
                            '╭──「 *WARN LIMIT* 」\n│\n' +
                            '┃ 👤 User: @' + senderTag + '\n' +
                            '┃ 🏷️ Pelanggaran: ' + typeLabel + '\n' +
                            '┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n' +
                            '┃ 🔍 Terdeteksi: ' + matchesStr + '\n' +
                            '┃ ❌ Aksi: KICK OTOMATIS\n' +
                            '╰──────────\n' +
                            '_User telah dikeluarkan karena mencapai batas peringatan_',
                        mentions: [m.sender],
                    })
                } catch {
                    await sock.sendMessage(m.chat, {
                        text:
                            '╭──「 *WARN LIMIT* 」\n│\n' +
                            '┃ 👤 User: @' + senderTag + '\n' +
                            '┃ 🏷️ Pelanggaran: ' + typeLabel + '\n' +
                            '┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n' +
                            '┃ 🔍 Terdeteksi: ' + matchesStr + '\n' +
                            '┃ ⚠️ Aksi: WARN (bot bukan admin)\n' +
                            '╰──────────\n' +
                            '_Bot tidak bisa kick karena bukan admin_',
                        mentions: [m.sender],
                    })
                }
            } else if (kickMode === 'off') {
                await sock.sendMessage(m.chat, {
                    text:
                        '╭──「 *PERINGATAN MAX* 」\n│\n' +
                        '┃ 👤 User: @' + senderTag + '\n' +
                        '┃ 🏷️ Pelanggaran: ' + typeLabel + '\n' +
                        '┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n' +
                        '┃ 🔍 Terdeteksi: ' + matchesStr + '\n' +
                        '┃ 📌 Auto-kick: OFF (mode warn only)\n' +
                        '╰──────────\n' +
                        '_User mencapai batas peringatan, tapi auto-kick dimatikan_',
                    mentions: [m.sender],
                })
            }
        } else {
            await sock.sendMessage(m.chat, {
                text:
                    '╭──「 *PERINGATAN* 」\n│\n' +
                    '┃ 👤 User: @' + senderTag + '\n' +
                    '┃ 🏷️ Pelanggaran: ' + typeLabel + '\n' +
                    '┃ ⚠️ Warn: ' + currentWarn + '/' + maxWarn + '\n' +
                    '┃ 🔍 Terdeteksi: ' + matchesStr + '\n' +
                    '╰──────────\n' +
                    '_Tolong hentikan! ' + (maxWarn - currentWarn) + ' peringatan lagi = kick_',
                mentions: [m.sender],
            })
        }

        return true
    } catch (error) {
        console.error('[AntiNSFW]', error.message)
        return false
    }
}

// ═══════════════════════════════════════════════
// PLUGIN COMMAND HANDLER
// ═══════════════════════════════════════════════

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}
    const args = m.args || []
    const sub = args[0]?.toLowerCase()

    if (!sub) {
        const nsfwStatus = groupData.anti18plus === 'on' ? '✅ ON' : '❌ OFF'
        const judiStatus = groupData.antijudolWarn === 'on' ? '✅ ON' : '❌ OFF'
        const nsfwMaxWarn = groupData.nsfwMaxWarn || 3
        const judiMaxWarn = groupData.judiMaxWarn || 3
        const nsfwKick = groupData.nsfwKickMode || 'on'
        const judiKick = groupData.judiKickMode || 'on'
        const nsfwDelete = groupData.nsfwDeleteMode || 'on'
        const judiDelete = groupData.judiDeleteMode || 'on'

        const nsfwWarnCount = groupData.nsfwWarns ? Object.keys(groupData.nsfwWarns).length : 0
        const judiWarnCount = groupData.judiWarns ? Object.keys(groupData.judiWarns).length : 0

        let txt = '╭──「 *ANTI 18+ & JUDI* 」\n│\n'
        txt += '┃\n'
        txt += '┃ *🔞 Anti 18+*\n'
        txt += '┃ Status: *' + nsfwStatus + '*\n'
        txt += '┃ Max Warn: *' + nsfwMaxWarn + 'x*\n'
        txt += '┃ Auto-Kick: *' + nsfwKick.toUpperCase() + '*\n'
        txt += '┃ Auto-Delete: *' + nsfwDelete.toUpperCase() + '*\n'
        txt += '┃ User Warned: *' + nsfwWarnCount + '*\n'
        txt += '┃\n'
        txt += '┃ *🎰 Anti Judi*\n'
        txt += '┃ Status: *' + judiStatus + '*\n'
        txt += '┃ Max Warn: *' + judiMaxWarn + 'x*\n'
        txt += '┃ Auto-Kick: *' + judiKick.toUpperCase() + '*\n'
        txt += '┃ Auto-Delete: *' + judiDelete.toUpperCase() + '*\n'
        txt += '┃ User Warned: *' + judiWarnCount + '*\n'
        txt += '┃\n'
        txt += '┃ *📋 COMMAND:*\n'
        txt += '┃ `' + m.prefix + 'anti18plus on/off`\n'
        txt += '┃ `' + m.prefix + 'anti18plus judi on/off`\n'
        txt += '┃ `' + m.prefix + 'anti18plus warn <angka>`\n'
        txt += '┃ `' + m.prefix + 'anti18plus kick on/off`\n'
        txt += '┃ `' + m.prefix + 'anti18plus delete on/off`\n'
        txt += '┃ `' + m.prefix + 'anti18plus reset @user`\n'
        txt += '┃ `' + m.prefix + 'anti18plus resetall`\n'
        txt += '╰──────────'

        return await m.reply(claraWrap("anti18plus", txt))
    }

    if (sub === 'on') {
        db.setGroup(m.chat, { anti18plus: 'on' })
        return m.reply(
            '╭──「 *ANTI 18+ AKTIF* 」\n│\n' +
            '┃ Deteksi konten 18+ diaktifkan\n' +
            '┃ Sistem: Warn 3x lalu kick\n' +
            '┃ Auto-delete: ON\n' +
            '┃ Auto-kick: ON\n' +
            '╰──────────\n' +
            '_Ketik `' + m.prefix + 'anti18plus` untuk lihat pengaturan_'
        )
    }

    if (sub === 'off') {
        db.setGroup(m.chat, { anti18plus: 'off' })
        return m.reply(
            '╭──「 *ANTI 18+ MATI* 」\n│\n' +
            '┃ Deteksi konten 18+ dinonaktifkan\n' +
            '╰──────────'
        )
    }

    if (sub === 'judi') {
        const judiOpt = args[1]?.toLowerCase()
        if (judiOpt === 'on') {
            db.setGroup(m.chat, { antijudolWarn: 'on' })
            return m.reply(
                '╭──「 *ANTI JUDI AKTIF* 」\n│\n' +
                '┃ Deteksi konten judi diaktifkan\n' +
                '┃ Sistem: Warn 3x lalu kick\n' +
                '┃ Auto-delete: ON\n' +
                '┃ Auto-kick: ON\n' +
                '╰──────────\n' +
                '_Ketik `' + m.prefix + 'anti18plus` untuk lihat pengaturan_'
            )
        }
        if (judiOpt === 'off') {
            db.setGroup(m.chat, { antijudolWarn: 'off' })
            return m.reply(
                '╭──「 *ANTI JUDI MATI* 」\n│\n' +
                '┃ Deteksi konten judi dinonaktifkan\n' +
                '╰──────────'
            )
        }
        return m.reply('❌ Gunakan: `' + m.prefix + 'anti18plus judi on` atau `' + m.prefix + 'anti18plus judi off`')
    }

    if (sub === 'warn') {
        const count = parseInt(args[1])
        if (!count || count < 1 || count > 10) {
            return m.reply('❌ Masukkan angka 1-10\n💡 *Contoh:* `' + m.prefix + 'anti18plus warn 5`')
        }
        db.setGroup(m.chat, { nsfwMaxWarn: count, judiMaxWarn: count })
        return m.reply(
            '╭──「 *MAX WARN DIUBAH* 」\n│\n' +
            '┃ Max peringatan: *' + count + 'x*\n' +
            '┃ Berlaku untuk: Anti 18+ & Anti Judi\n' +
            '╰──────────'
        )
    }

    if (sub === 'kick') {
        const kickOpt = args[1]?.toLowerCase()
        if (kickOpt === 'on') {
            db.setGroup(m.chat, { nsfwKickMode: 'on', judiKickMode: 'on' })
            return m.reply(
                '╭──「 *AUTO-KICK ON* 」\n│\n' +
                '┃ Auto-kick diaktifkan\n' +
                '┃ User yang mencapai max warn akan di-kick\n' +
                '╰──────────'
            )
        }
        if (kickOpt === 'off') {
            db.setGroup(m.chat, { nsfwKickMode: 'off', judiKickMode: 'off' })
            return m.reply(
                '╭──「 *AUTO-KICK OFF* 」\n│\n' +
                '┃ Auto-kick dimatikan\n' +
                '┃ User yang mencapai max warn hanya diberi peringatan\n' +
                '┃ Tidak akan di-kick otomatis\n' +
                '╰──────────'
            )
        }
        return m.reply('❌ Gunakan: `' + m.prefix + 'anti18plus kick on` atau `' + m.prefix + 'anti18plus kick off`')
    }

    if (sub === 'delete') {
        const delOpt = args[1]?.toLowerCase()
        if (delOpt === 'on') {
            db.setGroup(m.chat, { nsfwDeleteMode: 'on', judiDeleteMode: 'on' })
            return m.reply(
                '╭──「 *AUTO-DELETE ON* 」\n│\n' +
                '┃ Pesan yang terdeteksi 18+/judi akan auto-delete\n' +
                '╰──────────'
            )
        }
        if (delOpt === 'off') {
            db.setGroup(m.chat, { nsfwDeleteMode: 'off', judiDeleteMode: 'off' })
            return m.reply(
                '╭──「 *AUTO-DELETE OFF* 」\n│\n' +
                '┃ Pesan tidak akan dihapus\n' +
                '┃ Tapi tetap terdeteksi dan diberi warn\n' +
                '╰──────────'
            )
        }
        return m.reply('❌ Gunakan: `' + m.prefix + 'anti18plus delete on` atau `' + m.prefix + 'anti18plus delete off`')
    }

    if (sub === 'reset') {
        const target = m.mentionedJid?.[0] || (args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        if (!target || target === 'undefined@s.whatsapp.net') {
            return m.reply('❌ Tag user atau masukkan nomor\n💡 *Contoh:* `' + m.prefix + 'anti18plus reset @user`')
        }

        const updated = groupData
        if (updated.nsfwWarns?.[target]) delete updated.nsfwWarns[target]
        if (updated.judiWarns?.[target]) delete updated.judiWarns[target]
        db.setGroup(m.chat, updated)

        const targetTag = target.split('@')[0]
        return m.reply(
            '╭──「 *WARN DIRESET* 」\n│\n' +
            '┃ 👤 User: @' + targetTag + '\n' +
            '┃ Warn 18+: Direset\n' +
            '┃ Warn Judi: Direset\n' +
            '╰──────────',
            { mentions: [target] }
        )
    }

    if (sub === 'resetall') {
        const updated = groupData
        updated.nsfwWarns = {}
        updated.judiWarns = {}
        db.setGroup(m.chat, updated)
        return m.reply(
            '╭──「 *SEMUA WARN DIRESET* 」\n│\n' +
            '┃ Semua warn 18+ dan judi di-reset\n' +
            '╰──────────'
        )
    }

    return m.reply('❌ Sub-command tidak dikenal.\nKetik `' + m.prefix + 'anti18plus` untuk melihat daftar command.')
}

export { pluginConfig as config, handler, handleAntiNSFW, detectNSFW, detectJudi }
