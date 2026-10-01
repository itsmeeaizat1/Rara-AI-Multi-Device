// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from '../../src/lib/rara-database.js'
import config from '../../config.js'
const pluginConfig = {
    name: ['disableenergi', 'enableenergi'],
    alias: ["disableenergi", "enableenergi"],
    category: 'owner',
    description: 'Enable/disable sistem energi',
    usage: '.disableenergi atau .enableenergi',
    example: '.disableenergi',
    isOwner: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const cmd = m.command.toLowerCase()
    const isEnable = ['enableenergi', 'onenergi'].includes(cmd)

    db.setting('energi', isEnable)
    db.save()

    return m.reply(raraWrap("sIstem Energi Diaktifkan", isEnable
            ? '⚡ *sIstem Energi Diaktifkan*\n\nSetiap command sekarang memerlukan energi.'
            : '🔌 *sIstem Energi Dinonaktifkan*\n\nCommand tidak lagi membutuhkan energi.'))
}

export { pluginConfig as config, handler }