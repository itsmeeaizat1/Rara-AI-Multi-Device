// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * rara-store.js
 * Sistem toko untuk Rara AI WhatsApp Bot.
 * Katalog produk, stok, kategori, order, konfirmasi, notif buyer.
 * Data disimpan di database settings (rara-database.js).
 */

import { getDatabase } from "./rara-database.js";
import config from "../../config.js";
import { logger } from "./rara-logger.js";

let sock = null;

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

function genId() {
  return "PRD-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(-2);
}

function genOrderId() {
  return "ORD-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(-2);
}

function formatRupiah(num) {
  return "Rp" + Number(num || 0).toLocaleString("id-ID");
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  }) + " WIB";
}

// ────────────────────────────────────────────────────────────────────────────
// STORE DATA (disimpan di db.setting)
// ────────────────────────────────────────────────────────────────────────────

function getStoreData() {
  const db = getDatabase();
  const data = db.setting("tokoData") || {};
  return {
    products: Array.isArray(data.products) ? data.products : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    categories: Array.isArray(data.categories) ? data.categories : ["Umum"],
    config: data.config || {
      storeName: "Rara Store",
      storeDesc: "Selamat datang di toko kami!",
      autoNotify: true,
      autoReduceStock: true,
    },
  };
}

function saveStoreData(data) {
  const db = getDatabase();
  db.setting("tokoData", data);
}

function getStoreConfig() {
  return getStoreData().config;
}

function updateStoreConfig(updater) {
  const data = getStoreData();
  data.config = updater(data.config);
  saveStoreData(data);
  return data.config;
}

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ────────────────────────────────────────────────────────────────────────────

function addProduct({ name, price, desc, category, stock, image }) {
  const data = getStoreData();
  const product = {
    id: genId(),
    name: String(name).trim(),
    price: Number(price) || 0,
    desc: String(desc || "").trim(),
    category: String(category || "Umum").trim(),
    stock: stock === "unlimited" ? -1 : Number(stock) || 0,
    image: image || null,
    sold: 0,
    createdAt: Date.now(),
  };

  if (!data.categories.includes(product.category)) {
    data.categories.push(product.category);
  }

  data.products.push(product);
  saveStoreData(data);
  return product;
}

function getProduct(id) {
  const data = getStoreData();
  return data.products.find((p) => p.id.toLowerCase() === String(id).toLowerCase()) || null;
}

function updateProduct(id, updates) {
  const data = getStoreData();
  const idx = data.products.findIndex((p) => p.id.toLowerCase() === String(id).toLowerCase());
  if (idx === -1) return null;

  data.products[idx] = { ...data.products[idx], ...updates, updatedAt: Date.now() };
  saveStoreData(data);
  return data.products[idx];
}

function deleteProduct(id) {
  const data = getStoreData();
  const before = data.products.length;
  data.products = data.products.filter((p) => p.id.toLowerCase() !== String(id).toLowerCase());
  if (data.products.length === before) return false;
  saveStoreData(data);
  return true;
}

