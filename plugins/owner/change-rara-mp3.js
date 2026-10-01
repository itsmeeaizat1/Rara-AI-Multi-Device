// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara.mp3',
    alias: ["ganti-rara.mp3", 'ganti-nova.mp3'],
    category: 'owner',
    description: 'Ganti audio rara.mp3',
    usage: '.ganti-rara.mp3 (reply/kirim audio)',
    example: '.ganti-rara.mp3',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isAudio = m.type === 'audioMessage' || (m.quoted && m.quoted.type === 'audioMessage')
    
    if (!isAudio) {
        return m.reply( raraWrap("Ganti-rara.mp3", `Kirim/reply audio untuk mengganti\nFile: assets/audio/rara.mp3`), { commandName: "ganti-rara.mp3" })
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(raraWrap("Ganti-rara.mp3", `❌ Gagal mendownload audio`))
        }
        
        try {
            const newUrl = await updateAssetUrl('rara-mp3', buffer, 'rara.mp3')
            { const __navText = `✅ *berhasil*\n\nFile rara.mp3 telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(raraWrap("ganti-rara.mp3", `❌ Gagal mengupload file: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara.mp3", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }