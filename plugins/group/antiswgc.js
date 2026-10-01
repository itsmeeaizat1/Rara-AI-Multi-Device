// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'antiswgc',
    alias: ["antiswgc"],
    category: 'group',
    description: 'Deteksi tipe SW group mention atau status mention yang masuk ke grup',
    usage: '.antiswgc <on/off>',
    example: '.antiswgc on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock,  db }) {
    const action = (m.args || [])[0]?.toLowerCase()
    const group = db.getGroup(m.chat) || {}

    if (!action) {
        const status = group.antiswgc || 'off'
        await m.reply( `📡 *antiswgc*\n\n` +
            `Status: *${status === 'on' ? '✅ Aktif' : '❌ Nonaktif'}*\n\n` +
            `Fitur ini mendeteksi tipe SW group mention seperti:\n` +
            `groupStatusMentionMessage\n` +
            `groupMentionedMessage\n` +
            `statusMentionMessage\n` +
            `contextInfo.groupMentions\n\n` +
            `\`${m.prefix}antiswgc on\`\n` +
            `\`${m.prefix}antiswgc off\``, "antiswgc")
        return
    }

    if (action === 'on') {
        db.setGroup(m.chat, { ...group, antiswgc: 'on' })
        await m.reply(novaWrap("Antiswgc", '✅ *antiswgc aktif*\n\nTipe SW group mention akan dihapus otomatis.'))
        return
    }

    if (action === 'off') {
        db.setGroup(m.chat, { ...group, antiswgc: 'off' })
        { const __navText = '❌ *antiswgc nonaktif*'; await m.reply(__navText); }
        return
    }

    await m.reply(novaWrap("Antiswgc", '❌ Gunakan: on atau off'))
}

export { pluginConfig as config, handler }
