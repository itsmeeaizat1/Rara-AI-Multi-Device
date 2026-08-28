// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: ['hapusgrup', 'deletegrup', 'delgrup'],
    alias: ["hapusgrup", "deletegrup", "delgrup"],
    category: 'owner',
    description: 'Keluar dari grup / hapus grup',
    usage: '.hapusgrup (di dalam grup) atau .hapusgrup <jid>',
    example: '.hapusgrup',
    isOwner: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let targetJid = null

    if (m.args[0]) {
        targetJid = m.args[0].replace(/[^0-9@.]/g, '')
        if (!targetJid.endsWith('@g.us')) targetJid += '@g.us'
    } else if (m.isGroup) {
        targetJid = m.chat
    }

    if (!targetJid || !targetJid.endsWith('@g.us')) {
        return m.reply( '🗑️ *Hapus Grup*\n\n' +
            '> `.hapusgrup` (di dalam grup) — Keluar dari grup ini\n' +
            '> `.hapusgrup <id_grup>` — Keluar dari grup tertentu\n\n' +
            '⚠️ Bot akan keluar dari grup, bukan menghapus grup secara permanen', "hapusgrup")
    }

    try {
        const metadata = await sock.groupMetadata(targetJid).catch(() => null)
        const groupName = metadata?.subject || targetJid

        await sock.groupLeave(targetJid)
        await m.react('✅')
        return m.reply(
            `🗑️ *Bot Keluar Dari Grup*\n\n` +
            `Grup: ${groupName}\n` +
            `ID: ${targetJid}`
        )
    } catch (err) {
        return m.reply(claraWrap("hapusgrup", `❌ Gagal keluar dari grup: ${err.message}`))
    }
}

export { pluginConfig as config, handler }
