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
    const lines = [
        `📖 *Tutorial Cara Pakai ${botName}*`,
        '',
        `1. Ketik ${prefix}menu — lihat semua fitur & kategori`,
        `2. Ketik ${prefix}allmenu — daftar lengkap semua command`,
        `3. Fitur media: kirim/reply gambar atau video + caption command`,
        `   contoh: reply foto + ketik ${prefix}toanime · ${prefix}hd · ${prefix}remini`,
        `4. Fitur downloader: kirim link + command`,
        `   contoh: ${prefix}tiktok <link> · ${prefix}ytmp4 <link> · ${prefix}alldl <link>`,
        `5. Tombol di bawah menu bisa langsung diklik buat navigasi`,
        `6. Ketik ${prefix}rules buat lihat peraturan penggunaan bot`,
        '',
        `💡 Command gak jalan? Cek penulisannya atau ketik ${prefix}menu lagi`,
    ]
    await m.reply(claraWrap('Tutorial Penggunaan Bot', lines))
}

export { pluginConfig as config, handler }
