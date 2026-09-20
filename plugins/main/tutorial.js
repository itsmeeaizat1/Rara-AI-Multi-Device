// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Request owner 20 Sep 2026: tombol Penggunaan (popup Rules & Tutorial) di
// menu card — .tutorial adalah tujuan baris "Tutorial" di popup itu.
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'tutorial',
    alias: ["tutorial", "carapakai", "panduan"],
    category: 'main',
    description: 'Tutorial cara pakai bot untuk pemula (plain text)',
    usage: '.tutorial',
    example: '.tutorial',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { config: botConfig }) {
    const botName = botConfig?.bot?.name || 'Nova-AI'
    const prefix = m.prefix || '.'
    // Request owner 20 Sep 2026: tutorial diperluas jadi 12 contoh penggunaan
    // lengkap — pengenalan, fitur basic (AI, stiker, play, downloader), grup,
    // anti, switch, RPG, sampai info & bantuan.
    const lines = [
        `*Tutorial Penggunaan ${botName}*`,
        '',
        `1. Pengenalan`,
        `Semua command diawali tanda ${prefix}`,
        `Ketik ${prefix}menu buat lihat semua fitur, ${prefix}allmenu buat daftar lengkap`,
        `Tombol di bawah menu bisa langsung diklik buat navigasi`,
        '',
        `2. Ngobrol sama AI`,
        `${prefix}novaagent <pertanyaan> — tanya apa aja, bisa nyari web juga`,
        `Reply foto + ${prefix}novaagent apa ini — AI baca gambarnya`,
        ``,
        `3. Bikin stiker`,
        `Kirim atau reply foto, ketik ${prefix}sticker <caption opsional>`,
        ``,
        `4. Putar lagu`,
        `${prefix}play <judul lagu> — kirim audio lagunya`,
        ``,
        `5. Downloader video & sosmed`,
        `${prefix}tiktok <link> · ${prefix}ytmp4 <link YouTube> · ${prefix}alldl <link apa pun>`,
        ``,
        `6. Edit & convert media`,
        `Reply foto + ${prefix}hd 4 — resample HD`,
        `Reply foto + ${prefix}remini — jernihin buram`,
        `Reply foto + ${prefix}toanime — ubah jadi anime`,
        ``,
        `7. Fitur grup (admin)`,
        `${prefix}tagall <pesan> — mention semua anggota`,
        `${prefix}kick @user — keluarkan anggota`,
        `${prefix}welcome on — sambutan anggota baru`,
        `${prefix}groupinfo — info lengkap grup`,
        ``,
        `8. Fitur anti (admin)`,
        `${prefix}antispam on — blokir yang spam command`,
        `${prefix}antisticker on — blokir kiriman stiker`,
        `Lihat semua anti di kategori Grup, contoh: ${prefix}antilinkgc, ${prefix}antitoxic`,
        ``,
        `9. Notifikasi otomatis / switch`,
        `${prefix}switch auto — daftar semua notif otomatis (cuaca, gempa, dll)`,
        `${prefix}switch auto cuaca on — contoh nyalain satu fitur`,
        ``,
        `10. RPG & level`,
        `${prefix}dailyreward — klaim hadiah harian`,
        `${prefix}adventure — petualangan dapat exp & uang`,
        `${prefix}berburu — berburu binatang`,
        `${prefix}levelinfo — cek level & progress kamu`,
        ``,
        `11. Info & bantuan`,
        `${prefix}rules — peraturan bot · ${prefix}owner — kontak owner`,
        `${prefix}donasi — dukung bot · ${prefix}tutorial — tutorial ini lagi`,
        ``,
        `12. Command gak jalan?`,
        `Cek penulisan & spasinya, pastikan pake tanda ${prefix}`,
        `Fitur media harus reply/kirim gambar atau video dulu`,
        `Kalau masih error, ketik ${prefix}menu lalu pilih Support`,
    ]
    await m.reply(claraWrap('Tutorial Penggunaan Bot', lines))
}

export { pluginConfig as config, handler }
