// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova.mp4',
    alias: ['gantinovavideo', 'setnovavideo'],
    category: 'owner',
    description: 'Ganti video nova.mp4',
    usage: '.ganti-nova.mp4 (reply/kirim video)',
    example: '.ganti-nova.mp4',
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
        return m.reply( claraWrap("Ganti-nova.mp4", `🎬 *Ganti Ourin.Mp4*\n\n> Kirim/reply video untuk mengganti\n> File: assets/video/nova.mp4`), { commandName: "ganti-nova.mp4" })
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("Ganti-nova.mp4", `❌ Gagal mendownload video`))
        }
        
        await m.reply(claraWrap("Ganti-nova.mp4", `⏳ Sedang mengupload gambar...`))
        try {
            const newUrl = await updateAssetUrl('nova-mp4', buffer, 'nova.mp4')
            { const __navText = `✅ *Berhasil*\n\n> File nova.mp4 telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(claraWrap("ganti-nova.mp4", `❌ Gagal mengupload file: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-nova.mp4", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }