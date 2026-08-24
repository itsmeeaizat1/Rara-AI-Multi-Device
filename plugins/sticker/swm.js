// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { addExifToWebp, isAnimatedWebp, DEFAULT_METADATA } from '../../src/lib/nova-exif.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'swm',
    alias: ['wm', 'stickerwm', 'stickermark', 'colong'],
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
        return m.reply( `🖼️ *sTicker Watermark*\n\n` +
            `Reply sticker dengan caption:\n` +
            `\`${m.prefix}swm packname\`\n\n` +
            `*Contoh:*\n` +
            `\`${m.prefix}swm Nova-AI\`\n` +
            `\`${m.prefix}swm Nova-AI|LuckyArchz\` _(packname + author)_`, "swm")
    }
    
    const isSticker = quoted.type === 'stickerMessage' || quoted.isSticker
    if (!isSticker) {
        return m.reply(claraWrap("Swm", `❌ *Gagal*\n\nReply pesan sticker, bukan ${quoted.type?.replace('Message', '') || 'media lain'}`))
    }
    
    const input = m.text?.trim()
    if (!input) {
        return m.reply( `❌ *Gagal*\n\n` +
            `Masukkan packname\n\n` +
            `*Contoh:*\n` +
            `\`${m.prefix}swm Nova-AI\`\n` +
            `\`${m.prefix}swm Nova-AI|LuckyArchz\` _(+ author)_`, "swm")
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
    
    m.react('🕐')
    
    try {
        const buffer = await quoted.download()
        
        if (!buffer || buffer.length === 0) {
            return m.reply(claraWrap("Swm", `❌ *Gagal*\n\nGagal mendownload sticker`))
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
        
        m.react('✅')
        
    } catch (error) {
        console.error('[SWM] Error:', error.message)
        m.reply(claraWrap("swm", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }