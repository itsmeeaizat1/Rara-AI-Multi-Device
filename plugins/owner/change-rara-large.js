// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'rara-large',
    alias: ["rara-large", "rara", 'nova-large'],
    category: 'owner',
    description: 'Preset: Ganti gambar rara.jpg, serta rara-v7 hingga rara-v11.jpg sekaligus',
    usage: '.rara-large (reply/kirim gambar)',
    example: '.rara-large',
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
        return m.reply(raraWrap("Rara-large", `🖼️ *rara large preset*\n\nKirim/reply gambar untuk mengganti kumpulan foto besar (rara.jpg, panel/panel-thumb.jpg, rara-v10.jpg) sekaligus.\nPastikan rasio gambar sesuai dengan yang diinginkan.`))
    }
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("Rara-large", `❌ Gagal mendownload gambar`))
        }
        
        const targetImages = [
            'rara.jpg',
            'panel/panel-thumb.jpg',
            'rara-v10.jpg'
        ]
        
        const assetsDir = path.join(process.cwd(), 'assets', 'image')
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true })
        }
        
        for (const imgName of targetImages) {
            const targetPath = path.join(assetsDir, imgName)
            fs.writeFileSync(targetPath, buffer)
        }
        { const __navText = `✅ *berhasil*\n\nGambar bundle *rara-large* berhasil diganti secara massal.\nMencakup: ${targetImages.join(', ')}\nRestart bot jika gambar tidak langsung berubah.`; await m.reply(__navText); }
        
    } catch (error) {
        await m.reply(raraWrap("rara-large", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }