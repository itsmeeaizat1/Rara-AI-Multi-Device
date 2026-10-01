// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara-promote.jpg',
    alias: ["ganti-rara-promote.jpg", 'ganti-nova-promote.jpg'],
    category: 'owner',
    description: 'Ganti gambar rara-promote.jpg',
    usage: '.ganti-rara-promote.jpg (reply/kirim gambar)',
    example: '.ganti-rara-promote.jpg',
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
    if (!isImage) return m.reply(raraWrap("Ganti-rara-promote.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/group/rara-promote.png`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = raraWrap("ganti-rara-promote.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        try {
            const newUrl = await updateAssetUrl('rara-promote', buffer, 'rara-promote.jpg')
            m.reply(raraWrap("Ganti-rara-promote.jpg", `✅ *berhasil*\n\nGambar rara-promote.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(raraWrap("ganti-rara-promote.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara-promote.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }