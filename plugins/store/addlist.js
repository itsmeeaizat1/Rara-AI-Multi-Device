// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

import { getDatabase } from '../../src/lib/rara-database.js'
import axios from 'axios'
import FormData from 'form-data'

const pluginConfig = {
    name: 'addlist',
    alias: ["addlist"],
    category: 'owner',
    description: '➕ Tambah informasi toko baru (hanya di private chat)',
    usage: '.addlist <nama>|<isi>',
    example: '.addlist Syarat & Ketentuan|1. Pembelian tidak bisa dibatalkan;;2. Garansi 7 hari',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function uploadToCatbox(buffer, filename = 'file.jpg') {
    try {
        const form = new FormData()
        form.append('fileToUpload', buffer, { filename })
        form.append('reqtype', 'fileupload')
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        })
        return res.data?.startsWith('http') ? res.data : null
    } catch {
        return null
    }
}

async function handler(m, { sock }) {
    if (m.isGroup) {
        return m.reply(
            `🚫 *akses ditolak*\n\n` +
            `Untuk menjaga keamanan data 🛡️, penambahan informasi hanya dapat dilakukan di *private chat*.\n\n` +
            `Silakan chat bot secara langsung 📱, lalu ketik:\n` +
            `\`${m.prefix}addlist <nama>|<isi>\``
        )
    }

    const db = getDatabase()
    const text = m.text?.trim() || ''
    const pipeIdx = text.indexOf('|')

    if (pipeIdx === -1) {
        return m.reply(
            `➕ *tambah informasi toko*\n\n` +
            `📋 Format:\n` +
            `\`${m.prefix}addlist <nama>|<isi>\`\n\n` +
            `📌 *parameter:*\n` +
            `*nama* — Judul informasi (min. 2 karakter)\n` +
            `*isi* — Konten informasi (gunakan \`;;\` untuk baris baru)\n\n` +
            `📝 *contoh:*\n` +
            `\`${m.prefix}addlist Syarat & Ketentuan|1. Pembelian tidak bisa dibatalkan;;2. Garansi 7 hari;;3. Hubungi admin untuk klaim\`\n` +
            `\`${m.prefix}addlist Cara Order|1. Ketik .listproduk;;2. Pilih produk;;3. Ketik .beli <nomor>\`\n\n` +
            `🖼️ *tips:*\n` +
            `Kirim gambar/video terlebih dahulu, lalu reply media tersebut dengan command di atas untuk menambahkan media 📸\n` +
            `Gunakan \`;;\` untuk membuat baris baru dalam isi informasi ✍️\n` +
            `Informasi ini bisa dilihat semua orang melalui \`${m.prefix}list\` 👥`
        )
    }

    const name = text.substring(0, pipeIdx).trim()
    const content = text.substring(pipeIdx + 1).trim().replace(/;;/g, '\n')

    if (!name || name.length < 2) {
        return m.reply(raraWrap("addlist", `❌ *nama terlalu pendek.*\n\nMinimal 2 karakter diperlukan agar mudah dikenali 📝`))
    }
    if (!content || content.length < 3) {
        return m.reply(raraWrap("addlist", `❌ *isi informasi terlalu pendek.*\n\nMinimal 3 karakter diperlukan ✍️`))
    }

    let imageUrl = null
    let videoUrl = null

    const hasQuotedMedia = m.quoted?.isMedia
    const isDirectMedia = m.isMedia && (m.isImage || m.isVideo)

    if (hasQuotedMedia || isDirectMedia) {
        try {
            const buffer = hasQuotedMedia ? await m.quoted.download() : await m.download()
            if (buffer) {
                const isImage = m.quoted?.isImage || m.quoted?.type === 'imageMessage' || m.isImage
                const isVideo = m.quoted?.isVideo || m.quoted?.type === 'videoMessage' || m.isVideo
                const url = await uploadToCatbox(buffer, isVideo ? 'video.mp4' : 'image.jpg')
                if (url) {
                    if (isVideo) videoUrl = url
                    else imageUrl = url
                }
            }
        } catch (e) {
            console.error('[AddList] Upload error:', e.message)
        }
    }

    const lists = db.setting('storeLists') || []
    const newList = {
        id: `L${Date.now()}`,
        name,
        content,
        description: content.substring(0, 80).replace(/\n/g, ' '),
        image: imageUrl,
        video: videoUrl,
        createdAt: new Date().toISOString()
    }

    lists.push(newList)
    db.setting('storeLists', lists)
    let reply = `✅ *informasi ditambahkan*\n\n`
    reply += `🏷️ Nama: *${name}*\n`
    if (imageUrl) reply += `🖼️ Media: ✅ Gambar\n`
    if (videoUrl) reply += `🎬 Media: ✅ Video\n`
    reply += `📝 Isi:\n${content}\n\n`
    reply += `📋 _Lihat daftar: \`${m.prefix}list\`_\n`
    reply += `✏️ _Edit: \`${m.prefix}editlist ${lists.length}\`_`

    return await m.reply(raraWrap("addlist", reply))
}

export { pluginConfig as config, handler }
