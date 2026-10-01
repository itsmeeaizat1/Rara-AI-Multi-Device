// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara3.jpg',
    alias: ["ganti-rara3.jpg", 'ganti-nova3.jpg'],
    category: 'owner',
    description: 'Ganti gambar rara3.jpg',
    usage: '.ganti-rara3.jpg (reply/kirim gambar)',
    example: '.ganti-rara3.jpg',
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
        return m.reply(raraWrap("Ganti-rara3.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/rara3.jpg`))
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("Ganti-rara3.jpg", `❌ Gagal mendownload gambar`))
        }
        
        try {
            const newUrl = await updateAssetUrl('rara3', buffer, 'rara3.jpg')
            { const __navText = `✅ *berhasil*\n\nGambar rara3.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(raraWrap("ganti-rara3.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara3.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }