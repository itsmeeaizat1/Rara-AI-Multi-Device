import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova-welcome.jpg',
    alias: ['gantiwelcome', 'setnovawelcome'],
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
        return m.reply(claraWrap("Ganti-nova-welcome.jpg", `🖼️ *ɢᴀɴᴛɪ ᴏᴜʀɪɴ-ᴡᴇʟᴄᴏᴍᴇ.ᴊᴘɢ*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/nova-welcome.jpg`))
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
        
        await m.reply(claraWrap("Ganti-nova-welcome.jpg", `⏳ Sedang mengupload gambar...`))
        try {
            const newUrl = await updateAssetUrl('nova-welcome', buffer, 'nova-welcome.jpg')
            { const __navText = `✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar nova-welcome.jpg telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(claraWrap("ganti-nova-welcome.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-nova-welcome.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }