// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

import { getDatabase } from '../../src/lib/rara-database.js'

const pluginConfig = {
    name: 'hapuslist',
    alias: ["hapuslist"],
    category: 'owner',
    description: '🗑️ Hapus informasi toko',
    usage: '.hapuslist <nomor>',
    example: '.hapuslist 1',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const lists = db.setting('storeLists') || []

    if (lists.length === 0) {
        return m.reply(`*Belum Ada Informasi.*\n\nTambahkan informasi terlebih dahulu: \`${m.prefix}addlist\` ➕`)
    }

    const idx = parseInt(m.text?.trim()) - 1

    if (isNaN(idx) || idx < 0 || idx >= lists.length) {
        let txt = `🗑️ *pilih informasi yang dihapus*\n\nKetik \`${m.prefix}hapuslist <nomor>\`\n\n`
        for (let i = 0; i < lists.length; i++) {
            const l = lists[i]
            const mediaIcon = l.image ? '🖼️' : l.video ? '🎬' : '📝'
            txt += `${mediaIcon} *${i + 1}.* ${l.name}\n`
        }
        return await m.reply(raraWrap("hapuslist", txt))
    }

    const deleted = lists.splice(idx, 1)[0]
    db.setting('storeLists', lists)
    return m.reply(
        `🗑️ *informasi dihapus*\n\n` +
        `🏷️ Nama: *${deleted.name}*\n\n` +
        `⚠️ _Informasi telah dihapus secara permanen dan tidak dapat dikembalikan._`
    )
}

export { pluginConfig as config, handler }
