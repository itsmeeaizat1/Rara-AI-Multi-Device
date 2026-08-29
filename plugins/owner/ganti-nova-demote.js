// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova-demote.jpg',
    alias: ["ganti-nova-demote.jpg", "ganti"],
    category: 'owner',
    description: 'Ganti gambar nova-demote.jpg',
    usage: '.ganti-nova-demote.jpg (reply/kirim gambar)',
    example: '.ganti-nova-demote.jpg',
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
    if (!isImage) return m.reply(claraWrap("Ganti-nova-demote.jpg", `🖼️ *Ganti NOVA-DEMOTE.JPG*\n\nKirim/reply gambar untuk mengganti\nFile: assets/image/nova-demote.jpg`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = claraWrap("ganti-nova-demote.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        try {
            const newUrl = await updateAssetUrl('nova-demote', buffer, 'nova-demote.jpg')
            m.reply(claraWrap("Ganti-nova-demote.jpg", `✅ *ʙᴇʀʜᴀꜱɪʟ*\n\nGambar nova-demote.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(claraWrap("ganti-nova-demote.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-nova-demote.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }