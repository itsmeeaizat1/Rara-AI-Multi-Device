// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'clankick',
    alias: ["clankick"],
    category: 'clan',
    description: 'Kick member dari clan (leader only)',
    usage: '.clankick @user',
    example: '.clankick @user',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)

    if (!user?.clanId) return m.reply(raraWrap("clankick", `❌ Kamu belum punya clan`))
    if (!db.db.data.clans) db.db.data.clans = {}

    const clan = db.db.data.clans[user.clanId]
    if (!clan) return m.reply(raraWrap("Clankick", `❌ Clan tidak ditemukan`))
    if (clan.leader !== m.sender) return m.reply(raraWrap("Clankick", `❌ Hanya leader yang bisa kick`))

    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) {
        return m.reply( raraWrap("clankick", `👢 *clan kick*\n\n` +
            `Tag atau reply member yang mau dikeluarkan\n\n` +
            `Contoh: *.clankick @user*`, "guide"), "clankick")
    }

    if (target === m.sender) return m.reply(raraWrap("clankick", `❌ Tidak bisa kick diri sendiri`))
    if (!clan.members.includes(target)) return m.reply(raraWrap("Clankick", `❌ User bukan member clan ini`))

    clan.members = clan.members.filter(jid => jid !== target)
    db.setUser(target, { clanId: null })
    db.save()

    const emblem = clan.emblem || '🏰'

    await m.reply(`${emblem} *Kicked*\n\n` +
        `@${target.split('@')[0]} dikeluarkan dari *${clan.name}*\n` +
        `Sisa members: ${clan.members.length}/50`)
}

export { pluginConfig as config, handler }