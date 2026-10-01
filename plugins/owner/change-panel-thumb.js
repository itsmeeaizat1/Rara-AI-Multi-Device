// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-panel-thumb',
    alias: ["ganti-panel-thumb"],
    category: 'owner',
    description: 'Ganti gambar panel-thumb.jpg (thumbnail panel/cPanel)',
    usage: '.ganti-panel-thumb (reply/kirim gambar)',
    example: '.ganti-panel-thumb',
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
        return m.reply(raraWrap("Ganti-panel-thumb", `Kirim/reply gambar untuk mengganti\nFile: assets/image/panel/panel-thumb.jpg`))
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("Ganti-panel-thumb", `❌ Gagal mendownload gambar`))
        }
        
        try {
            const newUrl = await updateAssetUrl('panel-thumb', buffer, 'panel-thumb.jpg')
            { const __navText = `✅ *Berhasil*\n\nGambar panel-thumb.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(raraWrap("ganti-panel-thumb", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-panel-thumb", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
