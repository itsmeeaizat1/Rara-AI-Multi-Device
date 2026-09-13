// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import moment from 'moment-timezone'
import config from '../../config.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { persistLoad, persistSave } from "../../src/lib/nova-ram-persist.js";
const pluginConfig = {
    name: 'absen',
    alias: ["absen"],
    category: 'group',
    description: 'Tandai kehadiran di sesi absen',
    usage: '.absen',
    example: '.absen',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}
if (!global.absensi) global.absensi = {}
async function handler(m, { sock }) {
  persistLoad("absensi"); // restore sesi absen dari db (anti hilang pas restart)
    const chatId = m.chat
    if (!global.absensi[chatId]) {
        return m.reply(claraWrap("Tidak Ada Absen", 
            `Belum ada sesi absen di grup ini!\n\n` +
            `Admin dapat memulai dengan\n` +
            `*.mulaiabsen [keterangan]*`))
    }
    const absen = global.absensi[chatId]
    if (absen.peserta.includes(m.sender)) {
        return m.reply(claraWrap("Absen", `Kamu sudah absen!`, "error"))
    }
    absen.peserta.push(m.sender)
    persistSave("absensi")
    const now = moment().tz('Asia/Jakarta')
    const dateStr = now.format('D MMMM YYYY')
    const list = absen.peserta
        .map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`)
        .join('\n')
    await m.reply(claraWrap("MANTAP, @${m.sender.split('@')[0]} HADIRR", `✅ *MANTAP, @${m.sender.split('@')[0]} HADIRR*\n` +
            `TUJUAN ABSEN: ${absen.keterangan}\n` +
            "" +
            `📅 ${dateStr}\n` +
            `👥 Total: ${absen.peserta.length}\n` +
            `📝 *Daftar Hadir*\n` +
            `${list}\n` +
            `---\n\n` +
            `_Ketik *${m.prefix}absen* untuk hadir_\n` +
            `_Ketik *${m.prefix}cekabsen* untuk melihat daftar_`))
}
export { pluginConfig as config, handler }