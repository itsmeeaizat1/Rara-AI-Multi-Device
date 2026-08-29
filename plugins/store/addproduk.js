// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

import { getDatabase } from '../../src/lib/nova-database.js'
import axios from 'axios'
import FormData from 'form-data'

const pluginConfig = {
    name: 'addproduk',
    alias: ["addproduk"],
    category: 'store',
    description: '➕ Tambah produk baru ke toko (hanya di private chat)',
    usage: '.addproduk <nama>|<harga>|<tipe>|<stok>|<deskripsi>',
    example: '.addproduk Spotify Premium|25000|digital|10|Akun Premium 1 Bulan',
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
            `Untuk menjaga privasi dan keamanan data produk 🛡️, penambahan produk hanya dapat dilakukan di *ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ*.\n\n` +
            `Silakan chat bot secara langsung 📱, lalu ketik:\n` +
            `\`${m.prefix}addproduk <nama>|<harga>|<tipe>|<stok>|<deskripsi>\``
        )
    }

    const db = getDatabase()
    const text = m.text?.trim() || ''
    const parts = text.split('|').map(p => p.trim())

    if (parts.length < 2) {
        return m.reply(
            `➕ *ᴛᴀᴍʙᴀʜ ᴘʀᴏᴅᴜᴋ ʙᴀʀᴜ*\n\n` +
            `📋 Format:\n` +
            `\`${m.prefix}addproduk <nama>|<harga>|<tipe>|<stok>|<deskripsi>\`\n\n` +
            `📌 *ᴘᴀʀᴀᴍᴇᴛᴇʀ:*\n` +
            `*ɴᴀᴍᴀ* — Nama produk (min. 2 karakter)\n` +
            `*ʜᴀʀɢᴀ* — Harga dalam Rupiah (min. 1.000)\n` +
            `*ᴛɪᴘᴇ* — \`digital\` 🔑 atau \`fisik\` 📦 (opsional, default: digital)\n` +
            `*ꜱᴛᴏᴋ* — Jumlah stok atau \`unlimited\` (opsional, default: 999)\n` +
            `*ᴅᴇꜱᴋʀɪᴘꜱɪ* — Deskripsi singkat (opsional)\n\n` +
            `🔑 *ᴅɪɢɪᴛᴀʟ* = Produk berupa akun/key/data unik per item\n` +
            `📦 *ꜰɪꜱɪᴋ* = Produk berupa barang, stok berupa jumlah\n\n` +
            `📝 *ᴄᴏɴᴛᴏʜ:*\n` +
            `\`${m.prefix}addproduk Spotify Premium|25000|digital|10|Akun Premium 1 Bulan\`\n` +
            `\`${m.prefix}addproduk Baju Kaos|65000|fisik|8|Kaos Polos Cotton 30s\`\n` +
            `\`${m.prefix}addproduk Netflix|35000|digital|unlimited|Sharing Account\`\n\n` +
            `🖼️ *ᴛɪᴘꜱ:*\n` +
            `Kirim gambar/video terlebih dahulu, lalu reply media tersebut dengan command di atas untuk menambahkan thumbnail 📸\n` +
            `Untuk produk *ᴅɪɢɪᴛᴀʟ*, gunakan \`${m.prefix}addstok\` setelah produk dibuat untuk menambahkan data akun/key 🔑\n` +
            `Untuk produk *ꜰɪꜱɪᴋ*, stok otomatis diatur dari angka yang dimasukkan 📦\n` +
            `Harga diskon bisa diatur nanti dengan \`${m.prefix}editproduk\` 🏷️`
        )
    }

    const name = parts[0]
    const price = parseInt(parts[1])
    const typeStr = (parts[2] || 'digital').toLowerCase()
    const stockStr = parts[3] || ''
    const description = (parts[4] || '').replace(/;;/g, '\n')

    if (!name || name.length < 2) {
        return m.reply(claraWrap("addproduk", `❌ *ɴᴀᴍᴀ ᴘʀᴏᴅᴜᴋ ᴛᴇʀʟᴀʟᴜ ᴘᴇɴᴅᴇᴋ.*\n\nMinimal 2 karakter diperlukan agar mudah dikenali pelanggan 📝`))
    }
    if (isNaN(price) || price < 1000) {
        return m.reply(claraWrap("addproduk", `❌ *ʜᴀʀɢᴀ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ.*\n\nHarga minimal *Rp 1.000* 💰 Pastikan Anda memasukkan angka yang benar.`))
    }

    const type = typeStr === 'fisik' || typeStr === 'physical' ? 'fisik' : 'digital'
    const stock = stockStr.toLowerCase() === 'unlimited' ? -1 : (parseInt(stockStr) || 999)

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
            console.error('[AddProduk] Upload error:', e.message)
        }
    }

    const products = db.setting('storeProducts') || []
    const newProduct = {
        id: `P${Date.now()}`,
        name,
        price,
        originalPrice: null,
        type,
        stock,
        stockItems: [],
        description,
        detail: '',
        image: imageUrl,
        video: videoUrl,
        createdAt: new Date().toISOString()
    }

    products.push(newProduct)
    db.setting('storeProducts', products)
    const typeIcon = type === 'digital' ? '🔑' : '📦'
    const typeLabel = type === 'digital' ? 'Digital' : 'Fisik'

    let reply = `✅ *ᴘʀᴏᴅᴜᴋ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ*\n\n`
    reply += `🏷️ Nama: *${name}*\n`
    reply += `💰 Harga: *Rp ${price.toLocaleString('id-ID')}*\n`
    reply += `${typeIcon} Tipe: *${typeLabel}*\n`
    reply += `📊 Stok: *${stock === -1 ? 'Unlimited ♾️' : stock}*\n`
    if (description) reply += `📝 Deskripsi: _${description}_\n`
    if (imageUrl) reply += `🖼️ Thumbnail: ✅ Gambar\n`
    if (videoUrl) reply += `🎬 Thumbnail: ✅ Video\n`
    reply += `\n📌 *ʟᴀɴɢᴋᴀʜ ꜱᴇʟᴀɴᴊᴜᴛɴʏᴀ:*\n`

    if (type === 'digital') {
        reply += `1️⃣ Tambahkan data akun/key: \`${m.prefix}addstok ${products.length}|<detail>\`\n`
        reply += `2️⃣ Atau import dari file .txt: \`${m.prefix}addstok ${products.length}\` (reply file 📄)\n`
    } else {
        reply += `1️⃣ Stok sudah diatur otomatis (${stock} pcs) 📦\n`
        reply += `2️⃣ Tambah stok: \`${m.prefix}editproduk ${products.length} stok <jumlah>\`\n`
    }
    reply += `3️⃣ Lihat produk: \`${m.prefix}listproduk\` 🛍️\n\n`
    reply += `_Produk ini akan terlihat oleh pelanggan melalui \`${m.prefix}listproduk\`_ 🎉`

    return await m.reply(claraWrap("addproduk", reply))
}

export { pluginConfig as config, handler }
