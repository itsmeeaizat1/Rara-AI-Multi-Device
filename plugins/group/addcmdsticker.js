// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { getQuotedStickerHash, addStickerCommand, listStickerCommands } from '../../src/lib/rara-sticker-command.js'
import { getPlugin } from '../../src/lib/rara-plugins.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'addcmdsticker',
    alias: ["addcmdsticker"],
    category: 'group',
    description: 'Jadikan sticker sebagai shortcut command',
    usage: '.addcmdsticker <command> (reply sticker)',
    example: '.addcmdsticker menu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    isAdmin: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const args = m.args || []
    const commandName = args[0]
    
    // Validasi command name
    if (!commandName) {
        const existingCmds = listStickerCommands()
        
        let txt = `🖼️ *sticker to command*\n\n`
        txt += `Reply sticker + ketik command yang ingin dijadikan shortcut.\n\n`
        txt += `*contoh:*\n`
        txt += `Reply sticker, lalu ketik:\n`
        txt += `\`.addcmdsticker menu\`\n\n`
        
        if (existingCmds.length > 0) {
            txt += ""
            for (const cmd of existingCmds.slice(0, 10)) {
                txt += `🖼️ → \`${cmd.command}\`\n`
            }
            if (existingCmds.length > 10) {
                txt += `... dan ${existingCmds.length - 10} lainnya\n`
            }
            txt += `---`
        }
        
        return await m.reply(raraWrap("addcmdsticker", txt))
    }
    
    // Validasi reply sticker
    if (!m.quoted) {
        return m.reply(raraWrap("Addcmdsticker", '⚠️ *reply sticker* yang ingin dijadikan command!'))
    }
    
    const stickerHash = getQuotedStickerHash(m)
    if (!stickerHash) {
        return m.reply(raraWrap("Addcmdsticker", '⚠️ Pesan yang di-reply bukan *sticker*!'))
    }
    
    // Validasi command exists
    const cleanCmd = commandName.toLowerCase().replace(/^\./, '')
    const plugin = getPlugin(cleanCmd)
    
    if (!plugin) {
        return m.reply(
            `❌ Command \`${cleanCmd}\` gak nemu nih!\n\n` +
            `Pastikan command yang ingin dijadikan shortcut valid.`
        )
    }
    
    // Add sticker command
    const success = addStickerCommand(stickerHash, cleanCmd, m.sender)
    
    if (success) {
        await m.reply(
            `✅ *sticker command ditambahkan*\n\n` +
            `🖼️ Sticker → \`.${cleanCmd}\`\n\n` +
            `_Kirim sticker tersebut untuk menjalankan command!_`
        )
    } else {
        await m.reply(raraError('AddCmdSticker', 'Gagal simpan sticker command nih'))
    }
}

export { pluginConfig as config, handler }