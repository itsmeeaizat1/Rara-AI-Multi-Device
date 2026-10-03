// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { startJadibot, isJadibotActive } from '../../src/lib/rara-jadibot-manager.js'
import { getJadibotAccess } from '../owner/setjadibot.js'
import { getDatabase } from '../../src/lib/rara-database.js'
import { normalizePhone } from '../../src/lib/config/session-cli.js'
import { isOwner, isPremium } from '../../config.js'

const pluginConfig = {
    name: 'jadibot',
    alias: ["jadibot"],
    category: 'main',
    description: 'Jadikan nomor jadi bot (Pairing Code / QR) — bisa nomor sendiri atau nomor lain',
    usage: '.jadibot — nomor kamu\n.jadibot <nomor> — jadibot untuk nomor lain\n.jadibot qr — mode QR',
    example: '.jadibot\n.jadibot 6281234567890',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

// FIX 3 Okt 2026: dulu baca db.setting('premiumUsers') (tidak pernah diisi .addprem) dan
// tidak mengecek owner. Sekarang pakai isOwner/isPremium resmi config.js (sumber yang sama
// dengan m.isOwner/m.isPremium di middleware, termasuk hasil .addprem + masa kedaluwarsa).
function isPremiumUser(jid) {
    try { return isOwner(jid) || isPremium(jid) } catch { return false }
}

export function canUseJadibot(sender) {
    const access = getJadibotAccess()

    // Owner selalu boleh, apa pun modenya
    try { if (isOwner(sender)) return { allowed: true } } catch {}
    
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

// ─── MULTI SESSION (rev 9 Sep 2026, request owner: "support banyak nomor
// mirip kode !jadibot <nomor>"): .jadibot = nomor sendiri, .jadibot <nomor>
// = pasang nomor LAIN jadi bot (pairing code dikirim ke chat ini, relayer
// tinggal terusin ke pemilik nomor). ───
export function parseJadibotTarget(sender, args = []) {
    const flat = (Array.isArray(args) ? args : []).join(" ").trim();
    const useQR = /^qr\b/i.test(flat);
    const digits = flat.replace(/[^0-9]/g, "");
    // ada nomor di argumen → target nomor itu; tanpa nomor → nomor sendiri
    if (digits.length >= 8) {
        const norm = normalizePhone(digits);
        return { useQR, targetJid: norm + "@s.whatsapp.net", targetNumber: norm, isSelf: false };
    }
    return { useQR, targetJid: String(sender || ""), targetNumber: String(sender || "").replace(/@.+/, ""), isSelf: true };
}

async function handler(m, { sock }) {
    const sender = m.sender
    if (!sender) { const __navText = raraError("JadiBot", "Gagal identifikasi nomor kamu nih"); return await m.reply(__navText); }

    // Cek akses jadibot
    const access = canUseJadibot(sender)
    if (!access.allowed) {
        return m.reply(access.reason)
    }

    const { useQR, targetJid, targetNumber, isSelf } = parseJadibotTarget(sender, m.args || [])

    if (isJadibotActive(targetJid)) {
        return m.reply(
            `*jadibot sudah aktif*\n\n` +
            (isSelf
                ? `Nomor kamu sudah menjadi bot\nKetik \`${m.prefix}stopjadibot\` untuk menghentikan`
                : `Nomor *${targetNumber}* sudah menjadi bot`)
        )
    }

    if (useQR) {
        await m.reply(
            `*jadibot - qr mode*${isSelf ? "" : ` (${targetNumber})`}\n\n` +
            `Menyiapkan koneksi...\n` +
            `Scan QR Code yang akan dikirim`
        )
    } else {
        await m.reply(
            `*jadibot - pairing code*${isSelf ? "" : ` (${targetNumber})`}\n\n` +
            (isSelf
                ? `Menyiapkan koneksi...`
                : `Menyiapkan session untuk nomor *${targetNumber}*...\nKode pairing akan dikirim di sini — teruskan ke pemilik nomor.`)
        )
    }

    try {
        await startJadibot(sock, m, targetJid, !useQR)
    } catch (e) {
        await m.reply(
            `*jadibot gagal*\n\n` +
            `${e.message || "Ada error nih"}\n\n` +
            `Coba lagi dalam beberapa menit.`
        )
    }
}

export { pluginConfig as config, handler }
