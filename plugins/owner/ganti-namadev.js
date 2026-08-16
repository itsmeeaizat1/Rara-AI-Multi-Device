// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-namadev',
    alias: ['setnamadev', 'setnamedev', 'gantideveloper'],
    category: 'owner',
    description: 'Ganti nama developer di config.js',
    usage: '.ganti-namadev <nama baru>',
    example: '.ganti-namadev Lucky Archz',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, config }) {
    const newName = m.args.join(' ')
    
    if (!newName) {
        return sendReplyWithNav(sock, m, `👨‍💻 *Ganti Nama Developer*\n\n> Nama saat ini: *${config.bot?.developer || '-'}*\n\n*Penggunaan:*\n\`${m.prefix}ganti-namadev <nama baru>\``, "ganti-namadev")
    }
    
    try {
        const configPath = path.join(process.cwd(), 'config.js')
        let configContent = fs.readFileSync(configPath, 'utf8')
        
        configContent = configContent.replace(
            /developer:\s*['"]([^'"]*)['"]/,
            `developer: '${newName}'`
        )
        
        fs.writeFileSync(configPath, configContent)
        
        config.bot.developer = newName
        
        m.reply(claraWrap("Ganti-namadev", `✅ *Berhasil*\n\n> Nama developer diganti ke: *${newName}*`))
        
    } catch (error) {
        await m.reply(claraWrap("ganti-namadev", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }