// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-toko2.js — Alfamart-style shop system with cart, categories, promo

import { getDatabase } from "./nova-database.js";
import config from "../../config.js";
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

// ============================================================
// KATALOG TEMPLATE — Pre-built categories for Alfamart shop
// ============================================================
export const KATEGORI_TOKO = {
  sembako: {
    label: "Sembako",
    items: [
      "Beras 5kg|55000|50|Beras premium kualitas super|sembako",
      "Minyak Goreng 2L|38000|30|Minyak goreng kemasan|sembako",
      "Gula Pasir 1kg|18000|40|Gula pasir putih premium|sembako",
      "Telur 1kg|28000|25|Telur ayam segar|sembako",
      "Tepung Terigu 1kg|12000|35|Tepung terigu serbaguna|sembako",
      "Mie Instan 1 dus|35000|20|Mie instan isi 40 pcs|sembako",
      "Kopi Sachet 1 dus|30000|15|Kopi sachet assorted|sembako",
      "Garam 1kg|8000|30|Garam halus beryodium|sembako",
      "Susu UHT 1L|25000|20|Susu UHT full cream|sembako",
      "Sarden Kaleng|15000|40|Sarden kaleng 425g|sembako",
    ],
  },
  ppob: {
    label: "PPOB",
    items: [
      "Pulsa Telkomsel 10k|10500|100|Pulsa Telkomsel 10.000|ppob",
      "Pulsa Indosat 10k|10500|100|Pulsa Indosat 10.000|ppob",
      "Pulsa XL 10k|10500|100|Pulsa XL 10.000|ppob",
      "Pulsa Tri 10k|10500|100|Pulsa Tri 10.000|ppob",
      "Paket Data Telkomsel 25GB|30000|50|Data Telkomsel 25GB 30 hari|ppob",
      "Paket Data Indosat 25GB|28000|50|Data Indosat 25GB 30 hari|ppob",
      "Paket Data XL 25GB|29000|50|Data XL 25GB 30 hari|ppob",
      "Token PLN 20k|20500|100|Token listrik PLN 20.000|ppob",
      "Token PLN 50k|50500|100|Token listrik PLN 50.000|ppob",
      "Token PLN 100k|100500|100|Token listrik PLN 100.000|ppob",
    ],
  },
  apppremium: {
    label: "App Premium",
    items: [
      "Spotify Premium 1 Bulan|25000|20|Akun Spotify Premium private 30 hari|apppremium",
      "Netflix Premium 1 Bulan|45000|15|Share Netflix Premium 4K 30 hari|apppremium",
      "Disney+ Hotstar 1 Bulan|30000|15|Disney+ Hotstar Premium 30 hari|apppremium",
      "YouTube Premium 1 Bulan|25000|20|YouTube Premium no ads 30 hari|apppremium",
      "Canva Pro 1 Bulan|20000|25|Canva Pro premium features 30 hari|apppremium",
      "Vidio Premier 1 Bulan|35000|15|Vidio.com Premier League 30 hari|apppremium",
      "Wetv Premium 1 Bulan|20000|20|WeTV VIP premium 30 hari|apppremium",
      "Viu Premium 1 Bulan|20000|20|Viu Premium 30 hari|apppremium",
    ],
  },
  akun: {
    label: "Jual Beli Akun",
    items: [
      "Akun Genshin Impact AR55+|150000|5|Akun Gensgin AR55+ dengan karakter 5 star|akun",
      "Akun Mobile Legends Mythic|200000|3|Akun ML Mythic 200+ skin epic|akun",
      "Akun Free Fire MAX|100000|5|Akun FF MAX rank heroik skin lengkap|akun",
      "Akun PUBGM Conqueror|180000|3|Akun PUBG Mobile Conqueror skin mythic|akun",
      "Akun Valorant Diamond|120000|5|Akun Valorant Diamond skin weapons|akun",
      "Akun Garena 5 Tahun|50000|10|Akun Garena 5 tahun aman full access|akun",
      "Jual Akun Custom|0|-1|Konsultasi jual akun game/sosmed|akun",
    ],
  },
  game: {
    label: "Voucher Game",
    items: [
      "Mobile Legends 86 Diamond|22000|100|Top up ML 86 diamond|game",
      "Mobile Legends 172 Diamond|44000|100|Top up ML 172 diamond|game",
      "Mobile Legends 257 Diamond|65000|100|Top up ML 257 diamond|game",
      "Free Fire 70 Diamond|10000|100|Top up FF 70 diamond|game",
      "Free Fire 140 Diamond|20000|100|Top up FF 140 diamond|game",
      "Free Fire 355 Diamond|50000|100|Top up FF 355 diamond|game",
      "Genshin Impact 60 Genesis|16000|100|Top up Genshin 60 genesis crystal|game",
      "Genshin Impact 330 Genesis|88000|50|Top up Genshin 330 genesis crystal|game",
      "Genshin Impact 1090 Genesis|280000|20|Top up Genshin 1090 genesis crystal|game",
      "Higgs Domino Ml-d100|100000|10|Top up Higgs Domino Ml-d100|game",
    ],
  },
};

