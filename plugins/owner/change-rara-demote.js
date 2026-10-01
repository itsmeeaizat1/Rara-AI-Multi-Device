// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-rara-demote.jpg',
    alias: ["ganti-rara-demote.jpg", 'ganti-nova-demote.jpg'],
    category: 'owner',
    description: 'Ganti gambar rara-demote.jpg',
    usage: '.ganti-rara-demote.jpg (reply/kirim gambar)',
    example: '.ganti-rara-demote.jpg',
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
    if (!isImage) return m.reply(raraWrap("Ganti-rara-demote.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/group/rara-demote.png`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = raraWrap("ganti-rara-demote.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        try {
            const newUrl = await updateAssetUrl('rara-demote', buffer, 'rara-demote.jpg')
            m.reply(raraWrap("Ganti-rara-demote.jpg", `✅ *berhasil*\n\nGambar rara-demote.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(raraWrap("ganti-rara-demote.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-rara-demote.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }