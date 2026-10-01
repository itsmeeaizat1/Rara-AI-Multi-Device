// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: "clanleaderboard",
    alias: ["clanleaderboard"],
    category: 'clan',
    description: 'Lihat ranking clan',
    usage: '.clanleaderboard',
    example: '.clanleaderboard',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function getRankTitle(level) {
    if (level >= 50) return '👑'
    if (level >= 30) return '💎'
    if (level >= 20) return '🏆'
    if (level >= 10) return '🥇'
    if (level >= 5) return '🥈'
    return '🥉'
}

async function handler(m, { sock }) {
    const db = getDatabase()

    if (!db.db.data.clans) db.db.data.clans = {}

    const clans = Object.values(db.db.data.clans)
    if (clans.length === 0) {
        return m.reply(claraWrap("clanleaderboard", `🏰 Belum ada clan terdaftar\n\nBuat: *.clancreate <nama>*`))
    }

    clans.sort((a, b) => {
        const scoreA = ((a.wins || 0) * 100) + (a.exp || 0) + ((a.level || 1) * 500)
        const scoreB = ((b.wins || 0) * 100) + (b.exp || 0) + ((b.level || 1) * 500)
        return scoreB - scoreA
    })

    const medals = ['🥇', '🥈', '🥉']

    let txt = `🏰 *clan leaderboard*\n\n`

    clans.slice(0, 10).forEach((clan, i) => {
        const medal = medals[i] || `${i + 1}.`
        const totalGames = (clan.wins || 0) + (clan.losses || 0)
        const winRate = totalGames > 0
            ? ((clan.wins / totalGames) * 100).toFixed(0)
            : '—'
        const emblem = clan.emblem || '🏰'
        const rank = getRankTitle(clan.level || 1)

        txt += `${medal} ${emblem} *${clan.name}*\n`
        txt += `   ${rank} Lv.${clan.level || 1} · ${clan.wins || 0}W/${clan.losses || 0}L (${winRate}%) · 👥 ${clan.members.length}\n\n`
    })

    txt += `Total *${clans.length}* clan terdaftar`

    await m.reply( txt, "clanleaderboard")
}

export { pluginConfig as config, handler }