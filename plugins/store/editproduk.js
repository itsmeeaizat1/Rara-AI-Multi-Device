// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import { getDatabase } from '../../src/lib/nova-database.js'
import axios from 'axios'
import FormData from 'form-data'

const pluginConfig = {
    name: 'editproduk',
    alias: ['editproduct'],
    category: 'store',
    description: '✏️ Edit produk toko (hanya di private chat)',
    usage: '.editproduk <nomor> <field> <nilai>',
    example: '.editproduk 1 harga 30000',
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
            `🚫 *ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ*\n\n` +
            `Untuk menjaga privasi 🛡️, pengeditan produk hanya dapat dilakukan di *ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ*.\n\n` +
            `Silakan chat bot secara langsung 📱`
        )
    }

    const db = getDatabase()
    const products = db.setting('storeProducts') || []

    if (products.length === 0) {
        return m.reply(`📭 *ʙᴇʟᴜᴍ ᴀᴅᴀ ᴘʀᴏᴅᴜᴋ.*\n\nTambahkan produk terlebih dahulu: \`${m.prefix}addproduk\` ➕`)
    }

    const text = m.text?.trim() || ''
    const match = text.match(/^(\d+)\s+(nama|harga|diskon|stok|deskripsi|detail|gambar|video|tipe)\s*(.*)/i)

    if (!match) {
        return m.reply(
            `✏️ *ᴇᴅɪᴛ ᴘʀᴏᴅᴜᴋ*\n\n` +
            `📋 Format: \`${m.prefix}editproduk <nomor> <field> <nilai>\`\n\n` +
            `📌 *ꜰɪᴇʟᴅ ʏᴀɴɢ ʙɪꜱᴀ ᴅɪᴇᴅɪᴛ:*\n` +
            `*ɴᴀᴍᴀ* 🏷️ — Nama produk\n` +
            `*ʜᴀʀɢᴀ* 💰 — Harga jual (angka)\n` +
            `*ᴅɪꜱᴋᴏɴ* 🏷️ — Harga asli/coret (angka, 0 untuk hapus)\n` +
            `*ꜱᴛᴏᴋ* 📊 — Jumlah stok atau \`unlimited\`\n` +
            `*ᴛɪᴘᴇ* 🔑📦 — \`digital\` atau \`fisik\`\n` +
            `*ᴅᴇꜱᴋʀɪᴘꜱɪ* 📝 — Deskripsi produk\n` +
            `*ᴅᴇᴛᴀɪʟ* 🔒 — Info rahasia (dikirim setelah beli)\n` +
            `*ɢᴀᴍʙᴀʀ* 🖼️ — Upload gambar baru (reply gambar)\n` +
            `*ᴠɪᴅᴇᴏ* 🎬 — Upload video baru (reply video)\n\n` +
            `📝 *ᴄᴏɴᴛᴏʜ:*\n` +
            `\`${m.prefix}editproduk 1 harga 30000\`\n` +
            `\`${m.prefix}editproduk 1 diskon 40000\`\n` +
            `\`${m.prefix}editproduk 1 tipe fisik\`\n` +
            `\`${m.prefix}editproduk 1 nama Netflix Premium\`\n` +
            `\`${m.prefix}editproduk 1 deskripsi Akun sharing 1 bulan\`\n` +
            `\`${m.prefix}editproduk 1 gambar\` (reply gambar 🖼️)\n\n` +
            `🏷️ _Harga diskon akan ditampilkan sebagai ~~harga asli~~ di katalog_`
        )
    }

    const idx = parseInt(match[1]) - 1
    const field = match[2].toLowerCase()
    let value = match[3]?.trim() || ''

    if (idx < 0 || idx >= products.length) {
        return m.reply(claraWrap("editproduk", `❌ *ɴᴏᴍᴏʀ ᴘʀᴏᴅᴜᴋ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ.*\n\nRentang: 1-${products.length} 📋`))
    }

    const product = products[idx]

    switch (field) {
        case 'nama': {
            if (!value || value.length < 2) return m.reply(claraWrap("editproduk", `❌ *ɴᴀᴍᴀ ᴛᴇʀʟᴀʟᴜ ᴘᴇɴᴅᴇᴋ.* Minimal 2 karakter 🏷️`))
            product.name = value
            break
        }
        case 'harga': {
            const price = parseInt(value)
            if (isNaN(price) || price < 1000) return m.reply(claraWrap("editproduk", `❌ *ʜᴀʀɢᴀ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ.* Minimal Rp 1.000 💰`))
            product.price = price
            break
        }
        case 'diskon': {
            const origPrice = parseInt(value)
            if (isNaN(origPrice) || origPrice === 0) {
                product.originalPrice = null
            } else {
                if (origPrice <= product.price) return m.reply(claraWrap("editproduk", `❌ *ʜᴀʀɢᴀ ᴅɪꜱᴋᴏɴ ʜᴀʀᴜꜱ ʟᴇʙɪʜ ʙᴇꜱᴀʀ ᴅᴀʀɪ ʜᴀʀɢᴀ ᴊᴜᴀʟ.*\n\nHarga jual saat ini: Rp ${product.price.toLocaleString('id-ID')} 💰`))
                product.originalPrice = origPrice
            }
            break
        }
        case 'stok': {
            product.stock = value.toLowerCase() === 'unlimited' ? -1 : parseInt(value)
            if (isNaN(product.stock)) return m.reply(`❌ *ꜱᴛᴏᴋ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ.* Gunakan angka atau \`unlimited\` 📊`)
            break
        }
        case 'tipe': {
            const newType = value.toLowerCase()
            if (newType !== 'digital' && newType !== 'fisik') {
                return m.reply(`❌ *ᴛɪᴘᴇ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ.* Gunakan \`digital\` 🔑 atau \`fisik\` 📦`)
            }
            if (newType === 'fisik' && product.type === 'digital' && product.stockItems?.length > 0) {
                return m.reply(
                    `⚠️ *ᴛɪᴅᴀᴋ ʙɪꜱᴀ ᴍᴇɴɢᴜʙᴀʜ ᴋᴇ ꜰɪꜱɪᴋ*\n\n` +
                    `Produk ini memiliki *${product.stockItems.length}* data akun 🔑\n` +
                    `Hapus semua stock items terlebih dahulu sebelum mengubah tipe ke Fisik.\n\n` +
                    `🗑️ Hapus semua: \`${m.prefix}editproduk ${idx + 1} stok 0\``
                )
            }
            product.type = newType
            if (newType === 'fisik' && !product.stock) product.stock = 0
            break
        }
        case 'deskripsi': {
            product.description = value.replace(/;;/g, '\n')
            break
        }
        case 'detail': {
            product.detail = value.replace(/;;/g, '\n')
            break
        }
        case 'gambar': {
            const hasMedia = m.quoted?.isMedia && (m.quoted?.isImage || m.quoted?.type === 'imageMessage')
            const isDirectImage = m.isImage
            if (!hasMedia && !isDirectImage) return m.reply(claraWrap("editproduk", `🖼️ *ʀᴇᴘʟʏ ᴀᴛᴀᴜ ᴋɪʀɪᴍ ɢᴀᴍʙᴀʀ ʙᴀʀᴜ.*\n\nKirim gambar lalu reply dengan command ini.`))
            await m.react("🕒")
            try {
                const buffer = hasMedia ? await m.quoted.download() : await m.download()
                if (buffer) {
                    const url = await uploadToCatbox(buffer, 'image.jpg')
                    if (url) product.image = url
                    else return m.reply(claraWrap("editproduk", `❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴɢɢᴀʜ ɢᴀᴍʙᴀʀ.* Coba lagi nanti 🖼️`))
                }
            } catch {
                return m.reply(claraWrap("editproduk", `❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴɢɢᴀʜ ɢᴀᴍʙᴀʀ.* Coba lagi nanti 🖼️`))
            }
            break
        }
        case 'video': {
            const hasMedia = m.quoted?.isMedia && (m.quoted?.isVideo || m.quoted?.type === 'videoMessage')
            const isDirectVideo = m.isVideo
            if (!hasMedia && !isDirectVideo) return m.reply(claraWrap("editproduk", `🎬 *ʀᴇᴘʟʏ ᴀᴛᴀᴜ ᴋɪʀɪᴍ ᴠɪᴅᴇᴏ ʙᴀʀᴜ.*\n\nKirim video lalu reply dengan command ini.`))
            await m.react("🕒")
            try {
                const buffer = hasMedia ? await m.quoted.download() : await m.download()
                if (buffer) {
                    const url = await uploadToCatbox(buffer, 'video.mp4')
                    if (url) product.video = url
                    else return m.reply(claraWrap("editproduk", `❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴɢɢᴀʜ ᴠɪᴅᴇᴏ.* Coba lagi nanti 🎬`))
                }
            } catch {
                return m.reply(claraWrap("editproduk", `❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴɢɢᴀʜ ᴠɪᴅᴇᴏ.* Coba lagi nanti 🎬`))
            }
            break
        }
        default:
            return m.reply(claraWrap("editproduk", `❌ *ꜰɪᴇʟᴅ ᴛɪᴅᴀᴋ ᴅɪᴋᴇɴᴀʟɪ.*\n\nGunakan: nama, harga, diskon, stok, tipe, deskripsi, detail, gambar, video 📋`))
    }

    db.setting('storeProducts', products)
    await m.react('✅')

    const typeIcon = product.type === 'fisik' ? '📦' : '🔑'
    const typeLabel = product.type === 'fisik' ? 'Fisik' : 'Digital'

    let reply = `✅ *ᴘʀᴏᴅᴜᴋ ᴅɪᴘᴇʀʙᴀʀᴜɪ*\n\n`
    reply += `🏷️ Nama: *${product.name}*\n`
    reply += `💰 Harga: *Rp ${product.price.toLocaleString('id-ID')}*`
    if (product.originalPrice) reply += ` ~~Rp ${product.originalPrice.toLocaleString('id-ID')}~~`
    reply += `\n`
    reply += `${typeIcon} Tipe: *${typeLabel}*\n`
    reply += `📊 Stok: *${product.stock === -1 ? '♾️ Unlimited' : product.stock}*\n`
    if (field === 'gambar') reply += `🖼️ Gambar: ✅\n`
    if (field === 'video') reply += `🎬 Video: ✅\n`
    reply += `\n👀 _Lihat perubahan: \`${m.prefix}listproduk\`_`

    return await m.reply(claraWrap("editproduk", reply))
}

export { pluginConfig as config, handler }
