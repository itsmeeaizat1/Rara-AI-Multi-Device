// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

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
  alias: ["belanja"],
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

  // ── KATALOG ──
  if (action === "katalog" || action === "list" || action === "all" || !action) {
    const products = listProducts();
    if (products.length === 0) return m.reply(claraWrap("belanja", "Maaf, toko belum punya produk."));

    const storeConfig = getStoreConfig();
    const cats = listCategories();
    let txt = `KATALOG ${storeConfig.name || "Toko Nova"}\n\n`;
    for (const cat of cats) {
      const count = products.filter((p) => p.category === cat).length;
      txt += `${cat} (${count} produk)\n`;
    }
    txt += "\nLihat: .belanja katalog <nama kategori>";
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── PESAN ──
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
    let txt = `PESANAN BARU\n\n`;
    txt += `ID: ${order.id}\n`;
    txt += `Produk: ${order.productName}\n`;
    txt += `Jumlah: ${order.qty}x\n`;
    txt += `Total: ${formatRupiah(order.total)}\n`;
    txt += `Status: ${statusText(order.status)}\n`;
    txt += `Tanggal: ${formatDate(order.createdAt)}\n`;
    if (order.note) txt += `Catatan: ${order.note}\n`;
    if (order.sellerNote) txt += `Catatan penjual: ${order.sellerNote}\n`;
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── CEK PESANAN ──
  if (action === "cek" || action === "pesanan") {
    const orders = getOrdersByBuyer(jid);
    if (orders.length === 0) return m.reply(claraWrap("belanja", "Kamu belum punya pesanan. Ketik .belanja katalog untuk lihat produk."));

    let txt = `PESANANKU\n\n`;
    for (const o of orders) {
      txt += `${o.id}\n`;
      txt += `  ${o.productName} (${o.qty}x) = ${formatRupiah(o.total)}\n`;
      txt += `  Status: ${statusText(o.status)}\n\n`;
    }
    txt += "Detail: .belanja cek <id pesanan>";
    return await m.reply(claraWrap("belanja", txt));
  }

  // ── HELP ──
  return m.reply(claraWrap("belanja", [
    "1. .belanja — Lihat katalog",
    "2. .belanja detail <id> — Detail produk",
    "3. .belanja cari <kata> — Cari produk",
    "4. .belanja kategori — Lihat kategori",
    "5. .belanja pesan <id> [qty] [catatan] — Pesan produk",
    "6. .belanja cek [id] — Cek pesanan",
  ].join("\n")));
}

export { pluginConfig as config, handler };
