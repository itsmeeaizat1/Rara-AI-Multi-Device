// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'menuwithmusic',
    alias: ['audiomenu', 'setaudiomenu', 'toggleaudiomenu', 'aktifaudiomenu'],
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
    try {
        const args = m.args || []
        const option = args[0]?.toLowerCase()
        const current = db.setting('audioMenu') !== false

        if (!option) {
            return await m.reply(claraWrap("Aktifaudiomenu", `Status: *${current ? '✅ Aktif' : '❌ Nonaktif'}*\n\n*Cara pakai:*\n\`${m.prefix}aktifaudiomenu ya\` - Aktifkan audio\n\`${m.prefix}aktifaudiomenu gak\` - Nonaktifkan audio`))
        }

        if (option === 'ya' || option === 'on' || option === '1' || option === 'aktif') {
            if (current) {
                return m.reply(claraWrap("Aktifaudiomenu", `⚠️ Audio menu sudah aktif!`))
            }
            db.setting('audioMenu', true)
            await db.save()
            await m.react('✅')
            return m.reply(`✅ Audio menu *diaktifkan*!\n\nSekarang ketika ada yang ketik \`.menu\`, audio akan muncul.`)
        }

        if (option === 'gak' || option === 'off' || option === '0' || option === 'nonaktif') {
            if (!current) {
                return m.reply(claraWrap("Aktifaudiomenu", `⚠️ Audio menu sudah nonaktif!`))
            }
            db.setting('audioMenu', false)
            await db.save()
            await m.react('✅')
            return m.reply(`❌ Audio menu *dinonaktifkan*!\n\nSekarang \`.menu\` tidak akan ada audio.`)
        }

        return m.reply(`❌ Opsi tidak valid!\n\nGunakan: \`ya\` atau \`gak\``)
    } catch (error) {
        console.error('[aktifaudiomenu.js]:', error.message)
        await m.reply('❌ Error: ' + error.message)
        return { handled: true }
    }
}

export { pluginConfig as config, handler }
