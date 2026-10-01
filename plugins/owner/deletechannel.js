// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: "deletechannel",
  alias: ["hapussaluran", "deletesaluran", "deletenewsletter"],
    category: 'owner',
    description: 'Hapus saluran/newsletter',
    usage: '.deletechannel <id_saluran>',
    example: '.deletechannel 120363xxx@newsletter',
    isOwner: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.trim() || ''
    let targetJid = text

    if (!targetJid) {
        return m.reply( '🗑️ *Hapus sAluran*\n\n' +
            '> `.deletechannel <id_saluran>` — Hapus saluran\n\n' +
            '📝 Contoh:\n' +
            '> `.deletechannel 120363xxx@newsletter`\n\n' +
            '⚠️ Saluran akan dihapus secara permanen', "deletechannel")
    }

    if (!targetJid.endsWith('@newsletter')) {
        targetJid += '@newsletter'
    }

    try {
        await sock.newsletterDelete(targetJid)
        return m.reply(raraWrap("Hapussaluran", `🗑️ *Saluran dihapus*\n\nID: ${targetJid}`))
    } catch (err) {
        return m.reply(raraWrap("deletechannel", `❌ Gagal menghapus saluran: ${err.message}`))
    }
}

export { pluginConfig as config, handler }
