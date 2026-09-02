// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import fs from "fs";
import path from "path";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// UndrCtrl SMM - Social Media Services
// Provider: undrctrl.id (Perfect Panel v2 API)
// Services: TikTok, Instagram, YouTube, Shopee, ML, dll
// Rate: USD per 1000 (auto convert to IDR for display)
// ============================================================

const DATA_FILE = path.join(process.cwd(), "src", "data", "undrsmm.json");
const UNDR_API = "https://undrctrl.id/api/v2";
const UNDR_V3 = "https://undr.sh/items/services";
const USD_RATE = 16500; // Approximate IDR per USD

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) { console.error('[undrsmm.js]:', e.message); }
  return {
    apiKey: "",
    markup: 20, // Default 20% markup
    orders: [],
    pendingPayments: {},
    servicesCache: null,
    servicesCacheAt: 0,
    users: {},
  };
}
function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('[undrsmm.js]:', e.message); }
}

function getUser(data, sender) {
  if (!data.users[sender]) data.users[sender] = { balance: 0, totalOrders: 0, totalSpent: 0 };
  return data.users[sender];
}

function formatRupiah(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

function genToken() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// === API Functions ===
async function undrPost(action, params) {
  const res = await axios.post(UNDR_API, new URLSearchParams({ ...params, action }).toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });
  return res.data;
}

async function getServices(data, force = false) {
  if (!force && data.servicesCache && data.servicesCache.length > 0 && Date.now() - data.servicesCacheAt < 3600000) {
    return data.servicesCache;
  }
  const result = await undrPost("services", { key: data.apiKey });
  if (Array.isArray(result)) {
    data.servicesCache = result;
    data.servicesCacheAt = Date.now();
    saveData(data);
    return result;
  }
  throw new Error(result.error || "Gagal ambil nih layanan");
}

async function getServicesV3() {
  const res = await axios.get(UNDR_V3, { headers: { "Content-Type": "application/json" }, timeout: 20000 });
  if (Array.isArray(res.data)) return res.data;
  throw new Error("Gagal ambil nih layanan v3");
}

async function addOrder(data, service, link, quantity) {
  const result = await undrPost("add", { key: data.apiKey, service: String(service), link: String(link), quantity: String(quantity) });
  if (result.order) return { id: String(result.order) };
  throw new Error(result.error || "Gagal bikin nih order");
}

async function orderStatus(data, orderId) {
  const result = await undrPost("status", { key: data.apiKey, order: String(orderId) });
  if (result.error) throw new Error(result.error);
  return result;
}

async function getBalance(data) {
  const result = await undrPost("balance", { key: data.apiKey });
  if (result.error) throw new Error(result.error);
  return result;
}

async function createRefill(data, orderId) {
  const result = await undrPost("refill", { key: data.apiKey, order: String(orderId) });
  if (result.refill) return { id: String(result.refill) };
  throw new Error(result.error || "Gagal refill");
}

async function refillStatus(data, refillId) {
  const result = await undrPost("refill_status", { key: data.apiKey, refill: String(refillId) });
  if (result.error) throw new Error(result.error);
  return result;
}

async function cancelOrders(data, orderIds) {
  const result = await undrPost("cancel", { key: data.apiKey, orders: Array.isArray(orderIds) ? orderIds.join(",") : String(orderIds) });
  return result;
}

// Calculate price with markup
function calcPrice(ratePer1000, quantity, markup) {
  const usdRate = parseFloat(ratePer1000) || 0;
  const idrRate = usdRate * USD_RATE;
  const basePrice = (idrRate * quantity) / 1000;
  const withMarkup = basePrice * (1 + (markup || 0) / 100);
  return Math.ceil(withMarkup / 100) * 100;
}

const pluginConfig = {
  name: ["undrsmm", "undr", "suntikundr"],
  alias: ["undrsmm", "undr", "suntikundr"],
  category: "tools",
  description: "Beli SMM services via UndrCtrl (TikTok, IG, YouTube, Shopee, ML)",
  usage: ".undr\n.undr setkey <key>\n.undr saldo\n.undr cari <keyword>\n.undr kategori\n.undr beli <service_id> <link> <qty>\n.undr bayar <token>\n.undr cek <order_id>\n.undr refill <order_id>\n.undr batal <order_id>\n.undr setmarkup <persen>\n.undr list",
  example: ".undr cari tiktok follower\n.undr beli 1002 https://tiktok.com/xxx 1000",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  const args = (m.text || "").trim().split(/\s+/);
  const sub = args[0] ? args[0].toLowerCase() : "";
  const arg1 = args[1] || "";
  const arg2 = args[2] || "";
  const arg3 = args[3] || "";
  const sender = m.sender;
  const data = loadData();
  const user = getUser(data, sender);
  const isOwner = m.isOwner || false;
  const markup = data.markup || 20;

  // SETKEY
  if (sub === "setkey" || sub === "setapi") {
    if (!isOwner) return m.reply(claraWrap("undrsmm", "Khusus owner!"));
    const key = arg1;
    if (!key) {
      return m.reply( claraWrap("UndrCtrl SMM", "Set API Key (Owner)\n\n.undr setkey <api_key>\n\nDaftar & dapatkan API key:\nhttps://undrctrl.id"), "undrsmm");
    }
    data.apiKey = key; saveData(data);
    return m.reply( claraWrap("UndrCtrl SMM", "API Key tersimpan!\nKey: " + key.slice(0,6) + "..." + key.slice(-4)), "undrsmm");
  }

  // SETMARKUP - Set profit margin
  if (sub === "setmarkup" || sub === "markup") {
    if (!isOwner) return m.reply(claraWrap("undrsmm", "Khusus owner!"));
    const pct = parseInt(arg1);
    if (isNaN(pct) || pct < 0 || pct > 500) {
      return m.reply( claraWrap("UndrCtrl SMM", "Set Markup (Owner)\n\n.undr setmarkup <persen>\n\nContoh:\n.undr setmarkup 20 (tambah 20% dari harga API)\n.undr setmarkup 0 (harga pas, no profit)\n\nMarkup aktif: " + markup + "%"), "undrsmm");
    }
    data.markup = pct; saveData(data);
    return m.reply( claraWrap("UndrCtrl SMM", "Markup diupdate!\nMarkup: " + pct + "%\n\n💡 *Contoh:* Harga API $1/1000 qty 1000\nHarga jual: Rp" + Math.round(USD_RATE * (1 + pct/100)).toLocaleString("id-ID") + " (" + pct + "% profit)"), "undrsmm");
  }

  // SALDO
  if (sub === "saldo" || sub === "balance") {
    if (!data.apiKey) return m.reply( claraWrap("UndrCtrl SMM", "Belum setup!\nOwner: .undr setkey <api_key>\n\nDaftar: https://undrctrl.id"), "undrsmm");
    try {
      const bal = await getBalance(data);
      let body = "Saldo UndrCtrl\n\nSaldo API: $" + (parseFloat(bal.balance) || 0).toFixed(2) + " (" + formatRupiah((parseFloat(bal.balance) || 0) * USD_RATE) + ")\n";
      body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
      body += "Markup: " + markup + "%";
      return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // TOPUP - Owner only
  if (sub === "topup") {
    if (!isOwner) return m.reply(claraWrap("undrsmm", "Khusus owner!"));
    const target = (arg1 || "").replace(/[^0-9]/g, "");
    const amount = parseInt(arg2) || 0;
    if (!target || amount < 100) {
      return m.reply( claraWrap("UndrCtrl SMM", "Topup Saldo (Owner)\n\n.undr topup <nomor> <jumlah>\n💡 *Contoh:* .undr topup 628123456789 50000\nMin: Rp100"), "undrsmm");
    }
    const targetUser = getUser(data, target + "@s.whatsapp.net");
    targetUser.balance += amount; saveData(data);
    return m.reply( claraWrap("UndrCtrl SMM", "Topup Berhasil!\nUser: " + target + "\nJumlah: " + formatRupiah(amount) + "\nSaldo: " + formatRupiah(targetUser.balance)), "undrsmm");
  }

  // KATEGORI - List all categories
  if (sub === "kategori" || sub === "category") {
    if (!data.apiKey) return m.reply( claraWrap("UndrCtrl SMM", "Belum setup!\nOwner: .undr setkey <api_key>"), "undrsmm");
    try {
      const services = await getServices(data);
      const categories = {};
      services.forEach(s => { const cat = s.category || "Other"; categories[cat] = (categories[cat] || 0) + 1; });
      let body = "Kategori UndrCtrl (" + Object.keys(categories).length + " kategori, " + services.length + " layanan)\n\n";
      Object.entries(categories).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
        body += cat + " (" + count + ")\n";
      });
      body += "\nCari layanan:\n.undr cari <keyword>\n.undr cari tiktok\n.undr cari instagram\n.undr cari youtube\n.undr cari shopee";
      return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // CARI - Search services
  if (sub === "cari" || sub === "search" || sub === "carijasa") {
    if (!data.apiKey) return m.reply( claraWrap("UndrCtrl SMM", "Belum setup!\nOwner: .undr setkey <api_key>"), "undrsmm");
    const keyword = (arg1 || "").toLowerCase();
    const catFilter = arg2 ? arg2.toLowerCase() : "";
    if (!keyword) {
      return m.reply( claraWrap("UndrCtrl SMM", "Cari Layanan SMM\n\n.undr cari <keyword> [kategori]\n\nContoh:\n.undr cari tiktok follower\n.undr cari instagram likes\n.undr cari youtube views\n.undr cari shopee live\n.undr cari mobile legend\n\nLihat semua kategori: .undr kategori"), "undrsmm");
    }
    try {
      const services = await getServices(data);
      let filtered = services.filter(s =>
        (s.name || "").toLowerCase().includes(keyword) ||
        (s.category || "").toLowerCase().includes(keyword)
      );
      if (catFilter) filtered = filtered.filter(s => (s.category || "").toLowerCase().includes(catFilter));
      if (filtered.length === 0) {
        return m.reply( claraWrap("UndrCtrl SMM", "Tidak ada layanan untuk: " + keyword + "\n\nCoba keyword lain:\n.undr cari tiktok\n.undr cari instagram\n.undr cari youtube\n.undr cari shopee\n.undr cari mobile\n\nLihat semua: .undr kategori"), "undrsmm");
      }
      filtered.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
      let body = "UndrCtrl - " + keyword + (catFilter ? " (" + catFilter + ")" : "") + "\n" + filtered.length + " layanan\n\n";
      filtered.slice(0, 15).forEach((s, i) => {
        const rateUsd = parseFloat(s.rate) || 0;
        const rateIdr = Math.round(rateUsd * USD_RATE);
        const price1000 = Math.round(rateIdr * (1 + markup / 100) / 100) * 100;
        body += (i+1) + ". ID: " + s.service + "\n";
        body += "   " + (s.name || "?").substring(0, 70) + "\n";
        body += "   Kategori: " + (s.category || "?") + "\n";
        body += "   Harga/1000: " + formatRupiah(price1000) + " ($" + rateUsd.toFixed(4) + ")\n";
        body += "   Min: " + (s.min || "?") + " | Max: " + (s.max || "?") + "\n";
        if (s.refill) body += "   Refill: Yes\n";
        body += "\n";
      });
      if (filtered.length > 15) body += "... dan " + (filtered.length - 15) + " layanan lain\n";
      body += "\nBeli: .undr beli <service_id> <link> <qty>\n💡 *Contoh:* .undr beli " + filtered[0].service + " https://... 1000";
      return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // BELI - Start order flow
  if (sub === "beli" || sub === "buy" || sub === "pesan") {
    if (!data.apiKey) return m.reply( claraWrap("UndrCtrl SMM", "Belum setup!\nOwner: .undr setkey <api_key>"), "undrsmm");
    const serviceId = arg1;
    const link = arg2;
    const quantity = parseInt(arg3) || 0;
    if (!serviceId || !link || !quantity) {
      return m.reply( claraWrap("UndrCtrl SMM", "Format Beli\n\n.undr beli <service_id> <link> <qty>\n\nContoh:\n.undr beli 1002 https://www.tiktok.com/video/xxx 1000\n.undr beli 1010 https://instagram.com/p/xxx 500\n.undr beli 1018 https://youtube.com/watch?v=xxx 5000\n\nCari service_id:\n.undr cari tiktok\n.undr cari instagram"), "undrsmm");
    }
    try {
      const services = await getServices(data);
      const svc = services.find(s => String(s.service) === String(serviceId));
      if (!svc) {
        return m.reply( claraWrap("UndrCtrl SMM", "Service ID tidak ditemukan: " + serviceId + "\n\nCari: .undr cari <keyword>"), "undrsmm");
      }
      const minQ = parseInt(svc.min) || 1;
      const maxQ = parseInt(svc.max) || 999999999;
      if (quantity < minQ || quantity > maxQ) {
        return m.reply( claraWrap("UndrCtrl SMM", "Quantity tidak valid!\n\nMin: " + minQ + "\nMax: " + maxQ.toLocaleString("id-ID") + "\nInput: " + quantity), "undrsmm");
      }
      const price = calcPrice(svc.rate, quantity, markup);
      if (user.balance < price) {
        return m.reply( claraWrap("UndrCtrl SMM", "Saldo tidak cukup!\n\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nKurang: " + formatRupiah(price - user.balance) + "\n\nMinta topup:\n.undr topup " + sender.split("@")[0] + " <jumlah>"), "undrsmm");
      }
      const token = genToken();
      data.pendingPayments[token] = {
        sender, serviceId, link, quantity,
        serviceName: svc.name,
        category: svc.category,
        price,
        refill: svc.refill,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };
      saveData(data);
      let body = "Konfirmasi Order UndrCtrl\n\n";
      body += "Layanan: " + svc.name + "\n";
      body += "Kategori: " + (svc.category || "?") + "\n";
      body += "Link: " + link + "\n";
      body += "Quantity: " + quantity.toLocaleString("id-ID") + "\n";
      body += "Harga: " + formatRupiah(price) + "\n";
      body += "Saldo: " + formatRupiah(user.balance) + "\n";
      body += "Sisa: " + formatRupiah(user.balance - price) + "\n";
      if (svc.refill) body += "Refill: Tersedia (.undr refill <id>)\n";
      body += "\nToken: " + token + "\n\nBayar: .undr bayar " + token + "\nExpired: 5 menit";
      return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // BAYAR
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1 ? arg1.toUpperCase() : "";
    if (!token) return m.reply( claraWrap("UndrCtrl SMM", "Masukkan token!\n💡 *Contoh:* .undr bayar ABC123"), "undrsmm");
    const pending = data.pendingPayments[token];
    if (!pending) return m.reply( claraWrap("UndrCtrl SMM", "Token tidak ditemukan!"), "undrsmm");
    if (pending.sender !== sender) return m.reply( claraWrap("UndrCtrl SMM", "Bukan token kamu!"), "undrsmm");
    if (Date.now() > pending.expiresAt) { delete data.pendingPayments[token]; saveData(data); return m.reply( claraWrap("UndrCtrl SMM", "Token expired!"), "undrsmm"); }
    const u = getUser(data, sender);
    if (u.balance < pending.price) { delete data.pendingPayments[token]; saveData(data); return m.reply( claraWrap("UndrCtrl SMM", "Saldo tidak cukup!"), "undrsmm"); }
    try {
      u.balance -= pending.price;
      u.totalSpent += pending.price;
      const order = await addOrder(data, pending.serviceId, pending.link, pending.quantity);
      data.orders.push({
        id: order.id,
        serviceId: pending.serviceId,
        serviceName: pending.serviceName,
        category: pending.category,
        link: pending.link,
        quantity: pending.quantity,
        price: pending.price,
        sender,
        status: "Pending",
        refill: pending.refill,
        createdAt: new Date().toISOString(),
      });
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      u.totalOrders += 1;
      delete data.pendingPayments[token];
      saveData(data);
      let body = "Order Berhasil!\n\n";
      body += "Order ID: " + order.id + "\n";
      body += "Layanan: " + pending.serviceName + "\n";
      body += "Link: " + pending.link + "\n";
      body += "Quantity: " + pending.quantity.toLocaleString("id-ID") + "\n";
      body += "Harga: " + formatRupiah(pending.price) + "\n";
      body += "Sisa saldo: " + formatRupiah(u.balance) + "\n\n";
      body += "Cek status:\n.undr cek " + order.id + "\n";
      if (pending.refill) body += "Refill:\n.undr refill " + order.id + "\n";
      body += "Batal:\n.undr batal " + order.id;
      return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
    } catch (err) {
      u.balance += pending.price;
      u.totalSpent -= pending.price;
      delete data.pendingPayments[token];
      saveData(data);
      return m.reply( claraWrap("UndrCtrl SMM", "Gagal order! Saldo di-refund.\n\nError: " + err.message), "undrsmm");
    }
  }

  // CEK - Check order status
  if (sub === "cek" || sub === "check" || sub === "status") {
    const orderId = arg1;
    if (!orderId) return m.reply( claraWrap("UndrCtrl SMM", "Masukkan Order ID!\n💡 *Contoh:* .undr cek 23501"), "undrsmm");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return m.reply( claraWrap("UndrCtrl SMM", "Order tidak ditemukan!"), "undrsmm");
    try {
      const result = await orderStatus(data, orderId);
      let body = "Order #" + orderId + "\n\n";
      body += "Layanan: " + (order ? order.serviceName : "?") + "\n";
      body += "Link: " + (order ? order.link : "?") + "\n";
      body += "Quantity: " + (order ? order.quantity.toLocaleString("id-ID") : "?") + "\n\n";
      body += "Status: " + (result.status || "Unknown") + "\n";
      body += "Charge: $" + (parseFloat(result.charge) || 0).toFixed(4) + " (" + formatRupiah((parseFloat(result.charge) || 0) * USD_RATE) + ")\n";
      body += "Start count: " + (result.start_count || "0") + "\n";
      body += "Remains: " + (result.remains || "0") + "\n";
      body += "Currency: " + (result.currency || "USD") + "\n";
      if (result.status === "Completed") body += "\nOrder selesai!";
      else if (result.status === "In progress") body += "\nOrder masih berjalan...";
      else if (result.status === "Partial") body += "\nOrder partial - sebagian terkirim, sisa di-refund oleh API";
      else if (result.status === "Canceled" || result.status === "Cancelled") body += "\nOrder dibatalkan";
      return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // REFILL
  if (sub === "refill" || sub === "isiulang") {
    const orderId = arg1;
    if (!orderId) return m.reply( claraWrap("UndrCtrl SMM", "Masukkan Order ID!\n💡 *Contoh:* .undr refill 23501"), "undrsmm");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return m.reply( claraWrap("UndrCtrl SMM", "Order tidak ditemukan!"), "undrsmm");
    if (order && !order.refill) return m.reply( claraWrap("UndrCtrl SMM", "Layanan ini tidak support refill!"), "undrsmm");
    try {
      const result = await createRefill(data, orderId);
      return m.reply( claraWrap("UndrCtrl SMM", "Refill berhasil dibuat!\n\nOrder ID: " + orderId + "\nRefill ID: " + result.id + "\n\nCek status refill:\n.undr refillstatus " + result.id), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // REFILL STATUS
  if (sub === "refillstatus" || sub === "cekrefill") {
    const refillId = arg1;
    if (!refillId) return m.reply( claraWrap("UndrCtrl SMM", "Masukkan Refill ID!\n💡 *Contoh:* .undr refillstatus 123"), "undrsmm");
    try {
      const result = await refillStatus(data, refillId);
      return m.reply( claraWrap("UndrCtrl SMM", "Refill #" + refillId + "\n\nStatus: " + (result.status || "Unknown")), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // BATAL - Cancel order
  if (sub === "batal" || sub === "cancel") {
    const orderId = arg1;
    if (!orderId) return m.reply( claraWrap("UndrCtrl SMM", "Masukkan Order ID!\n💡 *Contoh:* .undr batal 23501"), "undrsmm");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return m.reply( claraWrap("UndrCtrl SMM", "Order tidak ditemukan!"), "undrsmm");
    try {
      const result = await cancelOrders(data, [orderId]);
      if (Array.isArray(result)) {
        const item = result.find(r => String(r.order) === String(orderId));
        if (item && item.cancel === 1) {
          if (order) { order.status = "Canceled"; }
          const refund = Math.floor((order ? order.price : 0) * 0.5);
          if (order && refund > 0) { const u = getUser(data, sender); u.balance += refund; }
          saveData(data);
          return m.reply( claraWrap("UndrCtrl SMM", "Order #" + orderId + " dibatalkan.\nRefund 50%: " + formatRupiah(refund) + "\nSaldo: " + formatRupiah(user.balance + refund)), "undrsmm");
        }
        return m.reply( claraWrap("UndrCtrl SMM", "Gagal batalkan. Order mungkin sudah dalam proses.\n\nResponse: " + JSON.stringify(item || result)), "undrsmm");
      }
      return m.reply( claraWrap("UndrCtrl SMM", "Response: " + JSON.stringify(result)), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // LIST - Order history
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) return m.reply( claraWrap("UndrCtrl SMM", "Belum ada order.\nCari: .undr cari <keyword>\nBeli: .undr beli <id> <link> <qty>"), "undrsmm");
    let body = "Riwayat Order (" + myOrders.length + ")\n\n";
    myOrders.slice(-10).reverse().forEach((o, i) => {
      body += (i+1) + ". ID: " + o.id + "\n   " + (o.serviceName || "?").substring(0, 50) + "\n   Qty: " + o.quantity.toLocaleString("id-ID") + " | " + formatRupiah(o.price) + "\n   " + o.status + "\n";
    });
    body += "\n.undr cek <id> - cek status\n.undr refill <id> - refill\n.undr batal <id> - batal";
    return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
  }

  // REFRESH - Force refresh service cache
  if (sub === "refresh" || sub === "sync") {
    if (!isOwner) return m.reply(claraWrap("undrsmm", "Khusus owner!"));
    if (!data.apiKey) return m.reply( claraWrap("UndrCtrl SMM", "Belum setup!"), "undrsmm");
    try {
      const services = await getServices(data, true);
      return m.reply( claraWrap("UndrCtrl SMM", "Cache di-refresh!\nTotal layanan: " + services.length), "undrsmm");
    } catch (err) {
      return m.reply( claraWrap("UndrCtrl SMM", "Error: " + err.message), "undrsmm");
    }
  }

  // HELP / MENU
  let body = "UndrCtrl SMM - Social Media Services\n\n";
  body += "Platform: TikTok, Instagram, YouTube, Shopee, ML, dll\n";
  body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
  body += "Markup: " + markup + "%\n\n";
  body += "1. Cari Layanan:\n   .undr cari <keyword>\n   .undr kategori\n\n";
  body += "2. Beli:\n   .undr beli <service_id> <link> <qty>\n\n";
  body += "3. Bayar:\n   .undr bayar <token>\n\n";
  body += "4. Cek Status:\n   .undr cek <order_id>\n\n";
  body += "5. Refill:\n   .undr refill <order_id>\n   .undr refillstatus <refill_id>\n\n";
  body += "6. Batalkan:\n   .undr batal <order_id> (refund 50%)\n\n";
  body += "7. Riwayat:\n   .undr list\n\n";
  body += "8. Saldo:\n   .undr saldo\n\n";
  body += "Contoh:\n.undr cari tiktok follower\n.undr beli 1002 https://tiktok.com/xxx 1000\n.undr bayar ABC123\n.undr cek 23501";
  if (isOwner) {
    body += "\n\n--- Owner ---\n.undr setkey <key>\n.undr setmarkup <persen>\n.undr topup <nomor> <jumlah>\n.undr refresh\nAPI: https://undrctrl.id/api/v2";
  }
  return m.reply( claraWrap("UndrCtrl SMM", body), "undrsmm");
}

export { pluginConfig as config, handler };
