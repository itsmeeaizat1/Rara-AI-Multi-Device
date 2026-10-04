// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/rara-database.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch group) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}
const pluginConfig = {
    name: "autosticker",
    alias: ["autosticker"],
    category: 'group',
    description: 'Toggle auto sticker - otomatis jadikan gambar/video jadi sticker',
    usage: '.autosticker on/off',
    example: '.autosticker on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []
    const groupData = db.getGroup(m.chat) || {}
    const current = groupData.autosticker ?? false
    const arg = args[0]?.toLowerCase()
    
    if (!arg) {
        const status = current ? '✅ Aktif' : '❌ Nonaktif'
        return m.reply( `🖼️ *autosticker*\n\n` +
            `Status: ${status}\n\n` +
            `Gunakan:\n` +
            `\`${m.prefix}autosticker on\` - aktifkan\n` +
            `\`${m.prefix}autosticker off\` - nonaktifkan\n\n` +
            `_Otomatis jadikan gambar/video jadi sticker_`, "autosticker")
    }
    
    
    if (arg === 'on' || arg === '1' || arg === 'aktif') {
        if (current) {
            return m.reply(raraWrap("Autosticker", `Sudah aktif!`))
        }
        db.setGroup(m.chat, { autosticker: true })
        await db.save()
        return m.reply(raraWrap("Autosticker", `Berhasil diaktifkan!\nGambar/video akan otomatis jadi sticker`, "success"))
    }
    
    if (arg === 'off' || arg === '0' || arg === 'nonaktif') {
        if (!current) {
            return m.reply(raraWrap("Autosticker", `Sudah nonaktif!`))
        }
        db.setGroup(m.chat, { autosticker: false })
        await db.save()
        { const __navText = `🖼️ *autosticker*\n\n❌ Berhasil dinonaktifkan!`; return await m.reply(__navText); }
    }
    
    return m.reply(raraWrap("Auto sticker", `Gunakan: \`${m.prefix}autosticker on/off\``, "error"))
}

async function autoStickerHandler(m, sock) {
    try {
        if (!m) return false
        if (!m.isGroup) return false
        if (m.isCommand) return false
        if (m.fromMe === true) return false
        
        const db = getDatabase()
        const groupData = db.getGroup(m.chat) || {}
        
        if (!groupData.autosticker) return false
        
        const msg = m.message
        if (!msg) return false
        
        const type = Object.keys(msg)[0]
        const content = msg[type]

        const isImage = type === 'imageMessage' || 
                        (type === 'viewOnceMessage' && content?.message?.imageMessage) ||
                        (type === 'viewOnceMessageV2' && content?.message?.imageMessage)
        
        const isVideo = type === 'videoMessage' ||
                        (type === 'viewOnceMessage' && content?.message?.videoMessage) ||
                        (type === 'viewOnceMessageV2' && content?.message?.videoMessage)
        
        if (!isImage && !isVideo) return false
        
        const buffer = await m.download()
        if (!buffer || buffer.length === 0) return false
        
        if (buffer.length > 10 * 1024 * 1024) return false
        
        const stickerCard = async (webpBuf) => {
            try {
                const card = await dlCard("stiker", { buffer: webpBuf, mime: "image/webp" }, [["Engine", "Auto Stiker"], ["Asal", isImage ? "Gambar" : "Video"]]);
                if (card) await sock.sendMessage(m.chat, { text: card }, { quoted: m });
            } catch { /* best-effort */ }
        };
        if (isImage) {
            await sock.sendImageAsSticker(m.chat, buffer, m, {
                packname: config.sticker?.packname || 'Rara',
                author: config.sticker?.author || 'Bot',
                onWebp: stickerCard
            })
        } else if (isVideo) {
            const videoMsg = msg.videoMessage || content?.message?.videoMessage
            const duration = videoMsg?.seconds || 0
            if (duration > 10) return false
            
            await sock.sendVideoAsSticker(m.chat, buffer, m, {
                packname: config.sticker?.packname || 'Rara',
                author: config.sticker?.author || 'Bot',
                onWebp: stickerCard
            })
        }
        
        return true
    } catch (err) {
        return false
    }
}

export { pluginConfig as config, handler, autoStickerHandler }