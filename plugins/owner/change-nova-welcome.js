// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova-welcome.jpg',
    alias: ["ganti-nova-welcome.jpg"],
    category: 'owner',
    description: 'Ganti gambar nova-welcome.jpg (thumbnail welcome)',
    usage: '.ganti-nova-welcome.jpg (reply/kirim gambar)',
    example: '.ganti-nova-welcome.jpg',
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
        return m.reply(claraWrap("Ganti-nova-welcome.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/welcome/wellcome.jpg`))
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("Ganti-nova-welcome.jpg", `❌ Gagal mendownload gambar`))
        }
        
        try {
            const newUrl = await updateAssetUrl('nova-welcome', buffer, 'nova-welcome.jpg')
            { const __navText = `✅ *ʙᴇʀʜᴀꜱɪʟ*\n\nGambar nova-welcome.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(claraWrap("ganti-nova-welcome.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-nova-welcome.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }