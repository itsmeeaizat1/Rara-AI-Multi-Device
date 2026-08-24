// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// ProviderSMM - Social Media Services (Indonesia Focused)
// Provider: providersmm.id (Perfect Panel v2 API)
// 98 kategori, fokus Indonesia: IG, TikTok, FB, Threads, X, Roblox
// Rate: USD per 1000 (auto convert to IDR)
// ============================================================

const DATA_FILE = path.join(process.cwd(), "database", "provsmm.json");
const PROV_API = "https://providersmm.id/api/v2";
const USD_RATE = 16500;

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) { console.error('[provsmm.js]:', e.message); }
  return {
    apiKey: "",
    markup: 20,
    orders: [],
    pendingPayments: {},
    servicesCache: null,
    servicesCacheAt: 0,
    users: {},
  };
}
function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('[provsmm.js]:', e.message); }
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

// === API ===
async function provPost(action, params) {
  const res = await axios.post(PROV_API, new URLSearchParams({ ...params, action }).toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });
  return res.data;
}

async function getServices(data, force = false) {
  if (!force && data.servicesCache && data.servicesCache.length > 0 && Date.now() - data.servicesCacheAt < 3600000) {
    return data.servicesCache;
  }
  const result = await provPost("services", { key: data.apiKey });
  if (Array.isArray(result)) {
    data.servicesCache = result;
    data.servicesCacheAt = Date.now();
    saveData(data);
    return result;
  }
  throw new Error(result.error || "Gagal mengambil layanan");
}

async function addOrder(data, service, link, quantity) {
  const result = await provPost("add", { key: data.apiKey, service: String(service), link: String(link), quantity: String(quantity) });
  if (result.order) return { id: String(result.order) };
  throw new Error(result.error || "Gagal membuat order");
}

async function orderStatus(data, orderId) {
  const result = await provPost("status", { key: data.apiKey, order: String(orderId) });
  if (result.error) throw new Error(result.error);
  return result;
}

async function getBalance(data) {
  const result = await provPost("balance", { key: data.apiKey });
  if (result.error) throw new Error(result.error);
  return result;
}

async function createRefill(data, orderId) {
  const result = await provPost("refill", { key: data.apiKey, order: String(orderId) });
  if (result.refill) return { id: String(result.refill) };
  throw new Error(result.error || "Gagal refill");
}

async function refillStatus(data, refillId) {
  const result = await provPost("refill_status", { key: data.apiKey, refill: String(refillId) });
  if (result.error) throw new Error(result.error);
  return result;
}

async function cancelOrders(data, orderIds) {
  const result = await provPost("cancel", { key: data.apiKey, orders: Array.isArray(orderIds) ? orderIds.join(",") : String(orderIds) });
  return result;
}

function calcPrice(ratePer1000, quantity, markup) {
  const usdRate = parseFloat(ratePer1000) || 0;
  const idrRate = usdRate * USD_RATE;
  const basePrice = (idrRate * quantity) / 1000;
  const withMarkup = basePrice * (1 + (markup || 0) / 100);
  return Math.ceil(withMarkup / 100) * 100;
}

const pluginConfig = {
  name: ["provsmm", "prov", "suntikprov"],
  alias: ["providersmm", "psmm", "beliprov"],
  category: "tools",
  description: "Beli SMM via ProviderSMM (IG/TikTok/FB/Threads/X Indonesia, Roblox)",
  usage: ".prov\n.prov setkey <key>\n.prov saldo\n.prov cari <keyword>\n.prov kategori\n.prov beli <service_id> <link> <qty>\n.prov bayar <token>\n.prov cek <order_id>\n.prov refill <order_id>\n.prov batal <order_id>\n.prov setmarkup <persen>\n.prov list",
  example: ".prov cari instagram indonesia\n.prov beli 87 https://instagram.com/p/xxx 100",
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
    if (!isOwner) return m.reply(claraWrap("provsmm", "Khusus owner!"));
    const key = arg1;
    if (!key) {
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Set API Key (Owner)\n\n.prov setkey <api_key>\n\nDaftar & dapatkan API key:\nhttps://providersmm.id"), "provsmm");
    }
    data.apiKey = key; saveData(data);
    await m.react("🕐");
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "API Key tersimpan!\nKey: " + key.slice(0,6) + "..." + key.slice(-4)), "provsmm");
  }

  // SETMARKUP
  if (sub === "setmarkup" || sub === "markup") {
    if (!isOwner) return m.reply(claraWrap("provsmm", "Khusus owner!"));
    const pct = parseInt(arg1);
    if (isNaN(pct) || pct < 0 || pct > 500) {
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Set Markup (Owner)\n\n.prov setmarkup <persen>\n\nContoh:\n.prov setmarkup 20 (tambah 20%)\n.prov setmarkup 0 (no profit)\n\nMarkup aktif: " + markup + "%"), "provsmm");
    }
    data.markup = pct; saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Markup: " + pct + "%\n\nHarga API $1/1000 qty 1000\nHarga jual: Rp" + Math.round(USD_RATE * (1 + pct/100)).toLocaleString("id-ID")), "provsmm");
  }

  // TOPUP
  if (sub === "topup") {
    if (!isOwner) return m.reply(claraWrap("provsmm", "Khusus owner!"));
    const target = (arg1 || "").replace(/[^0-9]/g, "");
    const amount = parseInt(arg2) || 0;
    if (!target || amount < 100) {
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Topup Saldo (Owner)\n\n.prov topup <nomor> <jumlah>\nContoh: .prov topup 628123456789 50000\nMin: Rp100"), "provsmm");
    }
    const targetUser = getUser(data, target + "@s.whatsapp.net");
    targetUser.balance += amount; saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Topup Berhasil!\nUser: " + target + "\nJumlah: " + formatRupiah(amount) + "\nSaldo: " + formatRupiah(targetUser.balance)), "provsmm");
  }

  // SALDO
  if (sub === "saldo" || sub === "balance") {
    if (!data.apiKey) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Belum setup!\nOwner: .prov setkey <api_key>\n\nDaftar: https://providersmm.id"), "provsmm");
    await m.react("🕐");
    try {
      const bal = await getBalance(data);
      await m.react("✅");
      let body = "Saldo ProviderSMM\n\n";
      body += "Saldo API: $" + (parseFloat(bal.balance) || 0).toFixed(2) + " (" + formatRupiah((parseFloat(bal.balance) || 0) * USD_RATE) + ")\n";
      body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
      body += "Markup: " + markup + "%";
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // KATEGORI
  if (sub === "kategori" || sub === "category") {
    if (!data.apiKey) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Belum setup!\nOwner: .prov setkey <api_key>"), "provsmm");
    await m.react("🕐");
    try {
      const services = await getServices(data);
      const categories = {};
      services.forEach(s => { const cat = s.category || "Other"; categories[cat] = (categories[cat] || 0) + 1; });
      let body = "Kategori ProviderSMM (" + Object.keys(categories).length + " kategori, " + services.length + " layanan)\n\n";
      Object.entries(categories).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
        body += cat + " (" + count + ")\n";
      });
      body += "\nCari layanan:\n.prov cari <keyword>";
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // CARI
  if (sub === "cari" || sub === "search" || sub === "carijasa") {
    if (!data.apiKey) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Belum setup!\nOwner: .prov setkey <api_key>"), "provsmm");
    const keyword = (arg1 || "").toLowerCase();
    const catFilter = arg2 ? arg2.toLowerCase() : "";
    if (!keyword) {
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Cari Layanan SMM\n\n.prov cari <keyword> [kategori]\n\nContoh:\n.prov cari instagram indonesia\n.prov cari tiktok followers\n.prov cari facebook\n.prov cari threads\n.prov cari twitter\n.prov cari roblox\n\nLihat semua: .prov kategori"), "provsmm");
    }
    await m.react("🕐");
    try {
      const services = await getServices(data);
      let filtered = services.filter(s =>
        (s.name || "").toLowerCase().includes(keyword) ||
        (s.category || "").toLowerCase().includes(keyword)
      );
      if (catFilter) filtered = filtered.filter(s => (s.category || "").toLowerCase().includes(catFilter));
      if (filtered.length === 0) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Tidak ada: " + keyword + "\n\nCoba:\n.prov cari instagram\n.prov cari tiktok\n.prov cari facebook\n.prov cari threads\n.prov cari roblox"), "provsmm");
      }
      filtered.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
      let body = "ProviderSMM - " + keyword + (catFilter ? " (" + catFilter + ")" : "") + "\n" + filtered.length + " layanan\n\n";
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
      body += "\nBeli: .prov beli <service_id> <link> <qty>\nContoh: .prov beli " + filtered[0].service + " https://... 100";
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // BELI
  if (sub === "beli" || sub === "buy" || sub === "pesan") {
    if (!data.apiKey) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Belum setup!\nOwner: .prov setkey <api_key>"), "provsmm");
    const serviceId = arg1;
    const link = arg2;
    const quantity = parseInt(arg3) || 0;
    if (!serviceId || !link || !quantity) {
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Format Beli\n\n.prov beli <service_id> <link> <qty>\n\nContoh:\n.prov beli 87 https://instagram.com/p/xxx 100\n.prov beli 116 https://tiktok.com/@xxx 500\n.prov beli 60 https://facebook.com/xxx 200\n\nCari service_id:\n.prov cari instagram"), "provsmm");
    }
    await m.react("🕐");
    try {
      const services = await getServices(data);
      const svc = services.find(s => String(s.service) === String(serviceId));
      if (!svc) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Service ID tidak ditemukan: " + serviceId + "\n\nCari: .prov cari <keyword>"), "provsmm");
      }
      const minQ = parseInt(svc.min) || 1;
      const maxQ = parseInt(svc.max) || 999999999;
      if (quantity < minQ || quantity > maxQ) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Quantity tidak valid!\n\nMin: " + minQ + "\nMax: " + maxQ.toLocaleString("id-ID") + "\nInput: " + quantity), "provsmm");
      }
      const price = calcPrice(svc.rate, quantity, markup);
      if (user.balance < price) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Saldo tidak cukup!\n\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nKurang: " + formatRupiah(price - user.balance) + "\n\nMinta topup:\n.prov topup " + sender.split("@")[0] + " <jumlah>"), "provsmm");
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
      await m.react("✅");
      let body = "Konfirmasi Order ProviderSMM\n\n";
      body += "Layanan: " + svc.name + "\n";
      body += "Kategori: " + (svc.category || "?") + "\n";
      body += "Link: " + link + "\n";
      body += "Quantity: " + quantity.toLocaleString("id-ID") + "\n";
      body += "Harga: " + formatRupiah(price) + "\n";
      body += "Saldo: " + formatRupiah(user.balance) + "\n";
      body += "Sisa: " + formatRupiah(user.balance - price) + "\n";
      if (svc.refill) body += "Refill: Tersedia (.prov refill <id>)\n";
      body += "\nToken: " + token + "\n\nBayar: .prov bayar " + token + "\nExpired: 5 menit";
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // BAYAR
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1 ? arg1.toUpperCase() : "";
    if (!token) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Masukkan token!\nContoh: .prov bayar ABC123"), "provsmm");
    const pending = data.pendingPayments[token];
    if (!pending) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Token tidak ditemukan!"), "provsmm");
    if (pending.sender !== sender) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Bukan token kamu!"), "provsmm");
    if (Date.now() > pending.expiresAt) { delete data.pendingPayments[token]; saveData(data); return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Token expired!"), "provsmm"); }
    const u = getUser(data, sender);
    if (u.balance < pending.price) { delete data.pendingPayments[token]; saveData(data); return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Saldo tidak cukup!"), "provsmm"); }
    await m.react("🕐");
    try {
      u.balance -= pending.price;
      u.totalSpent += pending.price;
      const order = await addOrder(data, pending.serviceId, pending.link, pending.quantity);
      data.orders.push({
        id: order.id, serviceId: pending.serviceId, serviceName: pending.serviceName,
        category: pending.category, link: pending.link, quantity: pending.quantity,
        price: pending.price, sender, status: "Pending", refill: pending.refill,
        createdAt: new Date().toISOString(),
      });
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      u.totalOrders += 1;
      delete data.pendingPayments[token];
      saveData(data);
      await m.react("✅");
      let body = "Order Berhasil!\n\n";
      body += "Order ID: " + order.id + "\n";
      body += "Layanan: " + pending.serviceName + "\n";
      body += "Link: " + pending.link + "\n";
      body += "Quantity: " + pending.quantity.toLocaleString("id-ID") + "\n";
      body += "Harga: " + formatRupiah(pending.price) + "\n";
      body += "Sisa saldo: " + formatRupiah(u.balance) + "\n\n";
      body += "Cek status:\n.prov cek " + order.id + "\n";
      if (pending.refill) body += "Refill:\n.prov refill " + order.id + "\n";
      body += "Batal:\n.prov batal " + order.id;
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
    } catch (err) {
      u.balance += pending.price;
      u.totalSpent -= pending.price;
      delete data.pendingPayments[token];
      saveData(data);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Gagal order! Saldo di-refund.\n\nError: " + err.message), "provsmm");
    }
  }

  // CEK
  if (sub === "cek" || sub === "check" || sub === "status") {
    const orderId = arg1;
    if (!orderId) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Masukkan Order ID!\nContoh: .prov cek 23501"), "provsmm");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Order tidak ditemukan!"), "provsmm");
    await m.react("🕐");
    try {
      const result = await orderStatus(data, orderId);
      await m.react("✅");
      let body = "Order #" + orderId + "\n\n";
      body += "Layanan: " + (order ? order.serviceName : "?") + "\n";
      body += "Link: " + (order ? order.link : "?") + "\n";
      body += "Quantity: " + (order ? order.quantity.toLocaleString("id-ID") : "?") + "\n\n";
      body += "Status: " + (result.status || "Unknown") + "\n";
      body += "Charge: $" + (parseFloat(result.charge) || 0).toFixed(4) + " (" + formatRupiah((parseFloat(result.charge) || 0) * USD_RATE) + ")\n";
      body += "Start count: " + (result.start_count || "0") + "\n";
      body += "Remains: " + (result.remains || "0") + "\n";
      if (result.status === "Completed") body += "\nOrder selesai!";
      else if (result.status === "In progress") body += "\nOrder masih berjalan...";
      else if (result.status === "Partial") body += "\nPartial - sebagian terkirim";
      else if (result.status === "Canceled" || result.status === "Cancelled") body += "\nOrder dibatalkan";
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // REFILL
  if (sub === "refill" || sub === "isiulang") {
    const orderId = arg1;
    if (!orderId) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Masukkan Order ID!\nContoh: .prov refill 23501"), "provsmm");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Order tidak ditemukan!"), "provsmm");
    if (order && !order.refill) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Layanan ini tidak support refill!"), "provsmm");
    await m.react("🕐");
    try {
      const result = await createRefill(data, orderId);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Refill dibuat!\n\nOrder ID: " + orderId + "\nRefill ID: " + result.id + "\n\nCek:\n.prov refillstatus " + result.id), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // REFILL STATUS
  if (sub === "refillstatus" || sub === "cekrefill") {
    const refillId = arg1;
    if (!refillId) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Masukkan Refill ID!\nContoh: .prov refillstatus 123"), "provsmm");
    await m.react("🕐");
    try {
      const result = await refillStatus(data, refillId);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Refill #" + refillId + "\n\nStatus: " + (result.status || "Unknown")), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // BATAL
  if (sub === "batal" || sub === "cancel") {
    const orderId = arg1;
    if (!orderId) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Masukkan Order ID!\nContoh: .prov batal 23501"), "provsmm");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Order tidak ditemukan!"), "provsmm");
    await m.react("🕐");
    try {
      const result = await cancelOrders(data, [orderId]);
      await m.react("✅");
      if (Array.isArray(result)) {
        const item = result.find(r => String(r.order) === String(orderId));
        if (item && item.cancel === 1) {
          if (order) { order.status = "Canceled"; }
          const refund = Math.floor((order ? order.price : 0) * 0.5);
          if (order && refund > 0) { const u = getUser(data, sender); u.balance += refund; }
          saveData(data);
          return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Order #" + orderId + " dibatalkan.\nRefund 50%: " + formatRupiah(refund) + "\nSaldo: " + formatRupiah(user.balance + refund)), "provsmm");
        }
        return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Gagal batalkan. Mungkin sudah dalam proses.\n\nResponse: " + JSON.stringify(item || result)), "provsmm");
      }
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Response: " + JSON.stringify(result)), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // LIST
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Belum ada order.\nCari: .prov cari <keyword>\nBeli: .prov beli <id> <link> <qty>"), "provsmm");
    let body = "Riwayat Order (" + myOrders.length + ")\n\n";
    myOrders.slice(-10).reverse().forEach((o, i) => {
      body += (i+1) + ". ID: " + o.id + "\n   " + (o.serviceName || "?").substring(0, 50) + "\n   Qty: " + o.quantity.toLocaleString("id-ID") + " | " + formatRupiah(o.price) + "\n   " + o.status + "\n";
    });
    body += "\n.prov cek <id> - cek status\n.prov refill <id> - refill\n.prov batal <id> - batal";
    return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
  }

  // REFRESH
  if (sub === "refresh" || sub === "sync") {
    if (!isOwner) return m.reply(claraWrap("provsmm", "Khusus owner!"));
    if (!data.apiKey) return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Belum setup!"), "provsmm");
    await m.react("🕐");
    try {
      const services = await getServices(data, true);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Cache di-refresh!\nTotal layanan: " + services.length), "provsmm");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", "Error: " + err.message), "provsmm");
    }
  }

  // HELP / MENU
  let body = "ProviderSMM - Social Media Services\n\n";
  body += "Fokus: Indonesia (IG, TikTok, FB, Threads, X, Roblox)\n";
  body += "98 kategori tersedia\n";
  body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
  body += "Markup: " + markup + "%\n\n";
  body += "1. Cari Layanan:\n   .prov cari <keyword>\n   .prov kategori\n\n";
  body += "2. Beli:\n   .prov beli <service_id> <link> <qty>\n\n";
  body += "3. Bayar:\n   .prov bayar <token>\n\n";
  body += "4. Cek Status:\n   .prov cek <order_id>\n\n";
  body += "5. Refill:\n   .prov refill <order_id>\n   .prov refillstatus <refill_id>\n\n";
  body += "6. Batalkan:\n   .prov batal <order_id> (refund 50%)\n\n";
  body += "7. Riwayat:\n   .prov list\n\n";
  body += "8. Saldo:\n   .prov saldo\n\n";
  body += "Contoh:\n.prov cari instagram indonesia\n.prov beli 87 https://instagram.com/p/xxx 100\n.prov bayar ABC123\n.prov cek 23501";
  if (isOwner) {
    body += "\n\n--- Owner ---\n.prov setkey <key>\n.prov setmarkup <persen>\n.prov topup <nomor> <jumlah>\n.prov refresh\nAPI: https://providersmm.id/api/v2";
  }
  return sendReplyWithNav(sock, m, claraWrap("ProviderSMM", body), "provsmm");
}

export { pluginConfig as config, handler };
