// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
const pluginConfig = {
    name: 'setintro',
    alias: ['setperkenalan', 'introset'],
    category: 'group',
    description: 'Set pesan intro grup (admin only)',
    usage: '.setintro <pesan>',
    example: '.setintro Selamat datang @user di @group!',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const introText = m.fullArgs?.trim() || m.text?.trim()
    
    if (!introText) {
        return sendReplyWithNav(sock, m, `📝 *sEt Intro*\n\n` +
            `> Masukkan pesan intro!\n\n` +
            `*Placeholder yang tersedia:*\n` +
            `> @user - Nama pengguna\n` +
            `> @group - Nama grup\n` +
            `> @count - Jumlah member\n` +
            `> @date - Tanggal hari ini\n` +
            `> @time - Waktu sekarang\n` +
            `> @desc - Deskripsi grup\n` +
            `> @botname - Nama bot\n\n` +
            `*Contoh:*\n` +
            `> .setintro Selamat datang @user di grup @group! 👋`, "setintro")
    }
    
    const groupData = db.getGroup(m.chat) || db.setGroup(m.chat)
    groupData.intro = introText
    db.setGroup(m.chat, groupData)
    db.save()
    
    await m.reply(claraWrap("setintro", `✅ *Intro Disave!*\n` +
        `Pesan intro grup berhasil diubah.\n` +
        `Ketik *${m.prefix}intro* untuk melihat hasilnya.`))
}

export { pluginConfig as config, handler }