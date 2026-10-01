// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import { downloadContentFromMessage } from 'nova'
import { novaWrap, novaLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "openvo",
    alias: ["openvo", "rvo"],
    category: 'group',
    description: 'Membuka pesan 1x lihat yang di-reply',
    usage: '.rvo (reply pesan 1x lihat)',
    example: '.rvo',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const quoted = m.quoted

    if (!quoted) {
        return m.reply(novaNoInput("Open VO", `Balas pesan 1x lihat (View Once) dengan perintah ini!\nContoh: Reply foto/video 1x lihat lalu ketik \`${m.prefix || "."}openvo\``))
    }

    const quotedMsg = quoted.message
    if (!quotedMsg) {
        return m.reply(novaEmpty("Open VO", "Tidak dapat membaca struktur pesan yang di-reply nih."))
    }

    const type = Object.keys(quotedMsg)[0]
    const content = quotedMsg[type]

    if (!content) {
        return m.reply(novaEmpty("Open VO", "Konten pesan yang di-reply tidak ditemukan atau kosong."))
    }

    if (!content.viewOnce) {
        return m.reply(novaError("Open VO", "Pesan yang kamu reply bukan pesan 1x lihat (View Once)!"))
    }
    try {
        let mediaType = null
        if (type.includes('image')) {
            mediaType = 'image'
        } else if (type.includes('video')) {
            mediaType = 'video'
        } else if (type.includes('audio')) {
            mediaType = 'audio'
        }

        if (!mediaType) {
            return m.reply(novaError("Open VO", "Tipe media tidak didukung! Hanya mendukung foto, video, atau audio."))
        }

        const stream = await downloadContentFromMessage(content, mediaType)
        
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }

        if (!buffer || buffer.length < 100) {
            return m.reply(novaError("Open VO", "Gagal mengunduh media 1x lihat. Media mungkin sudah kadaluarsa atau rusak."))
        }
        const targetQuoted = m.quoted ? m.quoted : m

        if (mediaType === 'image') {
            await sock.sendMedia(m.chat, buffer, null, targetQuoted, {
                type: 'image'
            })
        } else if (mediaType === 'video') {
            await sock.sendMedia(m.chat, buffer, null, targetQuoted, {
                type: 'video'
            })
        } else if (mediaType === 'audio') {
            await sock.sendMedia(m.chat, buffer, null, targetQuoted, {
                type: 'audio',
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            })
        }

    } catch (error) {
        return m.reply(novaError("Open VO", `Gagal membuka pesan 1x lihat: ${error.message}`))
    }
}

export { pluginConfig as config, handler }