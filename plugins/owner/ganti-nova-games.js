// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova-games.jpg',
    alias: ["ganti-nova-games.jpg", "ganti"],
    category: 'owner',
    description: 'Ganti gambar nova-games.jpg (thumbnail games)',
    usage: '.ganti-nova-games.jpg (reply/kirim gambar)',
    example: '.ganti-nova-games.jpg',
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
        return m.reply(claraWrap("Ganti-nova-games.jpg", `🖼️ *ɢᴀɴᴛɪ ɴᴏᴠᴀ-ɢᴀᴍᴇꜱ.ᴊᴘɢ*\n\nKirim/reply gambar untuk mengganti\nFile: assets/image/nova-games.jpg`))
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("Ganti-nova-games.jpg", `❌ Gagal mendownload gambar`))
        }
        
        try {
            const newUrl = await updateAssetUrl('nova-games', buffer, 'nova-games.jpg')
            { const __navText = `✅ *ʙᴇʀʜᴀꜱɪʟ*\n\nGambar nova-games.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(claraWrap("ganti-nova-games.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-nova-games.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }