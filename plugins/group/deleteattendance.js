// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { persistLoad, persistSave } from "../../src/lib/nova-ram-persist.js";
const pluginConfig = {
    name: 'hapusabsen',
    alias: ["hapusabsen"],
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
  persistLoad("absensi"); // restore sesi absen dari db (anti hilang pas restart)
    const chatId = m.chat
    
    if (!global.absensi[chatId]) {
        return m.reply(novaWrap("Tidak Ada Absen", `Tidak ada sesi absen di grup ini!`, "info"))
    }
    
    const absen = global.absensi[chatId]
    const totalPeserta = absen.peserta.length
    
    delete global.absensi[chatId]
  persistSave("absensi")
    
    await m.reply(novaWrap("ABSEN DITUTUP!", 
        `Penyebab?\n` +
        `📝 ${absen.keterangan}\n` +
        `👥 Total hadir: ${totalPeserta}\n\n` +
        `Sesi absen telah dihapus.`))
}

export { pluginConfig as config, handler }