// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'hapusabsen',
    alias: ['deleteabsen', 'tutupabsen', 'closeabsen', 'resetabsen'],
    category: 'group',
    description: 'Hapus/tutup sesi absen (admin only)',
    usage: '.hapusabsen',
    example: '.hapusabsen',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: true
}

if (!global.absensi) global.absensi = {}

async function handler(m, { sock }) {
    const chatId = m.chat
    
    if (!global.absensi[chatId]) {
        return m.reply(claraWrap("Tidak Ada Absen", `❌ *Tidak Ada Absen*\n\n` +
            `Tidak ada sesi absen di grup ini!`))
    }
    
    const absen = global.absensi[chatId]
    const totalPeserta = absen.peserta.length
    
    delete global.absensi[chatId]
    
    await m.reply(claraWrap("ABSEN DITUTUP!", `✅ *ABSEN DITUTUP!*\n\n` +
        `Penyebab?\n` +
        `📝 ${absen.keterangan}\n` +
        `👥 Total hadir: ${totalPeserta}\n\n` +
        `Sesi absen telah dihapus.`))
}

export { pluginConfig as config, handler }