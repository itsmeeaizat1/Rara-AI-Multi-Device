// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara.mp4',
    alias: ["ganti-rara.mp4", 'ganti-nova.mp4'],
    category: 'owner',
    description: 'Ganti video rara.mp4',
    usage: '.ganti-rara.mp4 (reply/kirim video)',
    example: '.ganti-rara.mp4',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isVideo = m.type === 'videoMessage' || (m.quoted && m.quoted.type === 'videoMessage')
    
    if (!isVideo) {
        return m.reply( raraWrap("Ganti-rara.mp4", `Kirim/reply video untuk mengganti\nFile: assets/video/rara.mp4`), { commandName: "ganti-rara.mp4" })
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("Ganti-rara.mp4", `❌ Gagal mendownload video`))
        }
        
        try {
            const newUrl = await updateAssetUrl('rara-mp4', buffer, 'rara.mp4')
            { const __navText = `✅ *berhasil*\n\nFile rara.mp4 telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(raraWrap("ganti-rara.mp4", `❌ Gagal mengupload file: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara.mp4", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }