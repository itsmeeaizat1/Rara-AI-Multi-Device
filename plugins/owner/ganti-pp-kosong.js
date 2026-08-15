import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-pp-kosong.jpg',
    alias: ['gantippkosong', 'setppkosong'],
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
    if (!isImage) return m.reply(claraWrap("Ganti-pp-kosong.jpg", `🖼️ *ɢᴀɴᴛɪ PP-KOSONG.JPG*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/pp-kosong.jpg`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = claraWrap("ganti-pp-kosong.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        await m.reply(claraWrap("Ganti-pp-kosong.jpg", `⏳ Sedang mengupload gambar...`))
        try {
            const newUrl = await updateAssetUrl('pp-kosong', buffer, 'pp-kosong.jpg')
            m.reply(claraWrap("Ganti-pp-kosong.jpg", `✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar pp-kosong.jpg telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(claraWrap("ganti-pp-kosong.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-pp-kosong.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }