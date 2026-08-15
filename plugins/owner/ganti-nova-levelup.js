// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova-levelup.jpg',
    alias: ['gantinovalevelup', 'setnovalevelup'],
    category: 'owner',
    description: 'Ganti gambar nova-levelup.jpg',
    usage: '.ganti-nova-levelup.jpg (reply/kirim gambar)',
    example: '.ganti-nova-levelup.jpg',
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
    if (!isImage) return m.reply(claraWrap("Ganti-nova-levelup.jpg", `🖼️ *ɢᴀɴᴛɪ NOVA-LEVELUP.JPG*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/nova-levelup.jpg`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = claraWrap("ganti-nova-levelup.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        await m.reply(claraWrap("Ganti-nova-levelup.jpg", `⏳ Sedang mengupload gambar...`))
        try {
            const newUrl = await updateAssetUrl('nova-levelup', buffer, 'nova-levelup.jpg')
            m.reply(claraWrap("Ganti-nova-levelup.jpg", `✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar nova-levelup.jpg telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(claraWrap("ganti-nova-levelup.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-nova-levelup.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }