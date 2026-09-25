// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Kill-switch global: .bot off → bot TOTAL silent (gak ada reply/react/fitur), cuma .bot yang diproses.
// Intercept-nya ada di paling awal src/handler.js — sebelum semua fitur, anti, auto, dan statistik.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getSaluranChannel } from "../../src/lib/nova-saluran.js";
import { sendSaluranSafe } from "../../src/lib/nova-saluran-safe.js";
import config from "../../config.js";

const pluginConfig = {
    name: "bot",
    alias: ["bot"],
    category: 'owner',
    description: 'Kill-switch bot: off (sunyi total) / mute (dijeda + notif) / on + mode respon (gc/pc/all)',
    usage: '.bot <on|off|mute> | .bot mode <gc|pc|all> [on|off]',
    example: '.bot off\n.bot mute\n.bot on\n.bot mode gc on\n.bot mode pc on\n.bot mode all',
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
// baris status saluran buat reply owner — biar skip/gagal GAK senyap lagi
function saluranStatusLine(saluran, channelName) {
    if (!saluran || saluran.status === 'timeout') {
        return `+ channel ${channelName ? '*' + channelName + '*' : '-'} (masih diproses…)`
    }
    if (saluran.status === 'sent') {
        return `+ saluran ${channelName ? '*' + channelName + '*' : 'official'} — ✅ terkirim`
    }
    if (saluran.status === 'failed') {
        return `+ saluran — ❌ GAGAL kirim (${saluran.reason || 'error'})`
    }
    // skipped — kasih AKAR + solusi biar owner langsung bisa action
    if (saluran.reason === 'bot-bukan-admin') {
        return `+ saluran — ⚠ DILEWATI: nomor bot bukan admin di saluran (buka saluran > ikuti > jadikan bot admin, cek .channelid <link>)`
    }
    if (saluran.reason === 'bot-belum-follow-saluran') {
        return `+ saluran — ⚠ DILEWATI: nomor bot belum follow saluran (join dulu via link saluran)`
    }
    return `+ saluran — ⚠ DILEWATI (${saluran.reason || 'unknown'})`
}

// tunggu hasil bagian SALURAN dari broadcast (max 9 dtk — grup lanjut di background)
function waitSaluran(sock, db, state) {
    return Promise.race([
        broadcastStatusChange(sock, db, state).then(r => (r && r.saluran) || null).catch(() => null),
        new Promise(r => setTimeout(() => r({ status: 'timeout' }), 9000)),
    ])
}

async function broadcastStatusChange(sock, db, state, opts = {}) {
    const text = state === 'off' ? [
            'Bot dimatikan oleh owner.',
            'Semua fitur nonaktif sementara — bot tidak akan merespon apa pun',
            'sampai diaktifkan kembali.',
            '',
            'Terima kasih atas pengertiannya.',
        ].join('\n')
        : state === 'mute' ? [
            'Bot sedang dijeda oleh owner.',
            'Semua fitur sementara tidak bisa diakses.',
            'Bot akan kembali normal setelah diaktifkan kembali.',
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
    let channelTarget = '' // saluran (jika bot admin) — dikirim via sendSaluranSafe
    try {
        for (const jid of Object.keys(db.getAllGroups() || {})) targets.add(jid)
    } catch {}

    // channel utama — FIX 19 Sep 2026 (owner: "notif gak sampai ke saluran nova official"):
    // dulu cuma baca config.saluran.id yang placeholder "@newsletter" → DI-SKIP SENYAP.
    // sekarang ID di-resolve otomatis dari LINK invite (nova-saluran.js), cek admin,
    // dan kirim via sendSaluranSafe (payload disanitasi khusus saluran).
    let channelSkippedReason = ''
    try {
        const ch = await getSaluranChannel(sock)
        if (ch.ok) {
            targets.add(ch.jid) // admin (atau metadata gak kebaca) → aman kirim
            channelTarget = ch.jid
        } else {
            channelSkippedReason = ch.reason // "bukan-admin" — skip biar gak kena flag
        }
    } catch {}
    if (channelSkippedReason) {
        console.log('[bot] Saluran dilewati:', channelSkippedReason, '(bot bukan admin di saluran)')
    }

    let ok = 0
    let fail = 0
    // DESAIN 19 Sep 2026 — notif status bot pakai banner preview card branding
    // Nova (nova-notif-card, ala desain .play). Banner gak ngerubah isi teks.
    // REVISI 20 Sep 2026 (owner: "kan blank hitam aku kira bakal ada tulisan
    // huruf OFF/BOT DIMATIKAN... generate canvasnya jga ganti kyk bot di on
    // di thumbnailnya tulisan ON/BOT DIHIDUPKAN"): thumbnail statis diganti
    // statusBanner() — canvas digambar LIVE per state (off/mute/on), tiap
    // status beda warna + teks besar, gak lagi banner branding generik.
    // REVISI LAGI 20 Sep 2026 (owner: "dibagian thumbnail preview status
    // state fitur bagian ini jgn link whatsapp tp waktu aja sama tanggal"):
    // gak kirim `body` custom lagi — biar statusBanner() pakai default-nya
    // sendiri (waktu+tanggal Asia/Jakarta), sourceUrl juga udah dibuang di
    // statusBanner jadi baris "🔗 whatsapp.com" gak nongol lagi.
    const { statusBanner } = await import("../../src/lib/nova-notif-card.js")
    const banner = await statusBanner(state)
    let saluranOutcome = { status: 'skipped', reason: channelSkippedReason || 'unknown', jid: channelTarget || null }
    // SALURAN DIKIRIM DULU (sebelum grup yang lama) biar owner cepet liat
    // hasilnya — laporan onSaluran nyampe ke reply owner dalam 1-2 dtk.
    if (channelTarget) {
        try {
            // saluran: payload WAJIB lewat sendSaluranSafe (tombol/kartu gak
            // didukung WA channel → otomatis disanitasi biar gak "pesan
            // tidak didukung"; externalAdReply banner AMAN — di-keep sanitizer)
            await sendSaluranSafe(sock, channelTarget, { text, contextInfo: banner })
            saluranOutcome = { status: 'sent', jid: channelTarget }
            ok++
        } catch {
            fail++
            saluranOutcome = { status: 'failed', reason: 'error kirim', jid: channelTarget }
        }
        if (typeof opts?.onSaluran === 'function') {
            try { opts.onSaluran(saluranOutcome) } catch {}
        }
        targets.delete(channelTarget)
    } else if (typeof opts?.onSaluran === 'function') {
        // skipped dari awal (bukan-admin / belum follow) → lapor LANGSUNG
        try { opts.onSaluran(saluranOutcome) } catch {}
    }
    for (const jid of targets) {
        try {
            await sock.sendMessage(jid, { text, contextInfo: banner })
            ok++
        } catch {
            fail++
        }
        await sleep(800) // jeda antar kirim biar gak kena spam-block WhatsApp
    }
    if (channelTarget) console.log('[bot] Notif status terkirim ke saluran:', channelTarget, '(ok=' + ok + ' fail=' + fail + ')')
    else console.log('[bot] Saluran dilewati:', channelSkippedReason || '-')
    return { total: targets.size, ok, fail, saluran: saluranOutcome }
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
        const isMute = db.setting('botMute') === true
        const curMode = db.setting('onlyGc') ? 'ɢᴄ (cuma grup)'
            : db.setting('onlyPc') ? 'ᴘᴄ (cuma chat pribadi)'
            : 'ᴀʟʟ (semua chat)'
        const curStatus = isOff ? 'ᴏꜰꜰ (sunyi total)' : isMute ? 'ᴍᴜᴛᴇ (dijeda)' : 'ᴏɴ (aktif)'
        return m.reply(claraWrap('Status Bot', [
            `Status : ${curStatus}`,
            `Mode : ${curMode}`,
            '',
            `Ketik *.bot off* buat matiin bot total (sunyi, gak ada notif)`,
            `Ketik *.bot mute* buat jeda bot (cmd diblok + notif)`,
            `Ketik *.bot on* buat nyalain lagi`,
            `Ketik *.bot mode gc/pc/all* buat atur tempat respon`,
        ].join('\n')))
    }

    // ── .bot off ── SUNYI TOTAL (gak ada notif apa pun)
    if (['off', 'mati', 'stop'].includes(act)) {
        if (db.setting('botPower') === false) {
            await m.react("🐣")
            return m.reply(claraWrap('Status Bot', 'Bot udah ᴏꜰꜰ dari tadi kak.\nKetik *.bot on* buat nyalain.'))
        }
        db.setting('botPower', false)
        db.setting('botMute', false) // off menimpa mute — level paling dalam
        await m.react("🐣")

        // hitung target broadcast buat info ke owner (kirimnya di background)
        const grupCount = (() => { try { return Object.keys(db.getAllGroups() || {}).length } catch { return 0 } })()
        const channelName = config.saluran?.name || null

        // tunggu hasil SALURAN doang (grup tetap di background) — biar owner
        // langsung liat status saluran di reply ini, gak senyap lagi
        const saluran = await waitSaluran(sock, db, 'off')

        return m.reply(claraWrap('Bot Dimatikan', [
            'Bot sekarang *ᴏꜰꜰ* — sunyi total.',
            '',
            'Bot gak akan merespon fitur apa pun',
            '(gak ada reaksi, gak ada auto, gak ada notif',
            'apa pun — kayak bot beneran mati).',
            'Nyoba command apa pun → di-diamin total.',
            '',
            `Notifikasi perpisahan dikirim ke *${grupCount}* grup`,
            saluranStatusLine(saluran, channelName) + ',',
            'kirimnya cuma sekali ini (saat .bot off).',
            'DM user gak dikirimin — biar nomor aman dari banned.',
            '',
            'Satu-satunya command yang hidup: *.bot on*',
        ].join('\n')))
    }

    // ── .bot mute ── DIJEDA (cmd diblok + notif "bot sedang dijeda")
    if (['mute', 'jeda', 'pause'].includes(act)) {
        if (db.setting('botPower') === false) {
            await m.react("❗")
            return m.reply(claraWrap('Status Bot', [
                'Bot lagi *ᴏꜰꜰ* (sunyi total) — lebih dalam dari mute.',
                '',
                'Mute cuma bisa dipasang pas bot *ᴏɴ*.',
                'Ketik *.bot on* buat nyalain bot langsung aktif,',
                'atau nyalain dulu terus *.bot mute* buat dijeda.',
            ].join('\n')))
        }
        if (db.setting('botMute') === true) {
            await m.react("🐣")
            return m.reply(claraWrap('Status Bot', 'Bot udah *ᴍᴜᴛᴇ* (dijeda) dari tadi kak.\nKetik *.bot on* buat nyalain.'))
        }
        db.setting('botMute', true)
        await m.react("🐣")

        const grupCount = (() => { try { return Object.keys(db.getAllGroups() || {}).length } catch { return 0 } })()
        const channelName = config.saluran?.name || null

        const saluran = await waitSaluran(sock, db, 'mute')

        return m.reply(claraWrap('Bot Dijeda', [
            'Bot sekarang *ᴍᴜᴛᴇ* — sedang dijeda.',
            '',
            'Semua command gak bisa diakses.',
            'Nyoba command apa pun → bot bales notif',
            '"bot sedang dijeda oleh owner"',
            'max 1x / 10 detik per jeda global.',
            '',
            'Beda sama *.bot off*: mute tetap ngasih',
            'info ke user, off di-diamin total.',
            '',
            `Notifikasi dikirim ke *${grupCount}* grup`,
            saluranStatusLine(saluran, channelName) + '.',
            '',
            'Satu-satunya command yang hidup: *.bot on*',
        ].join('\n')))
    }

    // ── .bot on ──
    if (['on', 'nyala', 'start', 'hidup'].includes(act)) {
        if (db.setting('botPower') !== false && db.setting('botMute') !== true) {
            await m.react("🐣")
            return m.reply(claraWrap('Status Bot', 'Bot udah *ᴏɴ* kok, jalan normal.'))
        }
        db.setting('botPower', true)
        db.setting('botMute', false)
        await m.react("🐣")

        // hitung target broadcast buat info ke owner
        const grupCount = (() => { try { return Object.keys(db.getAllGroups() || {}).length } catch { return 0 } })()
        const channelName = config.saluran?.name || null

        const saluran = await waitSaluran(sock, db, 'on')

        return m.reply(claraWrap('Bot Dinyalakan', [
            'Bot kembali *ᴏɴ* — semua fitur aktif lagi.',
            '',
            `Notifikasi dikirim ke *${grupCount}* grup`,
            saluranStatusLine(saluran, channelName) + '.',
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
        '📌 Ketik *.bot off* buat matiin bot (sunyi total)',
        '💡 Ketik *.bot mute* buat jeda bot (+notif)',
        '🔌 Ketik *.bot on* buat nyalain bot',
        '🚦 Ketik *.bot mode gc/pc/all* buat atur tempat respon',
    ].join('\n')))
}

export { pluginConfig as config, handler }
