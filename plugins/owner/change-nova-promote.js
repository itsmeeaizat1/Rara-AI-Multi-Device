// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova-promote.jpg',
    alias: ["ganti-nova-promote.jpg"],
    category: 'owner',
    description: 'Ganti gambar nova-promote.jpg',
    usage: '.ganti-nova-promote.jpg (reply/kirim gambar)',
    example: '.ganti-nova-promote.jpg',
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
    if (!isImage) return m.reply(novaWrap("Ganti-nova-promote.jpg", `Kirim/reply gambar untuk mengganti\nFile: assets/image/group/nova-promote.png`))
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) { const __navText = novaWrap("ganti-nova-promote.jpg", '❌ Gagal mendownload gambar'); return await m.reply(__navText); }
        try {
            const newUrl = await updateAssetUrl('nova-promote', buffer, 'nova-promote.jpg')
            m.reply(novaWrap("Ganti-nova-promote.jpg", `✅ *berhasil*\n\nGambar nova-promote.jpg telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`))
        } catch (e) {
            m.reply(novaWrap("ganti-nova-promote.jpg", `❌ Gagal mengupload gambar: ${e.message}`))
        }
    } catch (error) {
        await m.reply(novaWrap("ganti-nova-promote.jpg", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }