// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara-goodbye.jpg',
    alias: ["ganti-rara-goodbye.jpg", 'ganti-nova-goodbye.jpg'],
    category: 'owner',
    description: 'Ganti gambar rara-goodbye.jpg (thumbnail goodbye)',
    usage: '.ganti-rara-goodbye.jpg (reply/kirim gambar)',
    example: '.ganti-rara-goodbye.jpg',
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
        return m.reply(raraWrap("Ganti-rara-goodbye.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/welcome/left.jpg`))
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("Ganti-rara-goodbye.jpg", `❌ Gagal mendownload gambar`))
        }
        
        try {
            const newUrl = await updateAssetUrl('rara-goodbye', buffer, 'rara-goodbye.jpg')
            { const __navText = `✅ *berhasil*\n\nGambar rara-goodbye.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(raraWrap("ganti-rara-goodbye.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara-goodbye.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }