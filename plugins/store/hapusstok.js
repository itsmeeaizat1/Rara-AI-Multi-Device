// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'

const pluginConfig = {
    name: 'hapusstok',
    alias: ['delstok', 'delstock', 'deletestok'],
    category: 'store',
    description: '🗑️ Hapus stok item dari produk',
    usage: '.hapusstok <nomor_produk> <nomor_item>',
    example: '.hapusstok 1 3',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const products = db.setting('storeProducts') || []

    if (products.length === 0) {
        return m.reply( `📭 *ʙᴇʟᴜᴍ ᴀᴅᴀ ᴘʀᴏᴅᴜᴋ.*\n\nTambahkan produk terlebih dahulu: \`${m.prefix}addproduk\` ➕`, "hapusstok")
    }

    const args = m.text?.trim().split(/\s+/) || []
    const productNo = parseInt(args[0]) - 1
    const itemNo = parseInt(args[1]) - 1

    if (args.length < 2 || isNaN(productNo) || isNaN(itemNo)) {
        return m.reply( `🗑️ *ʜᴀᴘᴜꜱ ꜱᴛᴏᴋ*\n\n` +
            `Format: \`${m.prefix}hapusstok <nomor_produk> <nomor_item>\`\n\n` +
            `📝 *ᴄᴏɴᴛᴏʜ:*\n` +
            `\`${m.prefix}hapusstok 1 3\` — Hapus item ke-3 dari produk ke-1\n\n` +
            `📋 Lihat nomor item: \`${m.prefix}liststok <nomor_produk>\``, "hapusstok")
    }

    if (productNo < 0 || productNo >= products.length) {
        return m.reply(claraWrap("Nomor produk tidak valid.", `❌ *ɴᴏᴍᴏʀ ᴘʀᴏᴅᴜᴋ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ.*\n\nRentang: 1-${products.length} 📋`))
    }

    const product = products[productNo]

    if (product.type === 'fisik') {
        const reduceCount = parseInt(args[1])
        if (isNaN(reduceCount) || reduceCount <= 0) {
            return m.reply( `📦 *ᴘʀᴏᴅᴜᴋ ꜰɪꜱɪᴋ*\n\n` +
                `Untuk mengurangi stok fisik, gunakan:\n` +
                `\`${m.prefix}editproduk ${productNo + 1} stok <jumlah_baru>\`\n\n` +
                `Stok saat ini: *${product.stock === -1 ? '♾️ Unlimited' : product.stock + ' pcs'}*`, "hapusstok")
        }
        if (product.stock !== -1) {
            product.stock = Math.max(0, product.stock - reduceCount)
            db.setting('storeProducts', products)
            await m.react('✅')
            return m.reply( `📦 *ꜱᴛᴏᴋ ꜰɪꜱɪᴋ ᴅɪᴋᴜʀᴀɴɢɪ*\n\n` +
                `🏷️ Produk: *${product.name}*\n` +
                `➖ Dikurangi: *${reduceCount} pcs*\n` +
                `📊 Sisa stok: *${product.stock} pcs*`, "hapusstok")
        }
        return m.reply( `♾️ *ꜱᴛᴏᴋ ᴜɴʟɪᴍɪᴛᴇᴅ ᴛɪᴅᴀᴋ ʙɪꜱᴀ ᴅɪᴋᴜʀᴀɴɢɪ.*\n\nUbah tipe stok terlebih dahulu: \`${m.prefix}editproduk ${productNo + 1} stok <jumlah>\``, "hapusstok")
    }

    const stockItems = product.stockItems || []

    if (itemNo < 0 || itemNo >= stockItems.length) {
        return m.reply( `❌ *ɴᴏᴍᴏʀ ɪᴛᴇᴍ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ.*\n\nRentang: 1-${stockItems.length}\n\n📋 Lihat daftar: \`${m.prefix}liststok ${productNo + 1}\``, "hapusstok")
    }

    const deleted = stockItems.splice(itemNo, 1)[0]
    product.stock = stockItems.length
    db.setting('storeProducts', products)

    await m.react('✅')
    return m.reply( `🗑️ *ꜱᴛᴏᴋ ᴅɪʜᴀᴘᴜꜱ*\n\n` +
        `🏷️ Produk: *${product.name}*\n` +
        `🔑 Item: \`${deleted.detail.replace(/\n/g, ' ').substring(0, 50)}\`\n` +
        `📊 Sisa stok: *${stockItems.length}* akun`, "hapusstok")
}

export { pluginConfig as config, handler }
