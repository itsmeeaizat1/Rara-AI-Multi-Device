// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara-rules.jpg',
    alias: ["ganti-rara-rules.jpg", 'ganti-nova-rules.jpg'],
    category: 'owner',
    description: 'Ganti gambar rara-rules.jpg (thumbnail rules)',
    usage: '.ganti-rara-rules.jpg (reply/kirim gambar)',
    example: '.ganti-rara-rules.jpg',
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
        return m.reply(raraWrap("Ganti-rara-rules.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/group/rara-rules.jpg`))
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("Ganti-rara-rules.jpg", `❌ Gagal mendownload gambar`))
        }
        
        try {
            const newUrl = await updateAssetUrl('rara-rules', buffer, 'rara-rules.jpg')
            { const __navText = `✅ *berhasil*\n\nGambar rara-rules.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(raraWrap("ganti-rara-rules.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara-rules.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }