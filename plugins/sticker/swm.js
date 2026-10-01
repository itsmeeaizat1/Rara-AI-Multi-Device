// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { addExifToWebp, isAnimatedWebp, DEFAULT_METADATA } from '../../src/lib/rara-exif.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: 'swm',
    alias: ["swm"],
    category: 'sticker',
    description: 'Mengganti packname dan author pada sticker',
    usage: '.swm <packname> atau .swm <packname>|<author>',
    example: '.swm BotName',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
    const quoted = m.quoted
    
    if (!quoted) {
        return m.reply(raraWrap("swm", [
            "Reply sticker dengan caption:",
            m.prefix + "swm packname",
            "",
            "💡 Contoh:",
            m.prefix + "swm Rara-AI",
            m.prefix + "swm Rara-AI|LuckyArchz (packname + author)",
        ]))
    }
    
    const isSticker = quoted.type === 'stickerMessage' || quoted.isSticker
    if (!isSticker) {
        return m.reply(raraError("SWM", "Reply pesan sticker dulu, bukan media lain"))
    }
    
    const input = m.text?.trim()
    if (!input) {
        return m.reply( `❌ *gagal*\n\n` +
            `Masukkan packname\n\n` +
            `*contoh:*\n` +
            `\`${m.prefix}swm Rara-AI\`\n` +
            `\`${m.prefix}swm Rara-AI|LuckyArchz\` _(+ author)_`, "swm")
    }
    
    let packname, author
    
    if (input.includes('|')) {
        const parts = input.split('|')
        packname = parts[0]?.trim() || ''
        author = parts[1]?.trim() || ''
    } else {
        packname = input
        author = ''
    }
    try {
    await m.react("🕒");
        const buffer = await quoted.download()
        
        if (!buffer || buffer.length === 0) {
            return m.reply(raraGagal("SWM"))
        }
        
        const exifOpts = { packname, author, emojis: ['🤖'] }
        const riff = buffer.slice(0, 4).toString('ascii')
        const webpSig = buffer.length >= 12 ? buffer.slice(8, 12).toString('ascii') : ''
        const isWebp = riff === 'RIFF' && webpSig === 'WEBP'
        
        if (isWebp) {
            const stickerBuffer = await addExifToWebp(buffer, exifOpts)
            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer,
                contextInfo: { isForwarded: false, forwardingScore: 0 }
            }, { quoted: m })
        } else {
            const isVideo = buffer.slice(0, 3).toString('hex') === '000000' ||
                            buffer.slice(4, 8).toString('ascii') === 'ftyp'
            
            if (isVideo) {
                await sock.sendVideoAsSticker(m.chat, buffer, m, exifOpts)
            } else {
                await sock.sendImageAsSticker(m.chat, buffer, m, exifOpts)
            }
        }
        await m.react("🐣");
        await m.reply(raraBerhasil("Swm"));
    } catch (error) {
        console.error('[SWM] Error:', error.message)
        m.reply(raraGangguan("Swm"))
    }
}

export { pluginConfig as config, handler }