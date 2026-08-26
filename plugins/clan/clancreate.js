// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'clancreate',
    alias: ["clancreate"],
    category: 'clan',
    description: 'Buat clan baru',
    usage: '.clancreate <nama>',
    example: '.clancreate DragonSlayer',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

const CLAN_CREATE_COST = 50000
const MAX_CLAN_NAME = 20
const CLAN_EMBLEMS = ['🐉', '🦅', '🐺', '🦁', '🔥', '⚡', '🌙', '☀️', '💎', '🗡️']

function generateShortId(name, existingClans) {
    const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase()
    let id = clean.length >= 3 ? clean.slice(0, 3) : clean.padEnd(3, 'X')
    if (!existingClans[id]) return id
    id = clean.slice(0, 4) || id
    if (!existingClans[id]) return id
    for (let i = 1; i <= 99; i++) {
        const attempt = clean.slice(0, 3) + i
        if (!existingClans[attempt]) return attempt
    }
    return clean.slice(0, 2) + Math.random().toString(36).slice(2, 5).toUpperCase()
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    const clanName = m.text?.trim()

    if (!clanName) {
        return m.reply( `⚔️ *ᴄʀᴇᴀᴛᴇ ᴄʟᴀɴ*\n\n` +
            `Buat clan dan kumpulkan member!\n\n` +
            `Biaya: *Rp ${CLAN_CREATE_COST.toLocaleString('id-ID')}*\n` +
            `Max nama: *${MAX_CLAN_NAME} karakter*\n\n` +
            `Contoh: *.clancreate DragonSlayer*`, "clancreate")
    }

    if (clanName.length > MAX_CLAN_NAME) {
        return m.reply(claraWrap("Clancreate", `❌ Nama clan maksimal ${MAX_CLAN_NAME} karakter`))
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(clanName)) {
        return m.reply(claraWrap("Clancreate", `❌ Nama clan hanya boleh huruf, angka, dan spasi`))
    }

    if (!db.db.data.clans) db.db.data.clans = {}

    if (user.clanId) {
        return m.reply(claraWrap("Clancreate", `❌ Kamu sudah punya clan\nKeluar dulu: *.clanleave*`))
    }

    const existingClan = Object.values(db.db.data.clans).find(c => c.name.toLowerCase() === clanName.toLowerCase())
    if (existingClan) {
        return m.reply(claraWrap("Clancreate", `❌ Nama *${clanName}* sudah dipakai`))
    }

    if ((user.koin || 0) < CLAN_CREATE_COST) {
        return m.reply(claraWrap("Rp ${CLAN_CREATE_COST.toLocaleString('id-ID')}", `❌ Koin tidak cukup\n\n` +
            `Butuh: *Rp ${CLAN_CREATE_COST.toLocaleString('id-ID')}*\n` +
            `Punya: *Rp ${(user.koin || 0).toLocaleString('id-ID')}*`))
    }

    const emblem = CLAN_EMBLEMS[Math.floor(Math.random() * CLAN_EMBLEMS.length)]
    const clanId = generateShortId(clanName, db.db.data.clans)
    const clan = {
        id: clanId,
        name: clanName,
        emblem,
        leader: m.sender,
        members: [m.sender],
        exp: 0,
        level: 1,
        wins: 0,
        losses: 0,
        createdAt: new Date().toISOString(),
        description: 'Belum ada deskripsi',
        isOpen: true
    }

    db.db.data.clans[clanId] = clan
    db.updateKoin(m.sender, -CLAN_CREATE_COST)
    db.setUser(m.sender, { clanId })
    await db.save()

    await m.reply(claraWrap("CLAN CREATED", `${emblem} *ᴄʟᴀɴ ᴄʀᴇᴀᴛᴇᴅ*\n\n` +
        `*${clanName}*\n` +
        `Leader: @${m.sender.split('@')[0]}\n` +
        `Status: Open · 1/50 members\n\n` +
        `_-Rp ${CLAN_CREATE_COST.toLocaleString('id-ID')}_\n\n` +
        `Invite teman: *.claninvite @user*\n` +
        `Atau share ID: *${clanId}*`))
}

export { pluginConfig as config, handler }