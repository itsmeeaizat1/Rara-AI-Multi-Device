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
    name: "automedia",
    alias: ["automedia"],
    category: 'group',
    description: 'Toggle auto media - otomatis jadikan sticker jadi gambar/video',
    usage: '.automedia on/off',
    example: '.automedia on',
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
    const current = groupData.automedia ?? false
    const arg = args[0]?.toLowerCase()
    
    if (!arg) {
        const status = current ? '✅ Aktif' : '❌ Nonaktif'
        return m.reply( `🎬 *automedia*\n\n` +
            `Status: ${status}\n\n` +
            `Gunakan:\n` +
            `\`${m.prefix}automedia on\` - aktifkan\n` +
            `\`${m.prefix}automedia off\` - nonaktifkan\n\n` +
            `_Otomatis jadikan sticker jadi gambar_\n` +
            `Video gak jadi bang`, "automedia")
    }
    
    if (arg === 'on' || arg === '1' || arg === 'aktif') {
        if (current) {
            return m.reply(raraWrap("Automedia", `Sudah aktif!`))
        }
        db.setGroup(m.chat, { automedia: true })
        await db.save()
        return m.reply(raraWrap("Automedia", `Berhasil diaktifkan!\nSticker akan otomatis jadi gambar/video`, "success"))
    }
    
    if (arg === 'off' || arg === '0' || arg === 'nonaktif') {
        if (!current) {
            return m.reply(raraWrap("Automedia", `Sudah nonaktif!`))
        }
        db.setGroup(m.chat, { automedia: false })
        await db.save()
        { const __navText = `🎬 *automedia*\n\n❌ Berhasil dinonaktifkan!`; return await m.reply(__navText); }
    }
    
    return m.reply(raraWrap("Auto media", `Gunakan: \`${m.prefix}automedia on/off\``, "error"))
}

async function autoMediaHandler(m, sock) {
    try {
        if (!m) return false
        if (!m.isGroup) return false
        if (m.isCommand) return false
        if (m.fromMe === true) return false
        
        const db = getDatabase()
        const groupData = db.getGroup(m.chat) || {}
        
        if (!groupData.automedia) return false
        
        const msg = m.message
        if (!msg) return false
        
        const hasSticker = msg.stickerMessage
        if (!hasSticker) return false
        
        if (hasSticker.isAnimated) return false
        
        const buffer = await m.download()
        if (!buffer || buffer.length === 0) return false
        
        const card = await dlCard("gambar", { buffer }, [["Engine", "Auto Media Convert"], ["Asal", "Stiker"], ["Tipe", "Gambar"]]);
        await sock.sendMedia(m.chat, buffer, card || null, m, { 
            type: 'image',
        })
        
        return true
    } catch (err) {
        return false
    }
}

export { pluginConfig as config, handler, autoMediaHandler }