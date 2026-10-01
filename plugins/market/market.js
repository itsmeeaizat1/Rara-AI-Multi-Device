// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * .market — Alfamart Market System (menu utama)
 *
 * Gabungan: katalog, keranjang, checkout, resi tracking, promo
 * Owner: tambah produk, stok, kategori, seed, invoice, resi, promo
 * User: belanja, lacak paket, cek riwayat
 */

import { raraWrap, toSC, raraBox } from "../../src/lib/rara-menu-style.js";
import {
  getProducts, getCategories, listByCategory,
  cartTotal, getCart, listInvoices,
  formatRupiah, formatStock, statusText,
  KATEGORI_TOKO, KURIR_LIST,
} from "../../src/lib/rara-toko2.js";

const pluginConfig = {
  name: "market",
  alias: ["market"],
  category: "market",
  description: "Alfamart Market System — menu utama toko lengkap",
  usage: ".market",
  example: ".market",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const jid = m.sender;
    const isOwner = m.isOwner;
    const p = m.prefix || ".";

    // Statistik toko
    const products = getProducts();
    const cats = getCategories();
    const cart = getCart(jid);
    const cartInfo = cartTotal(jid);
    const invoices = listInvoices();
    const pendingCount = invoices.filter((i) => i.status === "pending" || i.status === "paid" || i.status === "confirmed").length;

    const lines = [""];

    // Market info
    lines.push(toSC("Total Produk") + ": " + products.length);
    lines.push(toSC("Kategori") + ": " + cats.length + " (" + cats.join(", ") + ")");
    if (cartInfo.itemCount > 0) {
      lines.push(toSC("Keranjang") + ": " + cartInfo.itemCount + " item — " + formatRupiah(cartInfo.total));
    }
    if (isOwner && pendingCount > 0) {
      lines.push(toSC("Pending") + ": " + pendingCount + " invoice");
    }
    lines.push("");

    // User commands
    lines.push("📌 " + toSC("Belanja"));
    lines.push(p + "beli2 katalog [kategori] — lihat produk");
    lines.push(p + "beli2 cari <query> — cari produk");
    lines.push(p + "beli2 <kode> [qty] — tambah keranjang");
    lines.push(p + "beli2 keranjang — lihat isi keranjang");
    lines.push(p + "beli2 checkout — proses pesanan");
    lines.push(p + "beli2 metode — metode pembayaran");
    lines.push(p + "beli2 bayar <inv> <metode> — pilih bayar");
    lines.push(p + "beli2 lacak <resi> <kurir> — lacak paket");
    lines.push(p + "beli2 cek <inv> — cek invoice");
    lines.push(p + "beli2 riwayat — history belanja");
    lines.push("");
    lines.push("📌 " + toSC("PPOB (API DigiFlazz)"));
    lines.push(p + "ppob kategori — menu PPOB");
    lines.push(p + "ppob cari <keyword> — cari produk");
    lines.push(p + "ppob beli <sku> <nomor> — beli PPOB");
    lines.push(p + "ppob premium — app premium");
    lines.push(p + "ppob riwayat — history order");
    lines.push("");

    // Promo info
    const promoLines = [];
    for (const [key, cat] of Object.entries(KATEGORI_TOKO)) {
      promoLines.push(key + " (" + cat.label + ": " + cat.items.length + " produk)");
    }
    lines.push("📌 " + toSC("Kategori Tersedia"));
    for (const c of cats) {
      const label = KATEGORI_TOKO[c]?.label || c;
      const count = products.filter((p) => p.category === c).length;
      lines.push(c + " — " + label + " (" + count + ")");
    }
    lines.push("");

    // Owner commands
    if (isOwner) {
      lines.push("📌 " + toSC("Admin (Owner)"));
      lines.push(p + "toko2 add <nama>|<harga>|<stok>|<desc>|<kategori>");
      lines.push(p + "toko2 list [kategori] — daftar produk");
      lines.push(p + "toko2 stok <kode> <jumlah> — update stok");
      lines.push(p + "toko2 del <kode> — hapus produk");
      lines.push(p + "toko2 seed [all/<kategori>] — isi katalog template");
      lines.push(p + "toko2 invoices [status] — daftar invoice");
      lines.push(p + "toko2 confirm <inv> — konfirmasi bayar");
      lines.push(p + "toko2 done <inv> — selesaikan");
      lines.push(p + "toko2 resi <inv> <resi> <kurir> — input resi");
      lines.push(p + "toko2 track <resi> <kurir> — cek resi");
      lines.push(p + "toko2 promo add <kode>|<type>|<value>|<desc>|<min>");
      lines.push(p + "toko2 setkey <binderbyte_key> — set API track");
      lines.push("");
      lines.push(toSC("Kurir") + ": " + Object.keys(KURIR_LIST).length + " kurir support");
    }

    return m.reply(raraBox("MARKET ALFAMART", lines));
  } catch (error) {
    return m.reply(raraWrap("Market", toSC("Error") + ": " + error.message));
  }
}

export { pluginConfig as config, handler };
