// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { f } from '../../src/lib/nova-http.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'bocil',
    alias: ["bocil", 'bocilvid'],
    category: 'asupan',
    description: 'Video bocil',
    usage: '.bocil',
    example: '.bocil',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

function loadJsonData(filename) {
    try {
        const filePath = path.join(process.cwd(), 'src', 'tiktok', filename)
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        }
    } catch (e) { console.error('[bocil.js]:', e.message); }
    return []
}

async function handler(m, { sock }) {
    m.react('🕐')
    
    try {
        const data = loadJsonData('bocil.json')
        
        if (data.length === 0) {
            return m.reply(claraWrap("Bocil", `❌ Data tidak tersedia`))
        }
        
        const item = data[Math.floor(Math.random() * data.length)]
        
        await sock.sendMedia(m.chat, item.url, null, m, {
            type: 'video'
        })
        m.react('✅')
        
    } catch (error) {
        m.reply(claraWrap("Error", `❌ *ᴇʀʀᴏʀ*\n\nVideo tidak ditemukan`))
    }
}

export { pluginConfig as config, handler }