export function seedKategori(namaKategori) {
  const cat = KATEGORI_TOKO[namaKategori.toLowerCase()];
  if (!cat) return { error: "Kategori tidak ditemukan. Tersedia: " + Object.keys(KATEGORI_TOKO).join(", ") };

  let added = 0;
  let skipped = 0;
  for (const item of cat.items) {
    const parts = item.split("|");
    const name = parts[0];
    const price = parseInt(parts[1]);
    const stock = parseInt(parts[2]);
    const desc = parts[3] || "";
    const category = parts[4] || namaKategori;

    // Cek apakah sudah ada
    const existing = getProduct(name);
    if (existing) { skipped++; continue; }

    addProduct({ name, price, stock, desc, category });
    added++;
  }
  return { success: true, added, skipped, label: cat.label };
}

export function seedAll() {
  let totalAdded = 0;
  let totalSkipped = 0;
  const results = {};
  for (const [key, cat] of Object.entries(KATEGORI_TOKO)) {
    const result = seedKategori(key);
    if (result.success) {
      totalAdded += result.added;
      totalSkipped += result.skipped;
      results[key] = result;
    }
  }
  return { totalAdded, totalSkipped, results };
}

// ============================================================
// RESI / TRACKING SYSTEM
// ============================================================
import axios from "axios";

export const KURIR_LIST = {
  jne: { name: "JNE", api_code: "jne" },
  jnt: { name: "J&T Express", api_code: "jnt" },
  sicepat: { name: "SiCepat", api_code: "sicepat" },
  anteraja: { name: "AnterAja", api_code: "anteraja" },
  pos: { name: "POS Indonesia", api_code: "pos" },
  tiki: { name: "TIKI", api_code: "tiki" },
  wahana: { name: "Wahana", api_code: "wahana" },
  jnt_cargo: { name: "J&T Cargo", api_code: "jnt_cargo" },
  lion: { name: "Lion Parcel", api_code: "lion" },
  ninja: { name: "Ninja Xpress", api_code: "ninja" },
  paxel: { name: "Paxel", api_code: "paxel" },
  rpx: { name: "RPX Holdings", api_code: "rpx" },
  sentral: { name: "Sentral Cargo", api_code: "sentral" },
  sls: { name: "SLS Express", api_code: "sls" },
  dse: { name: "DSE Express", api_code: "dse" },
  first: { name: "First Logistics", api_code: "first" },
  fast: { name: "FAST Express", api_code: "fast" },
  idl: { name: "IDL Cargo", api_code: "idl" },
  sas: { name: "SAS Express", api_code: "sas" },
  // tambah kurir lain nanti
};

export function addResi(code, resiNumber, kurir) {
  const inv = getInvoice(code);
  if (!inv) return { error: "Invoice tidak ditemukan" };
  if (inv.status !== "confirmed" && inv.status !== "done") {
    return { error: "Invoice harus status confirmed. Sekarang: " + statusText(inv.status) };
  }
  const updated = updateInvoice(code, {
    resi: resiNumber,
    kurir: kurir,
    resiAddedAt: Date.now(),
    trackingHistory: [{
      status: "resi_ditambahkan",
      message: "Nomor resi ditambahkan oleh admin",
      timestamp: Date.now(),
    }],
  });
  return { success: true, invoice: updated };
}

export function getResi(code) {
  const inv = getInvoice(code);
  if (!inv) return null;
  if (!inv.resi) return null;
  return { resi: inv.resi, kurir: inv.kurir, addedAt: inv.resiAddedAt };
}

export async function trackResi(resiNumber, kurirCode) {
  const kurir = KURIR_LIST[kurirCode?.toLowerCase()];
  if (!kurir) {
    return { error: "Kurir tidak dikenal. Tersedia: " + Object.keys(KURIR_LIST).join(", ") };
  }

  // Coba Binderbyte API (butuh key, dari apikeys.json atau .env)
  const db = getDatabase();
  const binderbyteKey = process.env.BINDERBYTE_API_KEY || db.setting("binderbyteKey") || "";

  if (binderbyteKey) {
    try {
      const res = await axios.get("https://api.binderbyte.com/v1/track", {
        params: {
          api_key: binderbyteKey,
          courier: kurir.api_code,
          awb: resiNumber,
        },
        timeout: 10000,
      });
      if (res.data?.code === 200 && res.data?.data) {
        return {
          success: true,
          source: "binderbyte",
          summary: res.data.data.summary,
          detail: res.data.data.detail,
          history: res.data.data.history,
        };
      }
      return { error: res.data?.message || "Gagal track via API" };
    } catch (err) {
      // Fallback ke manual tracking
    }
  }

  // Fallback: return manual status dari invoice
  const invoices = getInvoices();
  let foundInv = null;
  for (const inv of Object.values(invoices)) {
    if (inv.resi === resiNumber) {
      foundInv = inv;
      break;
    }
  }

  if (foundInv) {
    return {
      success: true,
      source: "manual",
      resi: resiNumber,
      kurir: kurir.name,
      summary: {
        status: foundInv.status === "done" ? "delivered" : "shipped",
        awb: resiNumber,
        courier: kurir.name,
        date: foundInv.resiAddedAt ? formatDate(foundInv.resiAddedAt) : "-",
      },
      history: foundInv.trackingHistory || [{
        status: "shipped",
        message: "Paket dikirim dengan " + kurir.name,
        timestamp: foundInv.resiAddedAt || foundInv.createdAt,
      }],
    };
  }

  return { error: "Resi tidak ditemukan. Tidak ada API key untuk auto-track." };
}

export function updateTrackingStatus(code, status, message) {
  const inv = getInvoice(code);
  if (!inv) return { error: "Invoice tidak ditemukan" };
  const history = inv.trackingHistory || [];
  history.push({ status, message, timestamp: Date.now() });
  return updateInvoice(code, { trackingHistory: history });
}
