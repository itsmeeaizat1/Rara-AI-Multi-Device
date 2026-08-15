import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { startJadibot, isJadibotActive } from '../../src/lib/nova-jadibot-manager.js'
import { getJadibotAccess } from '../owner/setjadibot.js'
import { getDatabase } from '../../src/lib/nova-database.js'

const pluginConfig = {
    name: 'jadibot',
    alias: ['jadibotqr', 'becomebot', 'bot'],
    category: 'main',
    description: 'Jadikan nomor kamu menjadi bot (Pairing Code / QR)',
    usage: '.jadibot atau .jadibot qr',
    example: '.jadibot',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

function isPremiumUser(jid) {
    try {
        const db = getDatabase()
        const premiumUsers = db.setting('premiumUsers') || []
        const num = jid.replace(/[^0-9]/g, '')
        return premiumUsers.some(p => {
            const pNum = typeof p === 'string' ? p.replace(/[^0-9]/g, '') : (p.jid || '').replace(/[^0-9]/g, '')
            return pNum === num
        })
    } catch {
        return false
    }
}

function canUseJadibot(sender) {
    const access = getJadibotAccess()
    
    if (access.mode === 'all') return { allowed: true }
    
    if (access.mode === 'premium') {
        if (isPremiumUser(sender)) return { allowed: true }
        return { allowed: false, reason: 'Fitur jadibot khusus premium user. Upgrade ke premium untuk menggunakan fitur ini.' }
    }
    
    if (access.mode === 'specific') {
        if (access.allowedUsers.includes(sender)) return { allowed: true }
        return { allowed: false, reason: 'Nomor kamu tidak ada di daftar yang diizinkan untuk jadibot.' }
    }
    
    return { allowed: false, reason: 'Akses jadibot tidak dikonfigurasi.' }
}

async function handler(m, { sock }) {
    const sender = m.sender
    if (!sender) { const __navText = claraWrap("jadibot", 'Gagal mengidentifikasi nomor kamu'); return await m.reply(__navText); }

    // Cek akses jadibot
    const access = canUseJadibot(sender)
    if (!access.allowed) {
        return m.reply(access.reason)
    }

    if (isJadibotActive(sender)) {
        return m.reply(
            `*Jadibot Sudah Aktif*\n\n` +
            `> Nomor kamu sudah menjadi bot\n` +
            `> Ketik \`${m.prefix}stopjadibot\` untuk menghentikan`
        )
    }

    const arg = (m.args?.[0] || '').toLowerCase()
    const useQR = arg === 'qr'

    if (useQR) {
        await m.reply(
            `*Jadibot - QR Mode*\n\n` +
            `> Menyiapkan koneksi...\n` +
            `> Scan QR Code yang akan dikirim`
        )
    } else {
        await m.reply(
            `*Jadibot - Pairing Code*\n\n` +
            `> Menyiapkan koneksi...`
        )
    }

    try {
        await startJadibot(sock, m, sender, !useQR)
    } catch (e) {
        await m.reply(
            `*Jadibot Gagal*\n\n` +
            `> ${e.message || 'Terjadi kesalahan'}\n\n` +
            `Coba lagi dalam beberapa menit.`
        )
    }
}

export { pluginConfig as config, handler }
