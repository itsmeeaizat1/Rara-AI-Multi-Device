// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import { uploadImage } from '../../src/lib/rara-uploader.js'
import te from '../../src/lib/rara-error.js'
import { serialize } from '../../src/lib/rara-serialize.js'
import { parsePhoneNumber } from 'awesome-phonenumber'
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
    name: 'qwa',
    alias: ["qwa"],
    category: 'tools',
    description: 'Membuat gambar quote WhatsApp',
    usage: '.qwa [teks]',
    example: '.qwa Halo Dunia',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true
}

async function getPp(sock, jid) {
    try {
        const url = await sock.profilePictureUrl(jid, 'image')
        return url
    } catch {
        return 'https://files.catbox.moe/ios0gb.jfif'
    }
}

async function handler(m, { sock }) {
    try {
    await m.react("🕒");
        let mainMsg = m
        let quoteMsg = null
        let textToQuote = m.args.join(' ')

        if (m.quoted && !textToQuote) {
            mainMsg = m.quoted
            textToQuote = mainMsg.body || ''
            
            if (sock.store && sock.store.loadMessage && mainMsg.id) {
                const originalMainMsg = await sock.store.loadMessage(m.chat, mainMsg.id)
                if (originalMainMsg) {
                    const serializedOriginal = await serialize(sock, originalMainMsg)
                    if (serializedOriginal && serializedOriginal.quoted) {
                        quoteMsg = serializedOriginal.quoted
                    }
                }
            }
        } else if (m.quoted && textToQuote) {
            mainMsg = m
            quoteMsg = m.quoted
        }

        if (!textToQuote && !mainMsg.isMedia) {
            { const __navText = `❌ *format salah*\n\nKirim perintah \`.qwa <teks>\` atau reply pesan orang lain dengan \`.qwa\`.`; return await m.reply( __navText, "qwa"); }
        }
        const msgTime = mainMsg.messageTimestamp ? new Date(mainMsg.messageTimestamp * 1000) : new Date()
        const timeStr = `${String(msgTime.getHours()).padStart(2, '0')}.${String(msgTime.getMinutes()).padStart(2, '0')}`
        let mainImage = null
        if (mainMsg.isMedia) {
            try {
                const buffer = await mainMsg.download()
                if (buffer) {
                    mainImage = await uploadImage(buffer)
                }
            } catch (err) {
                console.error("Gagal download/upload media utama:", err)
            }
        }

        let quotedImage = null
        if (quoteMsg && quoteMsg.isMedia) {
            try {
                const buffer = await quoteMsg.download()
                if (buffer) {
                    quotedImage = await uploadImage(buffer)
                }
            } catch (err) {
                console.error("Gagal download/upload media quoted:", err)
            }
        }

        const formatNumber = (numStr) => {
            try {
                const cleanNum = numStr.split('@')[0]
                const pn = parsePhoneNumber("+" + cleanNum)
                if (pn && pn.valid && pn.number && pn.number.international) {
                    return pn.number.international.replace(/-/g, ' ')
                }
            } catch (e) { console.error('[qwa.js]:', e.message); }
            return "+" + numStr.split('@')[0]
        }

        const payload = {
            sender_name:  `~ ${mainMsg.pushName}` || "~ User",
            sender_number: formatNumber(mainMsg.sender),
            sender_avatar: await getPp(sock, mainMsg.sender),
            message: textToQuote,
            time: timeStr,
            background: false
        }

        if (mainImage) payload.sender_image = mainImage

        if (quoteMsg) {
            payload.quoted = {
                name: `~ ${quoteMsg.pushName}` || "~ User",
                number: formatNumber(quoteMsg.sender),
                message: quoteMsg.body || ""
            }
            if (quotedImage) payload.quoted.image = quotedImage
        }
        const res = await axios.post('https://qwa.eeq.my.id/api/generate', payload, {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'arraybuffer'
        })
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
            image: Buffer.from(res.data),
            caption: `✅ Berhasil membuat quote WhatsApp!`
        }, { quoted: m })
        await m.reply(mediaInfoCaption({ header: "Quote WhatsApp", fields: [
            { label: "Input", value: (textToQuote || "Media").slice(0, 60) + (textToQuote && textToQuote.length > 60 ? "..." : "") },
            { label: "Pengirim", value: String(mainMsg.pushName || "User") },
            { label: "Engine", value: "QWA API" },
            { label: "Hasil", value: "Gambar" },
            { label: "Ukuran", value: (Buffer.from(res.data).length / 1024).toFixed(1) + " KB" },
        ] }))
    } catch (error) {
    await m.react("❌");
        console.error("Error QWA:", error)
        m.reply(raraWrap("qwa", `❌ *gagal membuat quote*\n\nTerjadi kesalahan atau API sedang bermasalah.`))
    }
}

export { pluginConfig as config, handler }
