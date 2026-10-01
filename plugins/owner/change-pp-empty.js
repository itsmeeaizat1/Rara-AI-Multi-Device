// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { updateAssetUrl } from '../../src/lib/rara-uploader.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'ganti-pp-kosong.jpg',
    alias: ["ganti-pp-kosong.jpg"],
    category: 'owner',
    description: 'Ganti gambar pp-kosong.jpg',
    usage: '.ganti-pp-kosong.jpg (reply/kirim gambar)',
    example: '.ganti-pp-kosong.jpg',
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
    if (!isImage) return m.reply(raraWrap("Ganti-pp-kosong.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/user/pp-kosong.jpg`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = raraWrap("ganti-pp-kosong.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        try {
            const newUrl = await updateAssetUrl('pp-kosong', buffer, 'pp-kosong.jpg')
            m.reply(raraWrap("Ganti-pp-kosong.jpg", `✅ *berhasil*\n\nGambar pp-kosong.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(raraWrap("ganti-pp-kosong.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(raraWrap("ganti-pp-kosong.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }