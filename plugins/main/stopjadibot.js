// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { stopJadibot, isJadibotActive, getJadibotStatus } from '../../src/lib/nova-jadibot-manager.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'stopjadibot',
    alias: ["stopjadibot", 'berhentijadibot', 'stopbot', 'unjadibot'],
    category: 'main',
    description: 'Hentikan sesi jadibot kamu',
    usage: '.stopjadibot',
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
    if (!sender) return m.reply(claraWrap("Stopjadibot", '❌ Gagal mengidentifikasi nomor kamu'))

    if (!isJadibotActive(sender)) {
        return m.reply(
            `❌ *ᴋᴀᴍᴜ ᴛɪᴅᴀᴋ ᴍᴇɴᴊᴀᴅɪ ᴊᴀᴅɪʙᴏᴛ*\n\n` +
            `Ketik \`${m.prefix}jadibot\` untuk menjadi bot`
        )
    }

    const status = getJadibotStatus(sender)
    const uptime = status ? formatUptime(Date.now() - status.startedAt) : '-'

    await m.react('🕐')

    try {
        await stopJadibot(sender, false)
        await m.react('✅')

        await m.reply(`*ᴊᴀᴅɪʙᴏᴛ ᴅɪʜᴇɴᴛɪᴋᴀɴ*\n\n` +
            `Nomor: *@${sender.split('@')[0]}*\n` +
            `Uptime: *${uptime}*\n` +
            `💾 Session: *ᴛᴇʀꜱɪᴍᴘᴀɴ*\n\n` +
            `Ketik \`${m.prefix}jadibot\` untuk mengaktifkan kembali.`)
    } catch (e) {
        await m.reply(claraWrap("stopjadibot", `❌ Gagal menghentikan jadibot: ${e.message}`))
    }
}

export { pluginConfig as config, handler }
