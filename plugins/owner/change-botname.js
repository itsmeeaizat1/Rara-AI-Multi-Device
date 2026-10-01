// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: "gantinamabot",
    alias: ["gantinamabot"],
    category: 'owner',
    description: 'Ganti nama bot di config.js',
    usage: '.ganti-namabot <nama baru>',
    example: '.ganti-namabot Rara MD',
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
        return m.reply( `🤖 *Ganti Nama Bot*\n\nNama saat ini: *${config.bot?.name || '-'}*\n\n*Penggunaan:*\n\`${m.prefix}ganti-namabot <nama baru>\``, "ganti-namabot")
    }
    
    try {
        const configPath = path.join(process.cwd(), 'config.js')
        let configContent = fs.readFileSync(configPath, 'utf8')
        
        configContent = configContent.replace(
            /bot:\s*\{[\s\S]*?name:\s*['"]([^'"]*)['"]/,
            (match, oldName) => match.replace(`'${oldName}'`, `'${newName}'`).replace(`"${oldName}"`, `'${newName}'`)
        )
        
        fs.writeFileSync(configPath, configContent)
        
        config.bot.name = newName
        
        { const __navText = `✅ *Berhasil*\n\nNama bot diganti ke: *${newName}*`; await m.reply(__navText); }
        
    } catch (error) {
        await m.reply(raraWrap("gantinamabot", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }