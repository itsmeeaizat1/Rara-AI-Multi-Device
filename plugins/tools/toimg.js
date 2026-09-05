// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'toimg',
    alias: ["toimg"],
    category: 'tools',
    description: 'Mengubah sticker menjadi gambar',
    usage: '.toimg (reply/caption sticker)',
    example: '.toimg',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    let mediaSource = null
    let downloadFn = null
    const selfIsSticker = m.isSticker || 
                          m.type === 'stickerMessage' || 
                          m.message?.stickerMessage
    const quotedIsSticker = m.quoted && (
        m.quoted.isSticker || 
        m.quoted.type === 'stickerMessage' || 
        m.quoted.mtype === 'stickerMessage' ||
        m.quoted.message?.stickerMessage
    )
    
    if (selfIsSticker) {
        mediaSource = 'self'
        downloadFn = m.download
    } else if (quotedIsSticker) {
        mediaSource = 'quoted'
        downloadFn = m.quoted.download
    }
    
    if (!mediaSource) {
        await m.reply( `❌ *ɢᴀɢᴀʟ*\n\n` +
            `Tidak ada sticker yang terdeteksi!\n\n` +
            `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ:*\n` +
            `1. Kirim sticker + caption \`${m.prefix}toimg\`\n` +
            `2. Reply sticker dengan \`${m.prefix}toimg\``, "toimg")
        return
    }

    const stickerMsg = mediaSource === 'self' 
        ? m.message?.stickerMessage 
        : m.quoted?.message?.stickerMessage
    const isAnimated = stickerMsg?.isAnimated

    if (isAnimated) {
        await m.reply(`⚠️ *Sticker Animasi*\n\n` +
            `Sticker ini adalah sticker animasi (GIF).\n` +
            `Gunakan \`${m.prefix}tovideo\` untuk mengubahnya.`)
        return
    }
    try {
    await m.react("🕒");
        const buffer = await downloadFn()

        if (!buffer || buffer.length === 0) {
            await m.reply( `❌ *ɢᴀɢᴀʟ*\n\n` +
                `Tidak dapat mengunduh sticker.\n` +
                `Sticker mungkin sudah tidak tersedia.`, "toimg")
            return
        }

        if (buffer.length < 100) {
            await m.react("🐣");
            await m.reply(claraWrap("toimg", `❌ *ꜰɪʟᴇ ᴋᴏʀᴜᴘ*\n\n` +
                `File sticker tidak valid atau rusak.\n` +
                `Coba kirim ulang stickernya.`))
            return
        }

        await sock.sendMedia(m.chat, buffer, null, m, {
            type: 'image'
        })

    } catch (error) {
    await m.react("❌");
        await m.reply(
            `❌ *ᴇʀʀᴏʀ*\n\n` +
            `Terjadi kesalahan saat memproses.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }