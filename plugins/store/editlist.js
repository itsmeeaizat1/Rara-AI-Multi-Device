// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

import { getDatabase } from '../../src/lib/nova-database.js'
import axios from 'axios'
import FormData from 'form-data'

const pluginConfig = {
    name: 'editlist',
    alias: ["editlist"],
    category: 'owner',
    description: '✏️ Edit informasi toko (hanya di private chat)',
    usage: '.editlist <nomor> <field> <nilai>',
    example: '.editlist 1 isi Konten baru di sini',
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
            `Untuk menjaga keamanan data 🛡️, pengeditan informasi hanya dapat dilakukan di *private chat*.\n\n` +
            `Silakan chat bot secara langsung 📱`
        )
    }

    const db = getDatabase()
    const lists = db.setting('storeLists') || []

    if (lists.length === 0) {
        return m.reply(`*Belum Ada Informasi.*\n\nTambahkan informasi terlebih dahulu: \`${m.prefix}addlist\` ➕`)
    }

    const text = m.text?.trim() || ''
    const match = text.match(/^(\d+)\s+(nama|isi|deskripsi|gambar|video)\s*(.*)/i)

    if (!match) {
        return m.reply(
            `✏️ *edit informasi toko*\n\n` +
            `📋 Format: \`${m.prefix}editlist <nomor> <field> <nilai>\`\n\n` +
            `📌 *field yang bisa diedit:*\n` +
            `*nama* 🏷️ — Judul informasi\n` +
            `*isi* 📝 — Konten informasi (gunakan \`;;\` untuk baris baru)\n` +
            `*deskripsi* 📋 — Deskripsi singkat (preview di daftar)\n` +
            `*gambar* 🖼️ — Upload gambar baru (reply gambar)\n` +
            `*video* 🎬 — Upload video baru (reply video)\n\n` +
            `📝 *contoh:*\n` +
            `\`${m.prefix}editlist 1 isi Syarat baru: blablabla;;Ketentuan: blablabla\`\n` +
            `\`${m.prefix}editlist 1 nama FAQ Pembayaran\`\n` +
            `\`${m.prefix}editlist 1 gambar\` (reply gambar 🖼️)\n\n` +
            `_Gunakan \`;;\` untuk baris baru dalam isi_ ✍️`
        )
    }

    const idx = parseInt(match[1]) - 1
    const field = match[2].toLowerCase()
    let value = match[3]?.trim() || ''

    if (idx < 0 || idx >= lists.length) {
        return m.reply(novaWrap("editlist", `❌ *nomor tidak valid.*\n\nRentang: 1-${lists.length} 📋`))
    }

    const item = lists[idx]

    switch (field) {
        case 'nama': {
            if (!value || value.length < 2) return m.reply(novaWrap("editlist", `❌ *nama terlalu pendek.* Minimal 2 karakter 🏷️`))
            item.name = value
            break
        }
        case 'isi': {
            if (!value || value.length < 3) return m.reply(novaWrap("editlist", `❌ *isi terlalu pendek.* Minimal 3 karakter 📝`))
            item.content = value.replace(/;;/g, '\n')
            item.description = item.content.substring(0, 80).replace(/\n/g, ' ')
            break
        }
        case 'deskripsi': {
            item.description = value.replace(/;;/g, ' ')
            break
        }
        case 'gambar': {
            const hasMedia = m.quoted?.isMedia && (m.quoted?.isImage || m.quoted?.type === 'imageMessage')
            const isDirectImage = m.isImage
            if (!hasMedia && !isDirectImage) return m.reply(novaWrap("editlist", `🖼️ *reply atau kirim gambar baru.*\n\nKirim gambar lalu reply dengan command ini.`))
            try {
                const buffer = hasMedia ? await m.quoted.download() : await m.download()
                if (buffer) {
                    const url = await uploadToCatbox(buffer, 'image.jpg')
                    if (url) item.image = url
                    else return m.reply(novaWrap("editlist", `❌ *gagal mengunggah gambar.* Coba lagi nanti 🖼️`))
                }
            } catch {
                return m.reply(novaWrap("editlist", `❌ *gagal mengunggah gambar.* Coba lagi nanti 🖼️`))
            }
            break
        }
        case 'video': {
            const hasMedia = m.quoted?.isMedia && (m.quoted?.isVideo || m.quoted?.type === 'videoMessage')
            const isDirectVideo = m.isVideo
            if (!hasMedia && !isDirectVideo) return m.reply(novaWrap("editlist", `🎬 *reply atau kirim video baru.*\n\nKirim video lalu reply dengan command ini.`))
            try {
                const buffer = hasMedia ? await m.quoted.download() : await m.download()
                if (buffer) {
                    const url = await uploadToCatbox(buffer, 'video.mp4')
                    if (url) item.video = url
                    else return m.reply(novaWrap("editlist", `❌ *gagal mengunggah video.* Coba lagi nanti 🎬`))
                }
            } catch {
                return m.reply(novaWrap("editlist", `❌ *gagal mengunggah video.* Coba lagi nanti 🎬`))
            }
            break
        }
        default:
            return m.reply(novaWrap("editlist", `❌ *field tidak dikenali.*\n\nGunakan: nama, isi, deskripsi, gambar, video 📋`))
    }

    db.setting('storeLists', lists)
    let reply = `✅ *informasi diperbarui*\n\n`
    reply += `🏷️ Nama: *${item.name}*\n`
    if (field === 'isi') reply += `📝 Isi:\n${item.content}\n\n`
    if (field === 'gambar') reply += `🖼️ Gambar: ✅\n`
    if (field === 'video') reply += `🎬 Video: ✅\n`
    reply += `\n👀 _Lihat perubahan: \`${m.prefix}list\`_`

    return await m.reply(novaWrap("editlist", reply))
}

export { pluginConfig as config, handler }
