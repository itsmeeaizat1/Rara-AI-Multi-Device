// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara-levelup.jpg',
    alias: ["ganti-rara-levelup.jpg", 'ganti-nova-levelup.jpg'],
    category: 'owner',
    description: 'Ganti gambar rara-levelup.jpg',
    usage: '.ganti-rara-levelup.jpg (reply/kirim gambar)',
    example: '.ganti-rara-levelup.jpg',
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
    if (!isImage) return m.reply(raraWrap("Ganti-rara-levelup.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/rpg/rara-levelup.jpg`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = raraWrap("ganti-rara-levelup.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        try {
            const newUrl = await updateAssetUrl('rara-levelup', buffer, 'rara-levelup.jpg')
            m.reply(raraWrap("Ganti-rara-levelup.jpg", `✅ *berhasil*\n\nGambar rara-levelup.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(raraWrap("ganti-rara-levelup.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara-levelup.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }