// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-toko2.js — Alfamart-style shop system with cart, categories, promo

import { getDatabase } from "./nova-database.js";
import config from "../config.js";
import { toSC } from "./nova-menu-style.js";

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
  if (product.stock === -1) return product;
  const newStock = product.stock + Number(amount);
  return updateProduct(id, { stock: Math.max(0, newStock) });
}

export function listByCategory(category) {
  const products = getProducts();
  if (!category || category === "all") return products;
  return products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
}

export function getCategories() {
  const products = getProducts();
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  return cats.sort();
}

export function searchProducts(query) {
  const products = getProducts();
  const q = query.toLowerCase();
  return products.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
}

// ============================================================
// CART SYSTEM (per-user, Alfamart style)
// ============================================================
export function getCart(jid) {
  const db = getDatabase();
  const carts = db.setting("toko2Carts") || {};
  return carts[jid] || { items: [], promoCode: null, createdAt: null };
}

export function saveCart(jid, cart) {
  const db = getDatabase();
  const carts = db.setting("toko2Carts") || {};
  carts[jid] = cart;
  db.setting("toko2Carts", carts);
  db.save();
}

export function addToCart(jid, productId, qty) {
  const product = getProduct(productId);
  if (!product) return { error: "Produk tidak ditemukan" };

  // Check stock
  if (product.stock !== -1 && product.stock < qty) {
    return { error: "Stok tidak cukup. Tersedia: " + (product.stock === -1 ? "Unlimited" : product.stock) };
  }

  let cart = getCart(jid);
  if (!cart.items) cart = { items: [], promoCode: null, createdAt: null };

  const existing = cart.items.find((i) => i.productId === product.id);
  if (existing) {
    existing.qty += qty;
    existing.subtotal = existing.qty * existing.price;
  } else {
    cart.items.push({
      productId: product.id,
      productName: product.name,
      price: product.price,
      qty,
      subtotal: product.price * qty,
    });
  }

  if (!cart.createdAt) cart.createdAt = Date.now();
  saveCart(jid, cart);
  return { success: true, cart, product };
}

export function removeFromCart(jid, productId, qty) {
  let cart = getCart(jid);
  if (!cart.items || !cart.items.length) return { error: "Keranjang kosong" };

  const idx = cart.items.findIndex((i) => i.productId === productId || i.productName.toLowerCase() === productId.toLowerCase());
  if (idx === -1) return { error: "Item tidak ada di keranjang" };

  if (qty && qty > 0 && cart.items[idx].qty > qty) {
    cart.items[idx].qty -= qty;
    cart.items[idx].subtotal = cart.items[idx].qty * cart.items[idx].price;
  } else {
    cart.items.splice(idx, 1);
  }

  saveCart(jid, cart);
  return { success: true, cart };
}

export function clearCart(jid) {
  saveCart(jid, { items: [], promoCode: null, createdAt: null });
  return { success: true };
}

export function cartTotal(jid) {
  const cart = getCart(jid);
  const subtotal = (cart.items || []).reduce((sum, i) => sum + i.subtotal, 0);
  const discount = getCartDiscount(jid);
  const total = subtotal - discount;
  return { subtotal, discount, total, itemCount: (cart.items || []).reduce((s, i) => s + i.qty, 0) };
}

export function getCartDiscount(jid) {
  const cart = getCart(jid);
  if (!cart.promoCode) return 0;
  const promo = getPromo(cart.promoCode);
  if (!promo || !promo.active) return 0;
  const subtotal = (cart.items || []).reduce((sum, i) => sum + i.subtotal, 0);
  if (promo.type === "percent") return Math.round(subtotal * promo.value / 100);
  if (promo.type === "fixed") return Math.min(promo.value, subtotal);
  return 0;
}

// ============================================================
// PROMO / DISCOUNT
// ============================================================
export function getPromos() {
  const db = getDatabase();
  return db.setting("toko2Promos") || [];
}

export function savePromos(promos) {
  const db = getDatabase();
  db.setting("toko2Promos", promos);
  db.save();
}

export function getPromo(code) {
  const promos = getPromos();
  return promos.find((p) => p.code.toLowerCase() === String(code).toLowerCase() && p.active);
}

export function addPromo({ code, type, value, desc, minSpend, expiresAt }) {
  const promos = getPromos();
  if (promos.find((p) => p.code.toLowerCase() === code.toLowerCase())) {
    return { error: "Kode promo sudah ada" };
  }
  const promo = {
    code: code.toUpperCase(),
    type: type || "percent", // percent | fixed
    value: Number(value),
    desc: desc || "",
    minSpend: Number(minSpend) || 0,
    expiresAt: expiresAt || null,
    active: true,
    used: 0,
    createdAt: Date.now(),
  };
  promos.push(promo);
  savePromos(promos);
  return { success: true, promo };
}

