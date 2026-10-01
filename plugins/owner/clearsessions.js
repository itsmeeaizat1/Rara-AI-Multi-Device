// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

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

async function handler(m, { sock }) {
    const sessionsPath = path.join(process.cwd(), 'storage', 'sessions')
    
    if (!fs.existsSync(sessionsPath)) {
        return m.reply(`❌ Folder sessions tidak ditemukan!`)
    }
    
    try {
        const files = fs.readdirSync(sessionsPath)
        
        if (files.length === 0) {
            return await m.reply(`Folder sessions sudah kosong!`);
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
        await m.reply(
            `Deleted: *${deleted}* file\n` +
            `Skipped: *${skipped}* file\n` +
            `Note: creds.json tidak dihapus\n\n` +
            `Session files berhasil dibersihkan!\n` +
            `Restart bot jika diperlukan.`
        )
        
    } catch (error) {
        await m.reply(raraWrap("clearsessions", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
