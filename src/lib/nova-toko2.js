// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-toko2.js — Advanced shop system with invoice, stock, payment selection

import { getDatabase } from "./nova-database.js";
import config from "../config.js";

// ============================================================
// PRODUCT MANAGEMENT
// ============================================================
export function getProducts() {
  const db = getDatabase();
  return db.setting("toko2Products") || [];
}

export function saveProducts(products) {
  const db = getDatabase();
  db.setting("toko2Products", products);
  db.save();
}

export function addProduct({ name, price, stock, desc, category, image }) {
  const products = getProducts();
  const id = `PRD-${String(products.length + 1).padStart(3, "0")}`;
  const product = {
    id,
    name,
    price: Number(price),
    stock: Number(stock), // -1 = unlimited
    desc: desc || "",
    category: category || "umum",
    image: image || "",
    sold: 0,
    createdAt: Date.now(),
  };
  products.push(product);
  saveProducts(products);
  return product;
}

export function getProduct(id) {
  const products = getProducts();
  return products.find((p) => p.id === id || p.name.toLowerCase() === String(id).toLowerCase());
}

export function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id || p.name.toLowerCase() === String(id).toLowerCase());
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...updates };
  saveProducts(products);
  return products[idx];
}

export function deleteProduct(id) {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== id && p.name.toLowerCase() !== String(id).toLowerCase());
  saveProducts(filtered);
  return products.length !== filtered.length;
}

export function updateStock(id, amount) {
  const product = getProduct(id);
  if (!product) return null;
  if (product.stock === -1) return product; // unlimited
  const newStock = product.stock + Number(amount);
  return updateProduct(id, { stock: Math.max(0, newStock) });
}

// ============================================================
// INVOICE / TRANSACTION
// ============================================================
export function getInvoices() {
  const db = getDatabase();
  return db.setting("toko2Invoices") || {};
}

export function saveInvoices(invoices) {
  const db = getDatabase();
  db.setting("toko2Invoices", invoices);
  db.save();
}

export function genInvoiceCode() {
  const db = getDatabase();
  let counter = db.setting("toko2InvCounter") || 0;
  counter++;
  db.setting("toko2InvCounter", counter);
  const date = new Date();
  const ymd = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${String(counter).padStart(4, "0")}`;
}

export function createInvoice({ product, buyerJid, buyerName, qty }) {
  const invoices = getInvoices();
  const invCode = genInvoiceCode();
  const total = product.price * (qty || 1);

  invoices[invCode] = {
    code: invCode,
    productId: product.id,
    productName: product.name,
    price: product.price,
    qty: qty || 1,
    total,
    buyerJid,
    buyerName: buyerName || buyerJid.split("@")[0],
    status: "pending", // pending → paid → confirmed → done | cancelled
    paymentMethod: null,
    paymentProof: null,
    note: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveInvoices(invoices);
  return invoices[invCode];
}

export function getInvoice(code) {
  const invoices = getInvoices();
  return invoices[code] || null;
}

export function updateInvoice(code, updates) {
  const invoices = getInvoices();
  if (!invoices[code]) return null;
  invoices[code] = { ...invoices[code], ...updates, updatedAt: Date.now() };
  saveInvoices(invoices);
  return invoices[code];
}

export function listInvoices(status) {
  const invoices = getInvoices();
  const list = Object.values(invoices);
  if (status) return list.filter((inv) => inv.status === status);
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export function getInvoicesByBuyer(jid) {
  const invoices = getInvoices();
  return Object.values(invoices)
    .filter((inv) => inv.buyerJid === jid)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ============================================================
// PAYMENT METHODS
// ============================================================
export function getActivePayments() {
  const pm = config.payment || {};
  const methods = [];

  // QRIS
  if (pm.qrisUrl) {
    methods.push({ type: "qris", label: "QRIS", value: "qris" });
  }

  // E-Wallet
  if (Array.isArray(pm.methods)) {
    for (const m of pm.methods) {
      if (m.number) {
        methods.push({ type: "ewallet", label: m.name, value: m.name.toLowerCase(), number: m.number, holder: m.holder });
      }
    }
  }

  // Bank
  if (Array.isArray(pm.banks)) {
    for (const b of pm.banks) {
      if (b.number) {
        methods.push({ type: "bank", label: b.name, value: b.name.toLowerCase(), number: b.number, holder: b.holder });
      }
    }
  }

  // Cash
  if (pm.cash?.enabled) {
    methods.push({ type: "cash", label: "Cash/COD", value: "cash" });
  }

  return methods;
}

// ============================================================
// FORMATTERS
// ============================================================
export function formatRupiah(n) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export function formatStock(stock) {
  if (stock === -1) return "Unlimited";
  if (stock === 0) return "Habis";
  return String(stock);
}

export function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function statusText(status) {
  const map = {
    pending: "Menunggu Pembayaran",
    paid: "Sudah Bayar",
    confirmed: "Dikonfirmasi",
    done: "Selesai",
    cancelled: "Dibatalkan",
  };
  return map[status] || status;
}

// ============================================================
// OWNER NOTIFICATION
// ============================================================
export function getOwnerJid() {
  const ownerNumbers = config.owner?.number || [];
  if (ownerNumbers.length > 0) {
    return `${String(ownerNumbers[0]).replace(/[^0-9]/g, "")}@s.whatsapp.net`;
  }
  return null;
}
