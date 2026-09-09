// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { stopJadibot, isJadibotActive, getJadibotStatus } from '../../src/lib/nova-jadibot-manager.js'
import { normalizePhone } from '../../src/lib/config/session-cli.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'stopjadibot',
    alias: ["stopjadibot"],
    category: 'main',
    description: 'Hentikan sesi jadibot kamu',
    usage: '.stopjadibot — hentikan jadibot kamu\n.stopjadibot <nomor> — (owner) hentikan nomor lain',
    example: '.stopjadibot',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
}

async function handler(m, { sock }) {
    const sender = m.sender
    if (!sender) return m.reply(novaError("StopJadiBot", "Gagal identifikasi nomor kamu nih"))

    // ─── MULTI SESSION (9 Sep 2026): .stopjadibot <nomor> — hentikan
    // session jadibot nomor LAIN (khusus owner). Tanpa argumen = nomor sendiri.
    const argDigits = (m.args || []).join(" ").replace(/[^0-9]/g, "")
    let target = sender
    if (argDigits.length >= 8) {
        const norm = normalizePhone(argDigits)
        if (norm !== sender.replace(/@.+/, "")) {
            if (!m.isOwner) {
                return m.reply(novaError("StopJadiBot", "Menghentikan jadibot nomor lain khusus owner"))
            }
        }
        target = norm + "@s.whatsapp.net"
    }

    if (!isJadibotActive(target)) {
        return m.reply(
            `❌ *${target === sender ? "ᴋᴀᴍᴜ ᴛɪᴅᴀᴋ ᴍᴇɴᴊᴀᴅɪ" : "ɴᴏᴍᴏʀ ɪᴛᴜ ᴛɪᴅᴀᴋ ᴀᴋᴛɪꜰ"} ᴊᴀᴅɪʙᴏᴛ*\n\n` +
            `Ketik \`${m.prefix}jadibot\` untuk menjadi bot`
        )
    }

    const status = getJadibotStatus(target)
    const uptime = status ? formatUptime(Date.now() - status.startedAt) : '-'
    try {
        await stopJadibot(target, false)
        await m.reply(claraWrap("Stopjadibot", `Jadibot dihentikan\n\nNomor: @${target.split('@')[0]}\nUptime: ${uptime}\nSession: Tersimpan\n\nKetik \`${m.prefix}jadibot\` untuk mengaktifkan kembali.`, "success"))
    } catch (e) {
        await m.reply(novaError("StopJadiBot", `Gagal hentikan jadibot nih: ${e.message}`))
    }
}

export { pluginConfig as config, handler }
