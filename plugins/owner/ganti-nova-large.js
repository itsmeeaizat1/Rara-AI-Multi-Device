// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'nova-large',
    alias: ['setnovalarge', 'gantinovalarge'],
    category: 'owner',
    description: 'Preset: Ganti gambar nova.jpg, serta nova-v7 hingga nova-v11.jpg sekaligus',
    usage: '.nova-large (reply/kirim gambar)',
    example: '.nova-large',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')
    
    if (!isImage) {
        return m.reply(claraWrap("Nova-large", `🖼️ *ᴏᴜʀɪɴ ʟᴀʀɢᴇ ᴘʀᴇsᴇᴛ*\n\n> Kirim/reply gambar untuk mengganti kumpulan foto besar (nova.jpg, nova-v8.jpg, nova-v10.jpg) sekaligus.\n> Pastikan rasio gambar sesuai dengan yang diinginkan.`))
    }
    
    await m.react('🕐')
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("Nova-large", `❌ Gagal mendownload gambar`))
        }
        
        const targetImages = [
            'nova.jpg',
            'nova-v8.jpg',
            'nova-v10.jpg'
        ]
        
        const assetsDir = path.join(process.cwd(), 'assets', 'images')
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true })
        }
        
        for (const imgName of targetImages) {
            const targetPath = path.join(assetsDir, imgName)
            fs.writeFileSync(targetPath, buffer)
        }
        
        await m.react('✅')
        { const __navText = `✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar bundle *nova-large* berhasil diganti secara massal.\n> Mencakup: ${targetImages.join(', ')}\n> Restart bot jika gambar tidak langsung berubah.`; await m.reply(__navText); }
        
    } catch (error) {
        await m.reply(claraWrap("nova-large", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }