// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'cmdvn',
    alias: ["cmdvn"],
    category: 'owner',
    description: 'Aktifkan command via voice note',
    usage: '.cmdvn <on/off>',
    example: '.cmdvn on',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []
    const subCmd = args[0]?.toLowerCase()

    const current = db.setting('cmdVn') || false

    if (!subCmd || subCmd === 'status') {
        const status = current ? '✅ ON' : '❌ OFF'
        return m.reply( raraWrap("cmdvn", `🎤 *Cmd Voice Note*\n\n` +
            `Status: *${status}*\n\n` +
            `\`${m.prefix}cmdvn on\` — Command via VN\n` +
            `\`${m.prefix}cmdvn off\` — Command via text (default)\n\n` +
            `Saat ON, kirim VN berisi nama command\n` +
            `Contoh: VN "menu" → trigger .menu`, "guide"), "cmdvn")
    }

    if (subCmd === 'on') {
        db.setting('cmdVn', true)
        return m.reply(raraWrap("cmdvn", `✅ *Cmd Vn Aktif*\n\n` +
            `Kirim voice note berisi nama command\n` +
            `Bot akan transkrip dan jalankan otomatis\n` +
            `Contoh: VN "menu" → trigger .menu`))
    }

    if (subCmd === 'off') {
        db.setting('cmdVn', false)
        return m.reply(raraWrap("Cmdvn", `❌ CMD VN *dinonaktifkan*. Command via text normal.`))
    }

    return m.reply(`❌ Gunakan \`${m.prefix}cmdvn on\` atau \`${m.prefix}cmdvn off\``)
}

export { pluginConfig as config, handler }