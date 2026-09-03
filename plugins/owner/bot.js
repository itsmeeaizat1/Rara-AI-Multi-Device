// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Kill-switch global: .bot off → bot TOTAL silent (gak ada reply/react/fitur), cuma .bot yang diproses.
// Intercept-nya ada di paling awal src/handler.js — sebelum semua fitur, anti, auto, dan statistik.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
    name: "bot",
    alias: ["bot"],
    category: 'owner',
    description: 'Matikan / nyalakan bot total (kill-switch global) — saat off bot gak merespon apa pun',
    usage: '.bot <on|off>',
    example: '.bot off\n.bot on\n.bot',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 2,
    energi: 0,
    isEnabled: true
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Broadcast perubahan status ke semua user terdaftar (DM) + semua grup yang di-join.
// Fire-and-forget — owner udah dapet konfirmasi duluan, gak perlu nunggu selesai.
async function broadcastStatusChange(sock, db, isOff) {
    const text = isOff
        ? [
            'Bot dimatikan oleh owner.',
            'Semua fitur nonaktif sementara — bot tidak akan merespon apa pun',
            'sampai diaktifkan kembali.',
            '',
            'Terima kasih atas pengertiannya.',
        ].join('\n')
        : [
            'Bot kembali aktif oleh owner!',
            'Semua fitur sudah bisa dipakai lagi seperti biasa.',
            '',
            'Terima kasih sudah menunggu.',
        ].join('\n')

    // kumpulin target: DM user udah daftar + semua grup
    const targets = new Set()
    try {
        const users = db.db?.data?.users || {}
        for (const [jid, u] of Object.entries(users)) {
            if (u?.isRegistered && jid.endsWith('@s.whatsapp.net')) targets.add(jid)
        }
    } catch {}
    try {
        for (const jid of Object.keys(db.getAllGroups() || {})) targets.add(jid)
    } catch {}

    let ok = 0
    let fail = 0
    for (const jid of targets) {
        try {
            await sock.sendMessage(jid, { text })
            ok++
        } catch {
            fail++
        }
        await sleep(800) // jeda antar kirim biar gak kena spam-block WhatsApp
    }
    return { total: targets.size, ok, fail }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []
    const act = (args[0] || '').toLowerCase()

    await m.react("🕒")

    // ── .bot → status doang ──
    if (!act) {
        await m.react("🐣")
        const isOff = db.setting('botPower') === false
        return m.reply(claraWrap('Status Bot', [
            `Status : ${isOff ? 'ᴏꜰꜰ (mute total)' : 'ᴏɴ (aktif)'}`,
            '',
            `Ketik *.bot off* buat matiin bot total`,
            `Ketik *.bot on* buat nyalain lagi`,
        ].join('\n')))
    }

    // ── .bot off ──
    if (['off', 'mati', 'mute', 'stop'].includes(act)) {
        if (db.setting('botPower') === false) {
            await m.react("🐣")
            return m.reply(claraWrap('Status Bot', 'Bot udah ᴏꜰꜰ dari tadi kak.\nKetik *.bot on* buat nyalain.'))
        }
        db.setting('botPower', false)
        await m.react("🐣")

        // hitung target broadcast buat info ke owner (kirimnya di background)
        let dmCount = 0
        let grupCount = 0
        try {
            const users = db.db?.data?.users || {}
            dmCount = Object.values(users).filter((u) => u?.isRegistered).length
            grupCount = Object.keys(db.getAllGroups() || {}).length
        } catch {}

        // fire-and-forget — jangan bikin owner nunggu ratusan pesan keluar
        broadcastStatusChange(sock, db, true).catch(() => {})

        return m.reply(claraWrap('Bot Dimatikan', [
            'Bot sekarang *ᴏꜰꜰ* — total silent.',
            '',
            'Bot gak akan merespon fitur apa pun',
            '(gak ada reply, gak ada reaksi, gak ada auto).',
            '',
            `Notifikasi dikirim ke *${dmCount}* user daftar`,
            `+ *${grupCount}* grup yang di-join.`,
            '',
            'Satu-satunya command yang hidup: *.bot on*',
        ].join('\n')))
    }

    // ── .bot on ──
    if (['on', 'nyala', 'start', 'hidup'].includes(act)) {
        if (db.setting('botPower') !== false) {
            await m.react("🐣")
            return m.reply(claraWrap('Status Bot', 'Bot udah *ᴏɴ* kok, jalan normal.'))
        }
        db.setting('botPower', true)
        await m.react("🐣")

        // hitung target broadcast buat info ke owner
        let dmCount = 0
        let grupCount = 0
        try {
            const users = db.db?.data?.users || {}
            dmCount = Object.values(users).filter((u) => u?.isRegistered).length
            grupCount = Object.keys(db.getAllGroups() || {}).length
        } catch {}

        broadcastStatusChange(sock, db, false).catch(() => {})

        return m.reply(claraWrap('Bot Dinyalakan', [
            'Bot kembali *ᴏɴ* — semua fitur aktif lagi.',
            '',
            `Notifikasi dikirim ke *${dmCount}* user daftar`,
            `+ *${grupCount}* grup yang di-join.`,
            '',
            'Terima kasih udah nunggu 🥳',
        ].join('\n')))
    }

    // ── argumen gak dikenal ──
    await m.react("❗")
    return m.reply(claraWrap('Status Bot', [
        `Argumen *${act}* gak dikenal.`,
        '',
        '📌 Ketik *.bot off* buat matiin bot',
        '💡 Ketik *.bot on* buat nyalain bot',
    ].join('\n')))
}

export { pluginConfig as config, handler }
