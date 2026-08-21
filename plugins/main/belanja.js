// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

/**
 * .belanja — sistem belanja untuk user (lihat katalog, pesan, cek pesanan).
 */

import {
  listProducts,
  getProduct,
  createOrder,
  getOrdersByBuyer,
  listCategories,
  getStoreConfig,
  formatRupiah,
  formatDate,
} from "../../src/lib/nova-store.js";

const pluginConfig = {
  name: "belanja",
  alias: ["belanja", "shopmain", "toko3"],
  category: "main",
  description: "Lihat katalog dan pesan produk dari toko",
  usage: ".belanja <perintah> [args]",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function stockText(stock) {
  return stock === -1 ? "Unlimited" : String(stock);
}

function statusText(s) {
  switch (s) {
    case "pending": return "Menunggu konfirmasi";
    case "confirmed": return "Diterima - menunggu pembayaran";
    case "rejected": return "Ditolak";
    case "shipped": return "Dikirim";
    case "done": return "Selesai";
    default: return s;
  }
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const action = (args[0] || "").toLowerCase();
  const jid = m.key.remoteJid;
  const sender = m.key.participant || jid;

  // ── KATALOG ─────────────────────────────────────────────────────────────

  if (action === "katalog" || action === "list" || action === "all" || !action) {
    const products = listProducts();
    if (products.length === 0) return m.reply(claraWrap("belanja", "Maaf, toko belum punya produk."));

    const config = getStoreConfig();
    let txt = "╔┈┈「 " + (config.storeName || "NOVA STORE") + " 」╎❏\n";
    txt += "╚┈┈❖\n";
    if (config.storeDesc) txt += config.storeDesc + "\n\n";

    for (const p of products) {
      txt += p.id + " — " + p.name + "\n";
      txt += "  " + formatRupiah(p.price) + " | Stok: " + stockText(p.stock) + " | " + p.category + "\n";
      if (p.desc) txt += "  " + p.desc + "\n";
      txt += "\n";
    }
    txt += "Cara pesan: .belanja pesan <id> [qty] [catatan]\n";
    txt += "Cari: .belanja cari <kata kunci>";
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── DETAIL PRODUK ───────────────────────────────────────────────────────

  if (action === "detail" || action === "produk") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Belanja", "Format: .belanja detail <id produk>"));

    const product = getProduct(id);
    if (!product) return m.reply("Produk tidak ditemukan: " + id);

    let txt = "╔┈┈「 DETAIL PRODUK 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    txt += "ID: " + product.id + "\n";
    txt += "Nama: *" + product.name + "*\n";
    txt += "Harga: *" + formatRupiah(product.price) + "*\n";
    txt += "Kategori: " + product.category + "\n";
    txt += "Stok: " + stockText(product.stock) + "\n";
    txt += "Terjual: " + (product.sold || 0) + "\n";
    if (product.desc) txt += "Deskripsi: " + product.desc + "\n";
    txt += "\nPesan: .belanja pesan " + product.id;
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── CARI ────────────────────────────────────────────────────────────────

  if (action === "cari" || action === "search") {
    const query = args.slice(1).join(" ").trim();
    if (!query) return m.reply(claraWrap("Belanja", "Format: .belanja cari <kata kunci>"));

    const results = listProducts().filter(
      (p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.desc.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length === 0) return m.reply("Tidak ditemukan produk untuk: " + query);

    let txt = "Hasil pencarian: " + query + "\n\n";
    for (const p of results) {
      txt += p.id + " — " + p.name + " (" + formatRupiah(p.price) + ")\n";
    }
    txt += "\nPesan: .belanja pesan <id>";
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── KATEGORI ────────────────────────────────────────────────────────────

  if (action === "kategori") {
    const cats = listCategories();
    const products = listProducts();

    let txt = "╔┈┈「 KATEGORI 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    for (const cat of cats) {
      const count = products.filter((p) => p.category === cat).length;
      txt += cat + " (" + count + " produk)\n";
    }
    txt += "\nLihat: .belanja katalog <nama kategori>";
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── PESAN ───────────────────────────────────────────────────────────────

  if (action === "pesan" || action === "order" || action === "beli") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Belanja", "Format: .belanja pesan <id produk> [qty] [catatan]"));

    const product = getProduct(id);
    if (!product) return m.reply("Produk tidak ditemukan: " + id);

    const qty = parseInt(args[2]) || 1;
    const note = args.slice(3).join(" ").trim();

    const result = createOrder({
      productId: product.id,
      buyerJid: jid,
      buyerName: m.pushName || sender,
      qty,
      note,
    });

    if (result.error) return m.reply(result.error);

    const order = result.order;
    let txt = "╔┈┈「 PESANAN DIBUAT 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    txt += "ID Pesanan: " + order.id + "\n";
    txt += "Produk: " + order.productName + "\n";
    txt += "Jumlah: " + order.qty + "x\n";
    txt += "Total: *" + formatRupiah(order.total) + "*\n";
    txt += "Status: Menunggu konfirmasi\n";
    if (note) txt += "Catatan: " + note + "\n";
    txt += "\nPesanan akan dikonfirmasi oleh penjual.\n";
    txt += "Cek status: .belanja cek " + order.id;
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── CEK PESANAN ──────────────────────────────────────────────────────────

  if (action === "cek" || action === "pesanan") {
    const id = args[1];

    if (id) {
      // cek spesifik
      const orders = getOrdersByBuyer(jid);
      const order = orders.find((o) => o.id.toLowerCase() === id.toLowerCase());
      if (!order) return m.reply("Pesanan tidak ditemukan: " + id);

      let txt = "╔┈┈「 DETAIL PESANAN 」╎❏\n";
      txt += "╚┈┈❖\n\n";
      txt += "ID: " + order.id + "\n";
      txt += "Produk: " + order.productName + "\n";
      txt += "Jumlah: " + order.qty + "x\n";
      txt += "Total: " + formatRupiah(order.total) + "\n";
      txt += "Status: " + statusText(order.status) + "\n";
      txt += "Tanggal: " + formatDate(order.createdAt) + "\n";
      if (order.note) txt += "Catatan: " + order.note + "\n";
      if (order.sellerNote) txt += "Catatan penjual: " + order.sellerNote + "\n";
      return await m.reply(claraWrap("belanja", txt));
    }

    // cek semua pesanan buyer
    const orders = getOrdersByBuyer(jid);
    if (orders.length === 0) return m.reply(claraWrap("belanja", "Kamu belum punya pesanan. Ketik .belanja katalog untuk lihat produk."));

    let txt = "╔┈┈「 PESANANKU 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    for (const o of orders) {
      txt += o.id + "\n";
      txt += "  " + o.productName + " (" + o.qty + "x) = " + formatRupiah(o.total) + "\n";
      txt += "  Status: " + statusText(o.status) + "\n\n";
    }
    txt += "Detail: .belanja cek <id pesanan>";
    return await m.reply(claraWrap("belanja", txt));
  }

  return m.reply(
    "Perintah toko:\n\n" +
    "1. .belanja — Lihat katalog\n" +
    "2. .belanja detail <id> — Detail produk\n" +
    "3. .belanja cari <kata> — Cari produk\n" +
    "4. .belanja kategori — Lihat kategori\n" +
    "5. .belanja pesan <id> [qty] [catatan] — Pesan produk\n" +
    "6. .belanja cek [id] — Cek pesanan"
  );
}

export { pluginConfig as config, handler };
