// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'clearsessions',
    alias: ["clearsessions"],
    category: 'owner',
    description: 'Menghapus semua session di storage/sessions/',
    usage: '.clearsessions',
    example: '.clearsessions',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock })  {
    const sessionsPath = path.join(process.cwd(), 'storage', 'sessions')
    
    if (!fs.existsSync(sessionsPath)) {
        return m.reply(claraWrap("clearsessions", `❌ Folder sessions tidak ditemukan!`))
    }
    
    
    try {
        const files = fs.readdirSync(sessionsPath)
        
        if (files.length === 0) {
            { const __navText = `📁 Folder sessions sudah kosong!`; return await m.reply(__navText); }
        }
        
        let deleted = 0
        let skipped = 0
        
        for (const file of files) {
            if (file === 'creds.json') {
                skipped++
                continue
            }
            
            const filePath = path.join(sessionsPath, file)
            try {
                const stat = fs.statSync(filePath)
                if (stat.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true })
                } else {
                    fs.unlinkSync(filePath)
                }
                deleted++
            } catch (e) { console.error('[clearsessions.js]:', e.message); }
        }
        
        await m.react('✅')
        await m.reply(claraWrap("Clearsessions", `╭┈┈⬡「 🗑️ *Clear sEssions*
┃
┃ Deleted: *${deleted}* file
┃ sKipped: *${skipped}* file
┃ Note: creds.json tidak dihapus
┃
╰┈┈⬡

│ _Session files berhasil dibersihkan!_
│ _Restart bot jika diperlukan._`))
        
    } catch (error) {
        await m.reply(claraWrap("clearsessions", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }