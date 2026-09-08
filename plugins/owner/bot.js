// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Kill-switch global: .bot off → bot TOTAL silent (gak ada reply/react/fitur), cuma .bot yang diproses.
// Intercept-nya ada di paling awal src/handler.js — sebelum semua fitur, anti, auto, dan statistik.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
    name: "bot",
    alias: ["bot"],
    category: 'owner',
    description: 'Matikan/nyalakan bot total (kill-switch) + atur mode respon (gc/pc/all)',
    usage: '.bot <on|off> | .bot mode <gc|pc|all> [on|off]',
    example: '.bot off\n.bot mode gc on\n.bot mode pc on\n.bot mode gc off\n.bot mode all',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 2,
    energi: 0,
    isEnabled: true
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Broadcast perubahan status ke semua grup yang di-join + channel utama (kalo bot admin di sana).
// DM user sengaja GAK dikirimin — broadcast massal DM paling berisiko bikin nomor keban WhatsApp.
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

    // kumpulin target: semua grup yang di-join
    const targets = new Set()
    try {
        for (const jid of Object.keys(db.getAllGroups() || {})) targets.add(jid)
    } catch {}

    // channel utama (config.saluran.id via .setsaluran) — CUMA kalo bot admin di sana
    // biar gak kirim ke channel orang lain / gak kena error akses
    const channelId = config.saluran?.id || ''
    if (channelId && channelId !== '@newsletter') {
        try {
            const meta = await sock.newsletterMetadata('jid', channelId).catch(() => null)
            if (!meta || meta.viewer_role === 'ADMIN' || meta.viewer_role === 'OWNER') {
                targets.add(channelId) // admin (atau metadata gak kebaca) → aman kirim
            }
            // bukan admin → skip diam-diam, gak ada risiko kena flag
        } catch {}
    }

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
        const curMode = db.setting('onlyGc') ? 'ɢᴄ (cuma grup)'
            : db.setting('onlyPc') ? 'ᴘᴄ (cuma chat pribadi)'
            : 'ᴀʟʟ (semua chat)'
        return m.reply(claraWrap('Status Bot', [
            `Status : ${isOff ? 'ᴏꜰꜰ (mute total)' : 'ᴏɴ (aktif)'}`,
            `Mode : ${curMode}`,
            '',
            `Ketik *.bot off* buat matiin bot total`,
            `Ketik *.bot on* buat nyalain lagi`,
            `Ketik *.bot mode gc/pc/all* buat atur tempat respon`,
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
        const grupCount = (() => { try { return Object.keys(db.getAllGroups() || {}).length } catch { return 0 } })()
        const channelName = config.saluran?.name || null

        // fire-and-forget — jangan bikin owner nunggu ratusan pesan keluar
        broadcastStatusChange(sock, db, true).catch(() => {})

        return m.reply(claraWrap('Bot Dimatikan', [
            'Bot sekarang *ᴏꜰꜰ* — total silent.',
            '',
            'Bot gak akan merespon fitur apa pun',
            '(gak ada reaksi, gak ada auto).',
            'Nyoba command apa pun → bot bales info',
            '"dimatikan oleh owner" max 1x / 10 detik.',
            '',
            `Notifikasi dikirim ke *${grupCount}* grup`,
            `+ channel ${channelName ? '*' + channelName + '*' : '-'} (bot admin).`,
            'DM user gak dikirimin — biar nomor aman dari banned.',
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
        const grupCount = (() => { try { return Object.keys(db.getAllGroups() || {}).length } catch { return 0 } })()
        const channelName = config.saluran?.name || null

        broadcastStatusChange(sock, db, false).catch(() => {})

        return m.reply(claraWrap('Bot Dinyalakan', [
            'Bot kembali *ᴏɴ* — semua fitur aktif lagi.',
            '',
            `Notifikasi dikirim ke *${grupCount}* grup`,
            `+ channel ${channelName ? '*' + channelName + '*' : '-'} (bot admin).`,
            '',
            'Terima kasih udah nunggu 🥳',
        ].join('\n')))
    }

    // ── .bot mode <gc|pc|all> — pindahan dari .onlygc / .onlypc ──
    if (act === 'mode') {
        const sub = (args[1] || '').toLowerCase()
        const flag = (args[2] || '').toLowerCase() // dukung ".bot mode gc on/off"

        // .bot mode → status mode doang
        if (!sub) {
            const curMode = db.setting('onlyGc') ? 'ɢᴄ (cuma grup)'
                : db.setting('onlyPc') ? 'ᴘᴄ (cuma chat pribadi)'
                : 'ᴀʟʟ (semua chat)'
            await m.react("🐣")
            return m.reply(claraWrap('Mode Bot', [
                `Mode sekarang : ${curMode}`,
                '',
                '*.bot mode gc on* → bot cuma respon di grup',
                '*.bot mode pc on* → bot cuma respon di chat pribadi',
                '*.bot mode gc off* / *pc off* → matiin mode itu',
                '*.bot mode all* → respon di semua chat',
                '',
                'Owner tetap bisa command di mana pun.',
            ].join('\n')))
        }

        if (['gc', 'group', 'grup', 'gconly', 'onlygc'].includes(sub)) {
            if (flag === 'off') {
                db.setting('onlyGc', false)
                db.setting('onlyPc', false)
                await m.react("🐣")
                return m.reply(claraWrap('Mode Bot', [
                    'Mode *ɢᴄ* dimatikan — bot respon di semua chat lagi.',
                    '',
                    `Matikan bot total: *.bot off*`,
                ].join('\n')))
            }
            db.setting('onlyGc', true)
            db.setting('onlyPc', false)
            await m.react("🐣")
            return m.reply(claraWrap('Mode Bot', [
                'Mode diubah ke *ɢᴄ* — bot cuma respon di grup.',
                '',
                'Chat pribadi (PC) di-diamin.',
                'Owner tetap bisa command di mana pun.',
                '',
                `Balik lagi: *.bot mode gc off* / *.bot mode all*`,
            ].join('\n')))
        }

        if (['pc', 'private', 'dm', 'pconly', 'onlypc'].includes(sub)) {
            if (flag === 'off') {
                db.setting('onlyPc', false)
                db.setting('onlyGc', false)
                await m.react("🐣")
                return m.reply(claraWrap('Mode Bot', [
                    'Mode *ᴘᴄ* dimatikan — bot respon di semua chat lagi.',
                    '',
                    `Matikan bot total: *.bot off*`,
                ].join('\n')))
            }
            db.setting('onlyPc', true)
            db.setting('onlyGc', false)
            await m.react("🐣")
            return m.reply(claraWrap('Mode Bot', [
                'Mode diubah ke *ᴘᴄ* — bot cuma respon di chat pribadi.',
                '',
                'Grup di-diamin.',
                'Owner tetap bisa command di mana pun.',
                '',
                `Balik lagi: *.bot mode pc off* / *.bot mode all*`,
            ].join('\n')))
        }

        if (['all', 'semua', 'normal'].includes(sub) || (sub === 'off' && !flag)) {
            db.setting('onlyGc', false)
            db.setting('onlyPc', false)
            await m.react("🐣")
            return m.reply(claraWrap('Mode Bot', [
                'Mode diubah ke *ᴀʟʟ* — bot respon di semua chat.',
                'Grup + chat pribadi aktif lagi.',
            ].join('\n')))
        }

        await m.react("❗")
        return m.reply(claraWrap('Mode Bot', [
            `Mode *${sub}* gak dikenal.`,
            '',
            'Pilihan: *gc* (cuma grup), *pc* (cuma chat pribadi), *all* (semua)',
        ].join('\n')))
    }

    // ── argumen gak dikenal ──
    await m.react("❗")
    return m.reply(claraWrap('Status Bot', [
        `Argumen *${act}* gak dikenal.`,
        '',
        '📌 Ketik *.bot off* buat matiin bot',
        '💡 Ketik *.bot on* buat nyalain bot',
        '🚦 Ketik *.bot mode gc/pc/all* buat atur tempat respon',
    ].join('\n')))
}

export { pluginConfig as config, handler }