function listProducts(category) {
  const data = getStoreData();
  if (category && category !== "all") {
    return data.products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  return data.products;
}

function searchProducts(query) {
  const data = getStoreData();
  const q = query.toLowerCase();
  return data.products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ORDERS
// ────────────────────────────────────────────────────────────────────────────

function createOrder({ productId, buyerJid, buyerName, qty, note }) {
  const data = getStoreData();
  const product = data.products.find((p) => p.id === productId);
  if (!product) return { error: "Produk tidak ditemukan" };

  const quantity = Number(qty) || 1;

  if (product.stock !== -1 && product.stock < quantity) {
    return { error: "Stok tidak cukup. Stok tersedia: " + product.stock };
  }

  const order = {
    id: genOrderId(),
    productId: product.id,
    productName: product.name,
    price: product.price,
    qty: quantity,
    total: product.price * quantity,
    buyerJid: buyerJid,
    buyerName: buyerName || buyerJid,
    note: String(note || "").trim(),
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  data.orders.push(order);
  saveStoreData(data);
  return { order, product };
}

function getOrder(id) {
  const data = getStoreData();
  return data.orders.find((o) => o.id.toLowerCase() === String(id).toLowerCase()) || null;
}

function updateOrderStatus(id, status, sellerNote) {
  const data = getStoreData();
  const idx = data.orders.findIndex((o) => o.id.toLowerCase() === String(id).toLowerCase());
  if (idx === -1) return null;

  data.orders[idx].status = status;
  data.orders[idx].updatedAt = Date.now();
  if (sellerNote) data.orders[idx].sellerNote = sellerNote;

  if (status === "confirmed" || status === "done") {
    const productIdx = data.products.findIndex((p) => p.id === data.orders[idx].productId);
    if (productIdx !== -1 && data.config.autoReduceStock) {
      const p = data.products[productIdx];
      if (p.stock !== -1) {
        p.stock = Math.max(0, p.stock - data.orders[idx].qty);
      }
      p.sold = (p.sold || 0) + data.orders[idx].qty;
    }
  }

  saveStoreData(data);
  return data.orders[idx];
}

function listOrders(status) {
  const data = getStoreData();
  if (status && status !== "all") {
    return data.orders.filter((o) => o.status === status);
  }
  return data.orders;
}

function getOrdersByBuyer(jid) {
  const data = getStoreData();
  return data.orders.filter((o) => o.buyerJid === jid);
}

function deleteOrder(id) {
  const data = getStoreData();
  const before = data.orders.length;
  data.orders = data.orders.filter((o) => o.id.toLowerCase() !== String(id).toLowerCase());
  if (data.orders.length === before) return false;
  saveStoreData(data);
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ────────────────────────────────────────────────────────────────────────────

function addCategory(name) {
  const data = getStoreData();
  const cat = String(name).trim();
  if (data.categories.includes(cat)) return false;
  data.categories.push(cat);
  saveStoreData(data);
  return true;
}

function deleteCategory(name) {
  const data = getStoreData();
  const cat = String(name).trim();
  if (cat === "Umum") return false;
  data.categories = data.categories.filter((c) => c !== cat);
  data.products.forEach((p) => {
    if (p.category === cat) p.category = "Umum";
  });
  saveStoreData(data);
  return true;
}

function listCategories() {
  return getStoreData().categories;
}

// ────────────────────────────────────────────────────────────────────────────
// NOTIFIKASI BUYER
// ────────────────────────────────────────────────────────────────────────────

async function notifyBuyer(order, status, sellerNote) {
  if (!sock) return;
  const config = getStoreConfig();
  if (!config.autoNotify) return;

  let msg = "";
  if (status === "confirmed") {
    const payData = getPaymentData();
    msg = "Pesanan kamu *DITERIMA*\n\n";
    msg += "ID: " + order.id + "\n";
    msg += "Produk: " + order.productName + "\n";
    msg += "Qty: " + order.qty + "x\n";
    msg += "Total: *" + formatRupiah(order.total) + "*\n\n";
    msg += "Silakan lakukan pembayaran:\n";
    const methods = (payData.methods || []).filter((m) => m.number);
    const banks = (payData.banks || []).filter((b) => b.number);
    if (methods.length > 0) {
      msg += "E-Wallet:\n";
      for (const mw of methods) {
        msg += "  " + mw.name + ": " + mw.number;
        if (mw.holder) msg += " (a/n " + mw.holder + ")";
        msg += "\n";
      }
    }
    if (banks.length > 0) {
      msg += "Bank:\n";
      for (const bk of banks) {
        msg += "  " + bk.name + ": " + bk.number;
        if (bk.holder) msg += " (a/n " + bk.holder + ")";
        msg += "\n";
      }
    }
    if (payData.cash && payData.cash.enabled) {
      msg += "Cash: " + (payData.cash.info || "Tersedia") + "\n";
    }
    if (payData.qrisUrl) msg += "QRIS: Tersedia (lihat .payment)\n";
    if (methods.length === 0 && banks.length === 0 && !payData.qrisUrl && !(payData.cash && payData.cash.enabled)) {
      msg += "(Belum ada metode pembayaran diatur)\n";
    }
    msg += "\n";
    if (sellerNote) msg += "Catatan penjual: " + sellerNote + "\n\n";
    msg += "Terima kasih sudah belanja di " + (config.storeName || "Rara Store") + "!";
  } else if (status === "rejected") {
    msg = "Pesanan kamu *DITOLAK*\n\n";
    msg += "ID: " + order.id + "\n";
    msg += "Produk: " + order.productName + "\n";
    if (sellerNote) msg += "Alasan: " + sellerNote + "\n";
    msg += "\nMaaf atas ketidaknyamanannya.";
  } else if (status === "done") {
    msg = "Pesanan kamu *SELESAI*\n\n";
    msg += "ID: " + order.id + "\n";
    msg += "Produk: " + order.productName + "\n";
    msg += "Total: *" + formatRupiah(order.total) + "*\n\n";
    msg += "Terima kasih sudah belanja di " + (config.storeName || "Rara Store") + "!";
  } else if (status === "shipped") {
    msg = "Pesanan kamu *DIKIRIM*\n\n";
    msg += "ID: " + order.id + "\n";
    msg += "Produk: " + order.productName + "\n";
    if (sellerNote) msg += "Info pengiriman: " + sellerNote + "\n";
  }

  try {
    await sock.sendMessage(order.buyerJid, { text: msg });
  } catch (err) {
    logger.warn("STORE", "Gagal kirim notif ke buyer " + order.buyerJid + ": " + err.message);
  }
}

function setSock(sockInstance) {
  sock = sockInstance;
}


function getPaymentData() {
  const db = getDatabase();
  const stored = db.setting("tokoPayment");
  if (stored) {
    if (!stored.cash) stored.cash = { enabled: false, info: "" };
    return stored;
  }
  return {
    cash: { enabled: false, info: "" },
    qrisUrl: config.payment?.qrisUrl || "",
    methods: config.payment?.methods || [],
    banks: config.payment?.banks || [],
  };
}

// ────────────────────────────────────────────────────────────────────────────────────
// EXPORT
// ────────────────────────────────────────────────────────────────────────────

export {
  setSock,
  getStoreData,
  getStoreConfig,
  updateStoreConfig,
  addProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  searchProducts,
  createOrder,
  getOrder,
  updateOrderStatus,
  listOrders,
  getOrdersByBuyer,
  deleteOrder,
  addCategory,
  deleteCategory,
  listCategories,
  notifyBuyer,
  formatRupiah,
  formatDate,
};
