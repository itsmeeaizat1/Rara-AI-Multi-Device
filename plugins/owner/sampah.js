// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'sampah',
    alias: ["sampah"],
    category: 'owner',
    description: 'Menghapus semua sampah di temp',
    usage: '.sampah',
    example: '.sampah',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m) {
    const tempPath = path.join(process.cwd(), 'temp')

    if (!fs.existsSync(tempPath)) {
        return m.reply('❌ Folder temp tidak ditemukan!')
    }


    try {
        const files = fs.readdirSync(tempPath)

        if (!files.length) {
            return m.replm.reply(claraWrap("Sampah", '📁 Folder temp sudah kosong!'))   }

        let deleted = 0

        for (const file of files) {
            const filePath = path.join(tempPath, file)

            fs.rmSync(filePath, { recursive: true, force: true })
            deleted++
        }

        await m.react('✅')
        await m.reply(claraWrap("sampah", `🗑️ *TEMP CLEANED!*\n\n` +
            `Total file/folder dihapus: *${deleted}*`))

    } catch (error) {
        await m.reply(claraWrap("sampah", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }