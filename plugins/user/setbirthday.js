// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'
const pluginConfig = {
    name: 'setbirthday',
    alias: ["setbirthday"],
    category: 'user',
    description: 'Set tanggal ulang tahun',
    usage: '.setbirthday <DD-MM>',
    example: '.setbirthday 25-12',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const input = m.args?.[0]?.trim()
    const userJid = m.sender
    const cleanJid = userJid.replace(/@.+/g, '')
    
    if (!input) {
        const user = db.getUser(userJid)
        const currentBday = user?.birthday
        
        let text = `🎂 *ꜱᴇᴛ ʙɪʀᴛʜᴅᴀʏ*\n\n`
        
        if (currentBday) {
            text += `Birthday kamu: *${currentBday}*\n\n`
        }
        
        text += ""
        text += `${m.prefix}setbirthday DD-MM\n`
        text += `╰┈┈┈┈┈┈┈┈\n\n`
        text += `*ᴄᴏɴᴛᴏʜ:*\n`
        text += `${m.prefix}setbirthday 25-12\n`
        text += `${m.prefix}setbirthday 01-01`
        
        return await m.reply( text, "setbirthday")
    }
    
    const dateRegex = /^(\d{1,2})[-\/](\d{1,2})$/
    const match = input.match(dateRegex)
    
    if (!match) {
        return m.reply(claraWrap("setbirthday", `Format salah! Gunakan: DD-MM\n\nContoh: ${m.prefix}setbirthday 25-12`))
    }
    
    const day = parseInt(match[1])
    const month = parseInt(match[2])
    
    if (month < 1 || month > 12) {
        return m.reply(claraWrap("setbirthday", `Bulan gak valid! (1-12)`))
    }
    
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (day < 1 || day > daysInMonth[month - 1]) {
        return m.reply(claraWrap("setbirthday", `Tanggal gak valid untuk bulan ${month} nih!`))
    }
    
    const formattedDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`
    
    db.setUser(m.sender, { 
        birthday: formattedDate 
    })
    
    await db.save()
    
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    await m.reply(
        `✅ *Birthday Disimpan!*\n\n` +
        "" +
        `📅 Tanggal: *${day} ${months[month - 1]}*\n` +
        `👤 User: @${cleanJid}\n` +
        `╰┈┈┈┈┈┈┈┈\n\n` +
        `Bot akan mengucapkan selamat\n` +
        `ulang tahun di hari spesialmu! 🎉`,
        { mentions: [userJid] }
    )
}

export { pluginConfig as config, handler }