// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

/**
 * .toko — sistem toko untuk owner (kelola produk, pesanan, kategori).
 */

import {
  getStoreData,
  getStoreConfig,
  updateStoreConfig,
  addProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  listOrders,
  updateOrderStatus,
  deleteOrder,
  addCategory,
  deleteCategory,
  listCategories,
  notifyBuyer,
  formatRupiah,
  formatDate,
} from "../../src/lib/nova-store.js";

const pluginConfig = {
  name: "tokobase3",
  alias: ["tokoowner3", "storebase3", "tokobase3"],
  category: "owner",
  description: "Kelola toko: produk, pesanan, kategori, pengaturan",
  usage: ".toko <perintah> [args]",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function stockText(stock) {
  return stock === -1 ? "Unlimited" : String(stock);
}

function statusEmoji(s) {
  switch (s) {
    case "pending": return "Menunggu";
    case "confirmed": return "Diterima";
    case "rejected": return "Ditolak";
    case "shipped": return "Dikirim";
    case "done": return "Selesai";
    default: return s;
  }
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const action = (args[0] || "").toLowerCase();

  // ── PRODUK ──────────────────────────────────────────────────────────────

  if (action === "add" || action === "tambah") {
    // .toko add <nama>|<harga>|<deskripsi>|<kategori>|<stok>
    const text = args.slice(1).join(" ").trim();
    const parts = text.split("|").map((s) => s.trim());

    if (parts.length < 2) {
      return m.reply(
        "Format tambah produk:\n\n" +
        ".toko add <nama>|<harga>|<deskripsi>|<kategori>|<stok>\n\n" +
        "Contoh:\n" +
        ".toko add Voucher Game 50K|50000|Voucher game 50 ribu|Digital|unlimited\n" +
        ".toko add Kaos Nova|85000|Kaos premium|Fashion|50\n\n" +
        "Stok: angka atau 'unlimited'\n" +
        "Kategori: opsional, default 'Umum'"
      );
    }

    const name = parts[0];
    const price = parts[1];
    const desc = parts[2] || "";
    const category = parts[3] || "Umum";
    const stock = parts[4] || "0";

    const product = addProduct({ name, price, desc, category, stock });
    return m.reply(
      "Produk ditambahkan\n\n" +
      "ID: " + product.id + "\n" +
      "Nama: " + product.name + "\n" +
      "Harga: " + formatRupiah(product.price) + "\n" +
      "Kategori: " + product.category + "\n" +
      "Stok: " + stockText(product.stock) + "\n" +
      "Deskripsi: " + (product.desc || "-")
    );
  }

  if (action === "edit" || action === "ubah") {
    // .toko edit <id> nama=<nama> harga=<harga> desc=<desc> stok=<stok> kategori=<kat>
    const id = args[1];
    if (!id) return m.reply(claraWrap("Toko", "Format: .toko edit <id> nama=... harga=... stok=..."));

    const product = getProduct(id);
    if (!product) return m.reply("Produk tidak ditemukan: " + id);

    const text = args.slice(2).join(" ");
    const updates = {};

    const nameMatch = text.match(/nama=(.+?)(?=\s+\w+=|$)/);
    if (nameMatch) updates.name = nameMatch[1].trim();

    const priceMatch = text.match(/harga=(\d+)/);
    if (priceMatch) updates.price = Number(priceMatch[1]);

    const descMatch = text.match(/desc=(.+?)(?=\s+\w+=|$)/);
    if (descMatch) updates.desc = descMatch[1].trim();

    const stockMatch = text.match(/stok=(\d+|unlimited)/);
    if (stockMatch) updates.stock = stockMatch[1] === "unlimited" ? -1 : Number(stockMatch[1]);

    const catMatch = text.match(/kategori=(.+?)(?=\s+\w+=|$)/);
    if (catMatch) updates.category = catMatch[1].trim();

    if (Object.keys(updates).length === 0) return m.reply(claraWrap("Toko", "Tidak ada yang diubah. Gunakan: nama=, harga=, desc=, stok=, kategori="));

    const updated = updateProduct(id, updates);
    return m.reply(
      "Produk diupdate\n\n" +
      "ID: " + updated.id + "\n" +
      "Nama: " + updated.name + "\n" +
      "Harga: " + formatRupiah(updated.price) + "\n" +
      "Kategori: " + updated.category + "\n" +
      "Stok: " + stockText(updated.stock)
    );
  }

  if (action === "del" || action === "hapus" || action === "delete") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Toko", "Format: .toko del <id>"));
    if (deleteProduct(id)) return m.reply("Produk dihapus: " + id);
    return m.reply("Produk tidak ditemukan: " + id);
  }

  if (action === "produk" || action === "list") {
    const cat = args[1];
    const products = listProducts(cat);

    if (products.length === 0) return m.reply("Belum ada produk" + (cat ? " di kategori " + cat : ""));

    let txt = "╔┈┈「 DAFTAR PRODUK 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    for (const p of products) {
      txt += p.id + "\n";
      txt += "  " + p.name + " — " + formatRupiah(p.price) + "\n";
      txt += "  Stok: " + stockText(p.stock) + " | Terjual: " + (p.sold || 0) + " | " + p.category + "\n";
      if (p.desc) txt += "  " + p.desc + "\n";
      txt += "\n";
    }
    txt += "Total: " + products.length + " produk";
    return await m.reply(claraWrap("tokobase3", txt));
  }

  if (action === "cari" || action === "search") {
    const query = args.slice(1).join(" ").trim();
    if (!query) return m.reply(claraWrap("Toko", "Format: .toko cari <kata kunci>"));
    const results = searchProducts(query);
    if (results.length === 0) return m.reply("Tidak ditemukan produk untuk: " + query);
    let txt = "Hasil pencarian: " + query + "\n\n";
    for (const p of results) {
      txt += p.id + " — " + p.name + " (" + formatRupiah(p.price) + ")\n";
    }
    return await m.reply(claraWrap("tokobase3", txt));
  }

  // ── PESANAN ─────────────────────────────────────────────────────────────

  if (action === "pesanan" || action === "order") {
    const filter = (args[1] || "pending").toLowerCase();
    const orders = listOrders(filter);

    if (orders.length === 0) return m.reply("Tidak ada pesanan" + (filter !== "all" ? " dengan status " + filter : ""));

    let txt = "╔┈┈「 PESANAN — " + filter.toUpperCase() + " 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    for (const o of orders) {
      txt += o.id + "\n";
      txt += "  " + o.productName + " (" + o.qty + "x) = " + formatRupiah(o.total) + "\n";
      txt += "  Buyer: " + o.buyerName + "\n";
      txt += "  Status: " + statusEmoji(o.status) + "\n";
      txt += "  " + formatDate(o.createdAt) + "\n";
      if (o.note) txt += "  Catatan: " + o.note + "\n";
      txt += "\n";
    }
    txt += "Total: " + orders.length + " pesanan";
    return await m.reply(claraWrap("tokobase3", txt));
  }

  if (action === "terima" || action === "confirm") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Toko", "Format: .toko terima <id> [catatan]"));
    const note = args.slice(2).join(" ").trim();
    const order = updateOrderStatus(id, "confirmed", note);
    if (!order) return m.reply("Pesanan tidak ditemukan: " + id);
    await notifyBuyer(order, "confirmed", note);
    return m.reply(
      "Pesanan diterima: " + id + "\n" +
      "Produk: " + order.productName + " (" + order.qty + "x)\n" +
      "Total: " + formatRupiah(order.total) + "\n" +
      "Buyer: " + order.buyerName + "\n" +
      "Notif otomatis terkirim ke buyer."
    );
  }

  if (action === "tolak" || action === "reject") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Toko", "Format: .toko tolak <id> [alasan]"));
    const note = args.slice(2).join(" ").trim();
    const order = updateOrderStatus(id, "rejected", note);
    if (!order) return m.reply("Pesanan tidak ditemukan: " + id);
    await notifyBuyer(order, "rejected", note);
    return m.reply("Pesanan ditolak: " + id + "\nNotif terkirim ke buyer.");
  }

  if (action === "kirim" || action === "ship") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Toko", "Format: .toko kirim <id> [info pengiriman]"));
    const note = args.slice(2).join(" ").trim();
    const order = updateOrderStatus(id, "shipped", note);
    if (!order) return m.reply("Pesanan tidak ditemukan: " + id);
    await notifyBuyer(order, "shipped", note);
    return m.reply("Pesanan dikirim: " + id + "\nNotif terkirim ke buyer.");
  }

  if (action === "selesai" || action === "done") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Toko", "Format: .toko selesai <id>"));
    const order = updateOrderStatus(id, "done");
    if (!order) return m.reply("Pesanan tidak ditemukan: " + id);
    await notifyBuyer(order, "done");
    return m.reply("Pesanan selesai: " + id);
  }

  if (action === "delpesanan" || action === "delorder") {
    const id = args[1];
    if (!id) return m.reply(claraWrap("Toko", "Format: .toko delpesanan <id>"));
    if (deleteOrder(id)) return m.reply("Pesanan dihapus: " + id);
    return m.reply("Pesanan tidak ditemukan: " + id);
  }

  // ── KATEGORI ────────────────────────────────────────────────────────────

  if (action === "kategori") {
    const sub = (args[1] || "").toLowerCase();
    if (sub === "add") {
      const name = args.slice(2).join(" ").trim();
      if (!name) return m.reply(claraWrap("Toko", "Format: .toko kategori add <nama>"));
      if (addCategory(name)) return m.reply("Kategori ditambah: " + name);
      return m.reply("Kategori sudah ada: " + name);
    }
    if (sub === "del" || sub === "remove") {
      const name = args.slice(2).join(" ").trim();
      if (!name) return m.reply(claraWrap("Toko", "Format: .toko kategori del <nama>"));
      if (deleteCategory(name)) return m.reply("Kategori dihapus: " + name);
      return m.reply("Tidak bisa hapus kategori Umum atau tidak ditemukan: " + name);
    }
    // list
    const cats = listCategories();
    let txt = "╔┈┈「 KATEGORI 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    cats.forEach((c, i) => { txt += (i + 1) + ". " + c + "\n"; });
    txt += "\nTambah: .toko kategori add <nama>\nHapus: .toko kategori del <nama>";
    return await m.reply(claraWrap("tokobase3", txt));
  }

  // ── CONFIG ──────────────────────────────────────────────────────────────

  if (action === "setnama") {
    const name = args.slice(1).join(" ").trim();
    if (!name) return m.reply(claraWrap("Toko", "Format: .toko setnama <nama toko>"));
    updateStoreConfig((c) => ({ ...c, storeName: name }));
    return m.reply("Nama toko diubah: " + name);
  }

  if (action === "setdesc") {
    const desc = args.slice(1).join(" ").trim();
    if (!desc) return m.reply(claraWrap("Toko", "Format: .toko setdesc <deskripsi>"));
    updateStoreConfig((c) => ({ ...c, storeDesc: desc }));
    return m.reply("Deskripsi toko diubah: " + desc);
  }

  if (action === "notif") {
    const on = (args[1] || "").toLowerCase() === "on";
    updateStoreConfig((c) => ({ ...c, autoNotify: on }));
    return m.reply("Notif buyer: " + (on ? "ON" : "OFF"));
  }

  if (action === "autostok") {
    const on = (args[1] || "").toLowerCase() === "on";
    updateStoreConfig((c) => ({ ...c, autoReduceStock: on }));
    return m.reply("Auto-kurang stok: " + (on ? "ON" : "OFF"));
  }

  // ── STATUS ──────────────────────────────────────────────────────────────

  if (action === "status" || action === "info" || !action) {
    const data = getStoreData();
    const config = getStoreConfig();
    const pendingCount = data.orders.filter((o) => o.status === "pending").length;
    const confirmedCount = data.orders.filter((o) => o.status === "confirmed").length;
    const doneCount = data.orders.filter((o) => o.status === "done").length;

    let txt = "╔┈┈「 NOVA STORE 」╎❏\n";
    txt += "╚┈┈❖\n\n";
    txt += "Nama: " + (config.storeName || "Nova Store") + "\n";
    txt += "Deskripsi: " + (config.storeDesc || "-") + "\n";
    txt += "Notif Buyer: " + (config.autoNotify ? "ON" : "OFF") + "\n";
    txt += "Auto Stok: " + (config.autoReduceStock ? "ON" : "OFF") + "\n\n";
    txt += "Produk: " + data.products.length + "\n";
    txt += "Kategori: " + data.categories.length + "\n";
    txt += "Pesanan pending: " + pendingCount + "\n";
    txt += "Pesanan diterima: " + confirmedCount + "\n";
    txt += "Pesanan selesai: " + doneCount + "\n\n";
    txt += "Perintah:\n";
    txt += "1. .toko add <nama>|<harga>|<desc>|<kat>|<stok>\n";
    txt += "2. .toko edit <id> nama=... harga=...\n";
    txt += "3. .toko del <id>\n";
    txt += "4. .toko produk [kategori]\n";
    txt += "5. .toko cari <kata kunci>\n";
    txt += "6. .toko pesanan [pending/confirmed/done/all]\n";
    txt += "7. .toko terima <id> [catatan]\n";
    txt += "8. .toko tolak <id> [alasan]\n";
    txt += "9. .toko kirim <id> [info]\n";
    txt += "10. .toko selesai <id>\n";
    txt += "11. .toko kategori add/del <nama>\n";
    txt += "12. .toko setnama <nama toko>\n";
    txt += "13. .toko setdesc <deskripsi>\n";
    txt += "14. .toko notif on/off\n";
    txt += "15. .toko autostok on/off";
    return await m.reply(claraWrap("tokobase3", txt));
  }

  return m.reply(claraWrap("Toko", "Perintah tidak dikenal. Ketik .toko status untuk lihat semua perintah."));
}

export { pluginConfig as config, handler };
