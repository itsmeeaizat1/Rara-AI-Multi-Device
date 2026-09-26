// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'cekowner',
    alias: ["cekowner"],
    category: "fun",
    description: 'Cek apakah user adalah owner bot',
    usage: '.cekowner @user',
    example: '.cekowner',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    let targetNumber = ''
    let targetJid = ''

    if (m.quoted) {
        targetNumber = m.quoted.sender?.replace(/[^0-9]/g, '') || ''
        targetJid = m.quoted.sender
    } else if (m.mentionedJid?.length) {
        targetNumber = m.mentionedJid[0]?.replace(/[^0-9]/g, '') || ''
        targetJid = m.mentionedJid[0]
    } else if (m.args?.length) {
        targetNumber = m.args[0].replace(/[^0-9]/g, '')
        targetJid = targetNumber + '@s.whatsapp.net'
    } else {
        targetNumber = m.sender?.replace(/[^0-9]/g, '') || ''
        targetJid = m.sender
    }

    if (targetNumber.startsWith('0')) targetNumber = '62' + targetNumber.slice(1)

    const isOwnerUser = config.isOwner(targetNumber)
    const isPartnerUser = config.isPartner(targetNumber)
    const isPremiumUser = config.isPremium(targetNumber)
    const user = db.getUser(targetJid)

    const roles = []
    if (isOwnerUser) roles.push('👑 Owner')
    if (isPartnerUser) roles.push('🤝 Partner')
    if (isPremiumUser) roles.push('💎 Premium')
    if (roles.length === 0) roles.push('👤 Free User')

    const ownerList = db.data.owner || []
    const isInOwnerDb = ownerList.includes(targetNumber)

    const lines = [
      `User: @${targetNumber}`,
      `Role: ${roles.join(' • ')}`,
      `Owner DB: ${isInOwnerDb ? 'Ya' : 'Tidak'}`,
    ];
    if (user) {
        lines.push(`Energi: ${user.energi === -1 ? '∞' : (user.energi ?? 0)}`);
        lines.push(`Koin: ${user.koin === -1 ? '∞' : (user.koin ?? 0).toLocaleString('id-ID')}`);
        lines.push(`Level: ${user.level ?? 1}`);
    }

    await m.reply(claraWrap("Cek Owner", lines), { mentions: [targetJid] });
}

export { pluginConfig as config, handler }