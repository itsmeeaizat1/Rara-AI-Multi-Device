// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from '../../src/lib/rara-database.js'

const pluginConfig = {
    name: 'hapusstok',
    alias: ["hapusstok"],
    category: 'owner',
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
        return m.reply( `📭 *belum ada produk.*\n\nTambahkan produk terlebih dahulu: \`${m.prefix}addproduk\` ➕`, "hapusstok")
    }

    const args = m.text?.trim().split(/\s+/) || []
    const productNo = parseInt(args[0]) - 1
    const itemNo = parseInt(args[1]) - 1

    if (args.length < 2 || isNaN(productNo) || isNaN(itemNo)) {
        return m.reply( raraWrap("hapusstok", `🗑️ *hapus stok*\n\n` +
            `Format: \`${m.prefix}hapusstok <nomor_produk> <nomor_item>\`\n\n` +
            `📝 *contoh:*\n` +
            `\`${m.prefix}hapusstok 1 3\` — Hapus item ke-3 dari produk ke-1\n\n` +
            `📋 Lihat nomor item: \`${m.prefix}liststok <nomor_produk>\``, "guide"), "hapusstok")
    }

    if (productNo < 0 || productNo >= products.length) {
        return m.reply(raraWrap("Nomor produk tidak valid.", `Rentang: 1-${products.length} 📋`))
    }

    const product = products[productNo]

    if (product.type === 'fisik') {
        const reduceCount = parseInt(args[1])
        if (isNaN(reduceCount) || reduceCount <= 0) {
            return m.reply( `📦 *produk fisik*\n\n` +
                `Untuk mengurangi stok fisik, gunakan:\n` +
                `\`${m.prefix}editproduk ${productNo + 1} stok <jumlah_baru>\`\n\n` +
                `Stok saat ini: *${product.stock === -1 ? '♾️ Unlimited' : product.stock + ' pcs'}*`, "hapusstok")
        }
        if (product.stock !== -1) {
            product.stock = Math.max(0, product.stock - reduceCount)
            db.setting('storeProducts', products)
            return m.reply( `📦 *stok fisik dikurangi*\n\n` +
                `🏷️ Produk: *${product.name}*\n` +
                `➖ Dikurangi: *${reduceCount} pcs*\n` +
                `📊 Sisa stok: *${product.stock} pcs*`, "hapusstok")
        }
        return m.reply( `♾️ *stok unlimited tidak bisa dikurangi.*\n\nUbah tipe stok terlebih dahulu: \`${m.prefix}editproduk ${productNo + 1} stok <jumlah>\``, "hapusstok")
    }

    const stockItems = product.stockItems || []

    if (itemNo < 0 || itemNo >= stockItems.length) {
        return m.reply( `❌ *nomor item tidak valid.*\n\nRentang: 1-${stockItems.length}\n\n📋 Lihat daftar: \`${m.prefix}liststok ${productNo + 1}\``, "hapusstok")
    }

    const deleted = stockItems.splice(itemNo, 1)[0]
    product.stock = stockItems.length
    db.setting('storeProducts', products)
    return m.reply( `🗑️ *stok dihapus*\n\n` +
        `🏷️ Produk: *${product.name}*\n` +
        `🔑 Item: \`${deleted.detail.replace(/\n/g, ' ').substring(0, 50)}\`\n` +
        `📊 Sisa stok: *${stockItems.length}* akun`, "hapusstok")
}

export { pluginConfig as config, handler }
