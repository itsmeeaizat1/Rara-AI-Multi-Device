// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'linesticker',
    alias: ["linesticker"],
    category: 'sticker',
    description: 'Download sticker pack LINE',
    usage: '.linesticker <url>',
    example: '.linesticker https://store.line.me/stickershop/product/9801/en',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 25,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.args?.[0]?.trim()
    
    if (!url || !url.includes('store.line.me')) {
        return m.reply( `🎨 *ʟɪɴᴇ ꜱᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ*\n\n` +
            `Download LINE sticker pack\n\n` +
            `╭──「 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
            `│ ${m.prefix}linesticker <url>\n` +
            `╰┈┈┈┈┈┈┈┈\n\n` +
            `*ᴄᴀʀᴀ ᴅᴀᴘᴀᴛ ᴜʀʟ:*\n` +
            `1. Buka https://store.line.me\n` +
            `2. Pilih sticker pack\n` +
            `3. Copy URL dari browser\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `${m.prefix}linesticker https://store.line.me/stickershop/product/9801/en`, "linesticker")
    }
    
    await m.react('🕐')
    
    try {
        const apikey = config.APIkey?.neoxr
        if (!apikey) {
            return m.reply(novaError("LineSticker", "API Key Neoxr gak ada di config nih!"))
        }
        
        const apiUrl = `https://api.neoxr.eu/api/linesticker?url=${encodeURIComponent(url)}&apikey=${apikey}`
        const res = await axios.get(apiUrl, { timeout: 60000 })
        
        if (!res.data?.status || !res.data?.data) {
            return m.reply(novaError("LineSticker", "Gagal ambil sticker dari URL nih!"))
        }
        
        const data = res.data.data
        const title = data.title || 'LINE Sticker'
        const author = data.author || 'Unknown'
        const isAnimated = data.animated || false
        
        const stickerUrls = isAnimated && data.sticker_animation_url?.length
            ? data.sticker_animation_url
            : data.sticker_url || []
        
        if (!stickerUrls.length) {
            return m.reply(novaError("LineSticker", "Gak ada sticker nemu nih!"))
        }
        
        await m.reply(
            `🎨 *ʟɪɴᴇ ꜱᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ*\n\n` +
            `╭──「 *ɪɴꜰᴏ* 」\n` +
            `│ 📝 *ᴛɪᴛʟᴇ:* ${title}\n` +
            `│ 👤 *ᴀᴜᴛʜᴏʀ:* ${author}\n` +
            `│ 🎬 *ᴀɴɪᴍᴀᴛᴇᴅ:* ${isAnimated ? 'Ya' : 'Tidak'}\n` +
            `│ 📊 *ᴛᴏᴛᴀʟ:* ${stickerUrls.length}\n` +
            `╰┈┈┈┈┈┈┈┈\n\n` +
            `🕕 Mengirim sticker...`
        )
        
        const maxStickers = Math.min(stickerUrls.length, 10)
        const packname = title
        const packAuthor = author
        
        let sent = 0
        for (let i = 0; i < maxStickers; i++) {
            try {
                const response = await axios.get(stickerUrls[i], {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                })
                const buffer = Buffer.from(response.data)
                
                if (isAnimated) {
                    await sock.sendVideoAsSticker(m.chat, buffer, m, { packname, author: packAuthor })
                } else {
                    await sock.sendImageAsSticker(m.chat, buffer, m, { packname, author: packAuthor })
                }
                sent++
                await new Promise(r => setTimeout(r, 600))
            } catch (e) {
                console.error('[LineSticker] Sticker error:', e.message)
            }
        }
        
        if (sent > 0) {
            await m.react('✅')
            await m.reply(claraWrap("Linesticker", `✅ Berhasil kirim ${sent}/${stickerUrls.length} sticker`))
        } else {
            await m.reply(novaError("LineSticker", "Gagal kirim sticker nih"))
        }
        
    } catch (error) {
        console.error('[LineSticker] Error:', error.message)
        m.reply(claraWrap("linesticker", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }