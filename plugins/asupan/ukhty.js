// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ukhty',
    alias: ['ukht'],
    category: 'asupan',
    description: 'Video ukhty',
    usage: '.ukhty',
    example: '.ukhty',
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
    } catch (e) { console.error('[ukhty.js]:', e.message); }
    return []
}

async function handler(m, { sock }) {
    m.react('🕐')
    
    try {
        const data = loadJsonData('ukhty.json')
        
        if (data.length === 0) {
            return m.reply(claraWrap("Ukhty", `❌ Data tidak tersedia`))
        }
        
        const item = data[Math.floor(Math.random() * data.length)]
        
        await sock.sendMedia(m.chat, item.url, null, m, {
            type: 'video'
        })
        m.react('✅')
        
    } catch (error) {
        m.reply(claraWrap("Error", `❌ *Error*\n\n> Video tidak ditemukan`))
    }
}

export { pluginConfig as config, handler }