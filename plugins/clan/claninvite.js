// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'claninvite',
    alias: ['inviteclan'],
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

    if (!user?.clanId) return m.reply(claraWrap("claninvite", `❌ Kamu belum punya clan`))
    if (!db.db.data.clans) db.db.data.clans = {}

    const clan = db.db.data.clans[user.clanId]
    if (!clan) return m.reply(claraWrap("Claninvite", `❌ Clan tidak ditemukan`))

    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) {
        return sendReplyWithNav(sock, m, `📨 *CLAN INVITE*\n\n` +
            `Tag atau reply user yang mau diundang\n\n` +
            `Contoh: *.claninvite @user*`, "claninvite")
    }

    if (target === m.sender) return m.reply(claraWrap("claninvite", `❌ Tidak bisa invite diri sendiri`))

    const targetUser = db.getUser(target)
    if (targetUser?.clanId) return m.reply(claraWrap("Claninvite", `❌ User tersebut sudah punya clan`))
    if (clan.members.length >= 50) return m.reply(claraWrap("Claninvite", `❌ Clan sudah penuh (50/50)`))

    clan.members.push(target)
    db.setUser(target, { clanId: user.clanId })
    db.save()

    const emblem = clan.emblem || '🏰'

    await m.reply(`${emblem} *INVITED!*\n\n` +
        `@${target.split('@')[0]} bergabung ke *${clan.name}*\n` +
        `Members: ${clan.members.length}/50`)
}

export { pluginConfig as config, handler }