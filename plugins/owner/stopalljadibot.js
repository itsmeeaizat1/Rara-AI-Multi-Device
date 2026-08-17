// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { stopAllJadibots, getActiveJadibots } from '../../src/lib/nova-jadibot-manager.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'stopalljadibot',
    alias: ['stopsemuajadibot', 'killalljadibots'],
    category: 'owner',
    description: 'Hentikan semua jadibot yang aktif',
    usage: '.stopalljadibot',
    example: '.stopalljadibot',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const active = getActiveJadibots()

    if (active.length === 0) {
        { const __navText = `❌ Tidak ada jadibot yang aktif`; return await m.reply(__navText); }
    }

    await m.react('🕐')

    try {
        const stopped = await stopAllJadibots()

        await m.react('✅')

        const names = stopped.map(id => `@${id}`).join(', ')

        await sock.sendMessage(m.chat, {
            text: `*Semua Jadibot Dihentikan*\n\n` +
                `Total: *${stopped.length}* jadibot\n` +
                `Session: *Tersimpan*\n\n` +
                `Dihentikan: ${names}\n\n` +
                `Semua session disimpan dan bisa diaktifkan ulang.`,
            mentions: stopped.map(id => id + '@s.whatsapp.net')
        }, { quoted: m })
    } catch (error) {
        await m.reply(claraWrap("stopalljadibot", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }