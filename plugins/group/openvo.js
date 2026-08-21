// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { downloadContentFromMessage } from 'nova'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "openvo",
    alias: ["openvo", "rvo2", "viewonce"],
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
        await sendReplyWithNav(sock, m, `❌ *Gagal*\n\n` +
            `Balas pesan 1x lihat dengan perintah ini!\n` +
            `Gunakan: \`${m.prefix}openvo\` (reply pesan 1x lihat)`, "rvo")
        return
    }

    const quotedMsg = quoted.message
    if (!quotedMsg) {
        await sendReplyWithNav(sock, m, `❌ *Pesan Tidak Ditemukan*\n\n` +
            `Tidak dapat membaca pesan yang di-reply.`, "rvo")
        return
    }

    const type = Object.keys(quotedMsg)[0]
    const content = quotedMsg[type]

    if (!content) {
        await sendReplyWithNav(sock, m, `❌ *Konten Tidak Ditemukan*\n\n` +
            `Konten pesan tidak dapat dibaca.`, "rvo")
        return
    }

    if (!content.viewOnce) {
        await m.reply(claraWrap("openvo", `❌ *Bukan Viewonce*\n\n` +
            `Pesan yang di-reply bukan pesan 1x lihat!\n` +
            `Balas pesan dengan ikon 1x lihat (👁️).`))
        return
    }

    await m.react('🕐')

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
            m.reply(claraWrap("Rvo", `Tipenya gak didukung, hanya support image, video, audio`))
            return
        }

        const stream = await downloadContentFromMessage(content, mediaType)
        
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }

        if (!buffer || buffer.length < 100) {
            await sendReplyWithNav(sock, m, `❌ *Gagal Mengunduh*\n\n` +
                `Tidak dapat mengunduh media.\n` +
                `Media mungkin sudah kadaluarsa.`, "rvo")
            return
        }
        const quoted = m.quoted ? m.quoted : m

        if (mediaType === 'image') {
            await sock.sendMedia(m.chat, buffer, null, quoted, {
                type: 'image'
            })
        } else if (mediaType === 'video') {
            await sock.sendMedia(m.chat, buffer, null, quoted, {
                type: 'video'
            })
        } else if (mediaType === 'audio') {
            await sock.sendMedia(m.chat, buffer, null, quoted, {
                type: 'audio',
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            })
        }

    } catch (error) {
        await m.reply(
            `❌ *Error*\n\n` +
            `Gagal membuka pesan 1x lihat.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }