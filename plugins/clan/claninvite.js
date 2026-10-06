// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'claninvite',
    alias: ["claninvite"],
    category: 'clan',
    description: 'Invite & langsung tambahkan user ke clan',
    usage: '.claninvite @user',
    example: '.claninvite @user',
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

    if (!user?.clanId) return m.reply(raraWrap("claninvite", `❌ Kamu belum punya clan`))
    if (!db.db.data.clans) db.db.data.clans = {}

    const clan = db.db.data.clans[user.clanId]
    if (!clan) return m.reply(raraWrap("Claninvite", `❌ Clan tidak ditemukan`))

    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) {
        return m.reply( raraWrap("claninvite", `📨 *clan invite*\n\n` +
            `Tag atau reply user yang mau diundang\n\n` +
            `Contoh: *.claninvite @user*`, "guide"), "claninvite")
    }

    if (target === m.sender) return m.reply(raraWrap("claninvite", `❌ Tidak bisa invite diri sendiri`))

    const targetUser = db.getUser(target)
    if (targetUser?.clanId) return m.reply(raraWrap("Claninvite", `❌ User tersebut sudah punya clan`))
    if (clan.members.length >= 50) return m.reply(raraWrap("Claninvite", `❌ Clan sudah penuh (50/50)`))

    clan.members.push(target)
    db.setUser(target, { clanId: user.clanId })
    db.save()

    const emblem = clan.emblem || '🏰'

    await m.reply(`${emblem} *INVITED!*\n\n` +
        `@${target.split('@')[0]} bergabung ke *${clan.name}*\n` +
        `Members: ${clan.members.length}/50`)
}

export { pluginConfig as config, handler }