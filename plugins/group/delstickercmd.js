// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { getQuotedStickerHash, deleteStickerCommand, listStickerCommands, findByCommand } from '../../src/lib/rara-sticker-command.js'

const pluginConfig = {
    name: 'delstickercmd',
    alias: ["delstickercmd"],
    category: 'group',
    description: 'Hapus sticker command',
    usage: '.delstickercmd <command> atau reply sticker',
    example: '.delstickercmd menu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    isAdmin: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const args = m.args || []
    const commandName = args[0]
    const pfx = m.prefix || ".";

    if (!commandName && !m.quoted) {
        const existingCmds = listStickerCommands()
        if (existingCmds.length === 0) {
            return m.reply(
                raraEmpty("DelStickerCmd", `Tidak ada sticker command yang terdaftar saat ini.\nTambahkan dulu dengan \`${pfx}addcmdsticker\``)
            )
        }
        
        let txt = `🖼️ *sticker commands*\n\n`
        txt += ""
        
        for (const cmd of existingCmds) {
            txt += `🖼️ → \`.${cmd.command}\`\n`
        }
        txt += `---\n\n`
        
        txt += `*hapus dengan:*\n`
        txt += `\`${pfx}delstickercmd <command>\`\n`
        txt += `atau reply sticker + \`${pfx}delstickercmd\``
        
        return await m.reply(raraWrap("delstickercmd", txt))
    }
    
    let deleted = false
    let deletedCmd = ''
    if (m.quoted) {
        const stickerHash = getQuotedStickerHash(m)
        if (stickerHash) {
            const success = deleteStickerCommand(stickerHash)
            if (success) {
                deleted = true
                deletedCmd = 'sticker yang di-reply'
            }
        }
    }
    if (!deleted && commandName) {
        const cleanCmd = commandName.toLowerCase().replace(/^\./, '')
        const found = findByCommand(cleanCmd)
        
        if (found) {
            const success = deleteStickerCommand(found.hash)
            if (success) {
                deleted = true
                deletedCmd = cleanCmd
            }
        } else {
            return m.reply(
                raraEmpty("DelStickerCmd", `Command sticker \`${cleanCmd}\` tidak ditemukan nih!\nKetik \`${pfx}delstickercmd\` untuk lihat daftar.`)
            )
        }
    }
    
    if (deleted) {
        await m.reply(
            `✅ *sticker command dihapus*\n\n` +
            `🗑️ \`${deletedCmd}\` telah dihapus.`
        )
    } else {
        await m.reply(
            raraError("DelStickerCmd", `Gagal menghapus sticker command!\nReply stiker yang mau dihapus, atau ketik nama command: \`${pfx}delstickercmd menu\``)
        )
    }
}

export { pluginConfig as config, handler }