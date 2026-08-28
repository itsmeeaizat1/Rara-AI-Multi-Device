// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { getRpgData } from '../../src/lib/nova-rpg-service.js'
import { getCintaData, getLovePower } from '../../src/lib/nova-rpg-cinta.js'
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
import { toSC, claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
    name: "leaderboardrpg",
    alias: ["leaderboardrpg", "lbrpg", "topkoin", "topexp", "topenergi", "toplevel", "topbalance", "topcinta", "toplove", "topcouple"],
    category: 'main',
    description: 'Lihat leaderboard global (koin, exp, energi, cinta)',
    usage: '.leaderboardrpg [koin|exp|energi|cinta]',
    example: '.topcinta',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

function formatNumber(num) {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T'
    if (num >= 1000000000) return (num / 1000000000000).toFixed(2) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

async function handler(m, { sock }) {
    const db = getDatabase()
    const cmd = (m.command || '').toLowerCase()
    const args = m.args || []
    
    let type = 'overview'
    
    if (cmd.includes('koin') || cmd.includes('coin') || cmd.includes('bal') || cmd.includes('money')) {
        type = 'koin'
    } else if (cmd.includes('exp') || cmd.includes('xp') || cmd.includes('level')) {
        type = 'exp'
    } else if (cmd.includes('energi') || cmd.includes('energy')) {
        type = 'energi'
    } else if (cmd.includes('cinta') || cmd.includes('love') || cmd.includes('couple')) {
        type = 'cinta'
    } else if (args[0]) {
        const argType = args[0].toLowerCase()
        if (['koin', 'coin', 'bal', 'balance', 'money'].includes(argType)) type = 'koin'
        else if (['exp', 'xp', 'level'].includes(argType)) type = 'exp'
        else if (['energi', 'energy'].includes(argType)) type = 'energi'
        else if (['cinta', 'love', 'couple'].includes(argType)) type = 'cinta'
    }
    
    const dbData = db.data?.users || db.getAllUsers?.() || {}
    const users = []
    
    for (const [jid, userData] of Object.entries(dbData)) {
        if (!jid || jid === 'undefined') continue
        if (jid.length > 15 || jid.startsWith('120')) continue
        
        // Get cinta data
        let cintaAffection = 0
        let hasSpouse = false
        let lovePower = 0
        try {
            const rpg = getRpgData({ sender: jid.includes('@') ? jid : jid + '@s.whatsapp.net', pushName: userData.name || jid.split('@')[0] })
            const cinta = rpg.cinta || {}
            cintaAffection = cinta.affection || 0
            hasSpouse = Boolean(cinta.spouse)
            lovePower = hasSpouse ? getLovePower({ sender: jid.includes('@') ? jid : jid + '@s.whatsapp.net', pushName: userData.name || jid.split('@')[0] }) : 0
        } catch {}
        
        users.push({
            jid,
            koin: userData.koin || 0,
            exp: userData.rpg?.exp || userData.exp || 0,
            energi: userData.energi || 0,
            level: userData.rpg?.level || userData.level || 1,
            cinta: cintaAffection,
            lovePower: lovePower,
            hasSpouse: hasSpouse,
            name: userData.name || jid.split('@')[0]
        })
    }
    
    if (users.length === 0) {
        return m.reply(`╭──「 *${toSC('Leaderboard')}* 」\n│ ${toSC('Belum ada data user terdaftar')}\n╰──────────❀`)
    }
    
    const senderJid = m.sender.replace('@s.whatsapp.net', '')
    
    if (type === 'overview') {
        const totalUsers = users.length
        const maxBalUser = users.reduce((a, b) => a.koin > b.koin ? a : b, users[0])
        const maxExpUser = users.reduce((a, b) => a.exp > b.exp ? a : b, users[0])
        const maxEnergiUser = users.reduce((a, b) => a.energi > b.energi ? a : b, users[0])
        const cintaUsers = users.filter(u => u.hasSpouse)
        const maxCintaUser = cintaUsers.length > 0 
            ? cintaUsers.reduce((a, b) => a.lovePower > b.lovePower ? a : b, cintaUsers[0])
            : null
        
        const mentions = [
            maxBalUser.jid.includes('@') ? maxBalUser.jid : maxBalUser.jid + "@s.whatsapp.net",
            maxExpUser.jid.includes('@') ? maxExpUser.jid : maxExpUser.jid + "@s.whatsapp.net",
            maxEnergiUser.jid.includes('@') ? maxEnergiUser.jid : maxEnergiUser.jid + "@s.whatsapp.net"
        ]
        if (maxCintaUser) {
            mentions.push(maxCintaUser.jid.includes('@') ? maxCintaUser.jid : maxCintaUser.jid + "@s.whatsapp.net")
        }
        
        const overviewText = `╭──「 *${toSC('Leaderboard')}* 」
│ ${toSC('Total User')}: ${formatNumber(users.length)}
│ 💰 ${toSC('Koin Teratas')}: ${formatNumber(maxBalUser.koin)} (@${maxBalUser.jid.split('@')[0]})
│ ✨ ${toSC('EXP Teratas')}: ${formatNumber(maxExpUser.exp)} (@${maxExpUser.jid.split('@')[0]})
│ ⚡ ${toSC('Energi Teratas')}: ${formatNumber(maxEnergiUser.energi)} (@${maxEnergiUser.jid.split('@')[0]})
${maxCintaUser ? `│ ❤️ ${toSC('Cinta Teratas')}: ${formatNumber(maxCintaUser.lovePower)} LP (@${maxCintaUser.jid.split('@')[0]})` : `│ ❤️ ${toSC('Cinta')}: ${toSC('Belum ada couple')}`}
╰──────────❀

${toSC('Pilih tombol di bawah untuk melihat ranking')}!`
        try {
            await sock.sendButton(m.chat, fs.readFileSync(path.join(process.cwd(), 'assets', 'images', 'nova.jpg')), overviewText, m, {
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '💰 Top Koin',
                            id: `${m.prefix}topkoin`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '✨ Top EXP',
                            id: `${m.prefix}topexp`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '⚡ Top Energi',
                            id: `${m.prefix}topenergi`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '❤️ Top Cinta',
                            id: `${m.prefix}topcinta`
                        })
                    },
                    {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Kembali",
                            id: m.prefix + "menu"
                        })
                    }
                ],
            })
            return
        } catch (e) {
            return m.reply(claraWrap("leaderboardrpg", overviewText, { mentions }))
        }
    }
    
    // ── Cinta leaderboard: only users with spouse ──
    if (type === 'cinta') {
        const cintaUsers = users.filter(u => u.hasSpouse)
        
        if (cintaUsers.length === 0) {
            return m.reply(`╭──「 *${toSC('Top Cinta')}* 」\n│ ${toSC('Belum ada couple terdaftar')}\n│ ${toSC('Mulai berpacaran dengan')} .jadian\n╰──────────❀`)
        }
        
        cintaUsers.sort((a, b) => b.lovePower - a.lovePower)
        const top10 = cintaUsers.slice(0, 10)
        
        const mentions = []
        let text = `╭──「 *${toSC('TOP CINTA')}* ❤️ 」`
        
        top10.forEach((u, i) => {
            const medal = MEDALS[i] || `${i + 1}.`
            const isMe = u.jid === senderJid ? " *(You)*" : ""
            
            text += `\n│ ${medal} @${u.jid.split('@')[0]}${isMe}`
            text += `\n│   ❤️ ${toSC('Affection')}: ${formatNumber(u.cinta)} | 💪 LP: ${formatNumber(u.lovePower)}`
            
            mentions.push(u.jid.includes('@') ? u.jid : u.jid + "@s.whatsapp.net")
        })
        
        text += `\n╰──────────❀\n`
        
        const myRankIndex = cintaUsers.findIndex(u => u.jid === senderJid)
        if (myRankIndex !== -1) {
            text += `\n${toSC('Posisi kamu')}: *#${myRankIndex + 1}* ${toSC('dari')} *${formatNumber(cintaUsers.length)}* couple.`
        } else {
            text += `\n${toSC('Kamu belum punya pasangan')}. ${toSC('Ketik')} .jadian ${toSC('untuk mulai')}!`
        }
        
        await m.reply(claraWrap("leaderboardrpg", text, { mentions }))
        return
    }
    
    // ── Standard leaderboards (koin, exp, energi) ──
    let title, emoji, field, formatValue
    
    if (type === 'koin') {
        title = 'TOP GLOBAL KOIN'
        emoji = '💰'
        field = 'koin'
        formatValue = (u) => `Rp ${formatNumber(u.koin)}`
    } else if (type === 'exp') {
        title = 'TOP GLOBAL LEVEL'
        emoji = '✨'
        field = 'exp'
        formatValue = (u) => `Lv. ${u.level} (${formatNumber(u.exp)} XP)`
    } else if (type === 'energi') {
        title = 'TOP GLOBAL ENERGI'
        emoji = '⚡'
        field = 'energi'
        formatValue = (u) => `${formatNumber(u.energi)} ${toSC('Energi')}`
    }
    
    users.sort((a, b) => b[field] - a[field])
    
    const top10 = users.slice(0, 10)
    const totalField = users.reduce((sum, u) => sum + (u[field] || 0), 0)
    
    let text = `╭──「 *${toSC(title)}* 」`
    
    const mentions = []
    
    top10.forEach((u, i) => {
        const medal = MEDALS[i] || `${i + 1}.`
        const pct = totalField > 0 ? ((u[field] / totalField) * 100).toFixed(1) : 0
        const isMe = u.jid === senderJid ? " *(You)*" : ""
        
        text += `\n│ ${medal} @${u.jid.split('@')[0]}${isMe}`
        text += `\n│   ${formatValue(u)} (${pct}%)`
        
        mentions.push(u.jid.includes('@') ? u.jid : u.jid + "@s.whatsapp.net")
    })
    
    text += `\n╰──────────❀\n`
    
    const myRankIndex = users.findIndex(u => u.jid === senderJid)
    if (myRankIndex !== -1) {
        text += `\n${toSC('Posisi kamu')}: *#${myRankIndex + 1}* ${toSC('dari')} *${formatNumber(users.length)}* user.`
    } else {
        text += `\n${toSC('Kamu belum terdaftar di database')}.`
    }
    
    await m.reply(claraWrap("leaderboardrpg", text, { mentions }))
}

export { pluginConfig as config, handler }
