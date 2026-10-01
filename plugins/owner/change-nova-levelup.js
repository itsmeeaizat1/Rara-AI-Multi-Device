// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova-levelup.jpg',
    alias: ["ganti-nova-levelup.jpg"],
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
    if (!isImage) return m.reply(novaWrap("Ganti-nova-levelup.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/rpg/nova-levelup.jpg`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = novaWrap("ganti-nova-levelup.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        try {
            const newUrl = await updateAssetUrl('nova-levelup', buffer, 'nova-levelup.jpg')
            m.reply(novaWrap("Ganti-nova-levelup.jpg", `✅ *berhasil*\n\nGambar nova-levelup.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(novaWrap("ganti-nova-levelup.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(novaWrap("ganti-nova-levelup.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }