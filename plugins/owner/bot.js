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
        return m.reply(claraWrap('Bot Dimatikan', [
            'Bot sekarang *ᴏꜰꜰ* — total silent.',
            '',
            'Bot gak akan merespon fitur apa pun',
            '(gak ada reply, gak ada reaksi, gak ada auto).',
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
        return m.reply(claraWrap('Bot Dinyalakan', [
            'Bot kembali *ᴏɴ* — semua fitur aktif lagi.',
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
