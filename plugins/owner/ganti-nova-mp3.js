// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { updateAssetUrl } from '../../src/lib/nova-uploader.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ganti-nova.mp3',
    alias: ["ganti-nova.mp3"],
    category: 'owner',
    description: 'Ganti audio nova.mp3',
    usage: '.ganti-nova.mp3 (reply/kirim audio)',
    example: '.ganti-nova.mp3',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isAudio = m.type === 'audioMessage' || (m.quoted && m.quoted.type === 'audioMessage')
    
    if (!isAudio) {
        return m.reply( claraWrap("Ganti-nova.mp3", `Kirim/reply audio untuk mengganti\nFile: assets/audio/nova.mp3`), { commandName: "ganti-nova.mp3" })
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("Ganti-nova.mp3", `❌ Gagal mendownload audio`))
        }
        
        try {
            const newUrl = await updateAssetUrl('nova-mp3', buffer, 'nova.mp3')
            { const __navText = `✅ *ʙᴇʀʜᴀꜱɪʟ*\n\nFile nova.mp3 telah diganti ke URL baru:\n${newUrl}\nConfig telah diupdate secara realtime!`; await m.reply(__navText); }
        } catch (e) {
            m.reply(claraWrap("ganti-nova.mp3", `❌ Gagal mengupload file: ${e.message}`))
        }
    } catch (error) {
        await m.reply(claraWrap("ganti-nova.mp3", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }