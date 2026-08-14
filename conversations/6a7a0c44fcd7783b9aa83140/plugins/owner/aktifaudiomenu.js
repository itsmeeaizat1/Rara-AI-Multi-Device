import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'aktifaudiomenu',
    alias: ['audiomenu', 'setaudiomenu', 'toggleaudiomenu'],
    category: 'owner',
    description: 'Toggle audio saat menampilkan menu',
    usage: '.aktifaudiomenu ya/gak',
    example: '.aktifaudiomenu ya',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, db }) {
    const args = m.args || []
    const option = args[0]?.toLowerCase()

    const current = db.setting('audioMenu') !== false

    if (!option) {
        return sendReplyWithNav(sock, m, `🔊 *ᴀᴜᴅɪᴏ ᴍᴇɴᴜ sᴇᴛᴛɪɴɢ*\n\n` +
            `> Status: *${current ? '✅ Aktif' : '❌ Nonaktif'}*\n\n` +
            `*Cara pakai:*\n` +
            `> \`${m.prefix}aktifaudiomenu ya\` - Aktifkan audio\n` +
            `> \`${m.prefix}aktifaudiomenu gak\` - Nonaktifkan audio`, "aktifaudiomenu")
    }

    if (option === 'ya' || option === 'on' || option === '1' || option === 'aktif') {
        if (current) {
            return m.reply(claraWrap("Aktifaudiomenu", `⚠️ Audio menu sudah aktif!`))
        }
        db.setting('audioMenu', true)
        await db.save()
        await m.react('✅')
        return m.reply(`✅ Audio menu *diaktifkan*!\n\n> Sekarang ketika ada yang ketik \`.menu\`, audio akan muncul.`)
    }

    if (option === 'gak' || option === 'off' || option === '0' || option === 'nonaktif') {
        if (!current) {
            return m.reply(claraWrap("Aktifaudiomenu", `⚠️ Audio menu sudah nonaktif!`))
        }
        db.setting('audioMenu', false)
        await db.save()
        await m.react('✅')
        return m.reply(`❌ Audio menu *dinonaktifkan*!\n\n> Sekarang \`.menu\` tidak akan ada audio.`)
    }

    return m.reply(`❌ Opsi tidak valid!\n\nGunakan: \`ya\` atau \`gak\``)
}

export { pluginConfig as config, handler }