export function togglePromo(code, active) {
  const promos = getPromos();
  const idx = promos.findIndex((p) => p.code.toLowerCase() === String(code).toLowerCase());
  if (idx === -1) return null;
  promos[idx].active = active !== false;
  savePromos(promos);
  return promos[idx];
}

export function deletePromo(code) {
  const promos = getPromos();
  const filtered = promos.filter((p) => p.code.toLowerCase() !== String(code).toLowerCase());
  savePromos(filtered);
  return promos.length !== filtered.length;
}

export function applyPromo(jid, code) {
  const promo = getPromo(code);
  if (!promo) return { error: "Kode promo tidak ditemukan atau sudah tidak aktif" };
  const cart = getCart(jid);
  if (!cart.items || !cart.items.length) return { error: "Keranjang kosong" };
  const subtotal = (cart.items || []).reduce((sum, i) => sum + i.subtotal, 0);
  if (promo.minSpend && subtotal < promo.minSpend) {
    return { error: "Min belanja " + formatRupiah(promo.minSpend) + " untuk pakai promo ini" };
  }
  if (promo.expiresAt && Date.now() > promo.expiresAt) {
    return { error: "Promo sudah expired" };
  }
  cart.promoCode = promo.code;
  saveCart(jid, cart);
  return { success: true, promo };
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

export function checkout(jid, buyerName) {
  const cart = getCart(jid);
  if (!cart.items || !cart.items.length) return { error: "Keranjang kosong" };

  // Validate stock
  for (const item of cart.items) {
    const product = getProduct(item.productId);
    if (!product) return { error: "Produk " + item.productName + " tidak tersedia lagi" };
    if (product.stock !== -1 && product.stock < item.qty) {
      return { error: "Stok " + item.productName + " tidak cukup. Sisa: " + product.stock };
    }
  }

  const { subtotal, discount, total } = cartTotal(jid);
  const promoCode = cart.promoCode;

  const invCode = genInvoiceCode();
  const invoices = getInvoices();
  invoices[invCode] = {
    code: invCode,
    items: cart.items,
    subtotal,
    discount,
    promoCode,
    total,
    buyerJid: jid,
    buyerName: buyerName || jid.split("@")[0],
    status: "pending", // pending → paid → confirmed → done | cancelled
    paymentMethod: null,
    note: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveInvoices(invoices);

  // Reduce stock
  for (const item of cart.items) {
    if (item.productId) {
      const product = getProduct(item.productId);
      if (product && product.stock !== -1) {
        updateProduct(item.productId, { stock: Math.max(0, product.stock - item.qty) });
      }
    }
  }

  // Increment promo usage
  if (promoCode) {
    const promos = getPromos();
    const idx = promos.findIndex((p) => p.code === promoCode);
    if (idx !== -1) { promos[idx].used++; savePromos(promos); }
  }

  // Clear cart
  clearCart(jid);

  return { success: true, invoice: invoices[invCode] };
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

  if (pm.qrisUrl) {
    methods.push({ type: "qris", label: "QRIS", value: "qris" });
  }

  if (Array.isArray(pm.methods)) {
    for (const m of pm.methods) {
      if (m.number) {
        methods.push({ type: "ewallet", label: m.name, value: m.name.toLowerCase(), number: m.number, holder: m.holder });
      }
    }
  }

  if (Array.isArray(pm.banks)) {
    for (const b of pm.banks) {
      if (b.number) {
        methods.push({ type: "bank", label: b.name, value: b.name.toLowerCase(), number: b.number, holder: b.holder });
      }
    }
  }

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

// ============================================================
// RECEIPT FORMATTER (Alfamart style)
// ============================================================
export function formatReceipt(inv) {
  const lines = [
    "",
    inv.code,
    formatDate(inv.createdAt),
    "",
    "---",
    "",
  ];

  for (const item of inv.items || []) {
    lines.push(item.productName);
    lines.push(item.qty + " x " + formatRupiah(item.price) + " = " + formatRupiah(item.subtotal));
    lines.push("");
  }

  lines.push("---");
  lines.push(toSC("Subtotal") + ": " + formatRupiah(inv.subtotal));
  if (inv.discount > 0) {
    lines.push(toSC("Diskon") + " (" + (inv.promoCode || "") + "): -" + formatRupiah(inv.discount));
  }
  lines.push(toSC("Total") + ": " + formatRupiah(inv.total));
  lines.push("");
  lines.push(toSC("Metode") + ": " + (inv.paymentMethod || "-"));
  lines.push(toSC("Status") + ": " + statusText(inv.status));

  return lines;
}
