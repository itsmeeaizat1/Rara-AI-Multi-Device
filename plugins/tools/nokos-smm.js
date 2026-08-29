// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import fs from "fs";
import path from "path";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// NexusSMM - SMM Services (Followers, Likes, Views)
// Supports: Instagram, Telegram, TikTok, YouTube, dll
// Provider: NexusSMM (nexussmm.com)
// ============================================================

const DATA_FILE = path.join(process.cwd(), "database", "nokos_smm.json");
const NEXUS_BASE = "https://nexussmm.com";

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) { console.error('[nokos-smm.js]:', e.message); }
  return { apiId: "", apiKey: "", orders: [], pendingPayments: {}, servicesCache: null, servicesCacheAt: 0 };
}
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[nokos-smm.js]:', e.message); }
}

async function nexusRequest(endpoint, params) {
  const res = await axios.post(NEXUS_BASE + endpoint, new URLSearchParams(params).toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000
  });
  return res.data;
}

async function getServices(data, force = false) {
  if (!force && data.servicesCache && data.servicesCache.length > 0 && Date.now() - data.servicesCacheAt < 3600000) {
    return data.servicesCache;
  }
  const result = await nexusRequest("/api/services", { api_id: data.apiId, api_key: data.apiKey });
  if (!result.status) throw new Error(result.data || "Gagal ambil nih layanan");
  data.servicesCache = result.data;
  data.servicesCacheAt = Date.now();
  saveData(data);
  return result.data;
}

async function createOrder(data, serviceId, target, quantity) {
  const result = await nexusRequest("/api/order", {
    api_id: data.apiId, api_key: data.apiKey,
    service: String(serviceId), target: String(target), quantity: String(quantity)
  });
  if (!result.status) throw new Error(result.data || "Gagal bikin nih order");
  return { id: result.data.order_id || result.data.id || "", status: result.data.status || "PENDING" };
}

async function checkStatus(data, orderId) {
  const result = await nexusRequest("/api/status", { api_id: data.apiId, api_key: data.apiKey, id: String(orderId) });
  if (!result.status) throw new Error(result.data || "Gagal cek status");
  return result.data;
}

async function getProfile(data) {
  const result = await nexusRequest("/api/profile", { api_id: data.apiId, api_key: data.apiKey });
  if (!result.status) throw new Error("Gagal cek profil");
  return result.data;
}

function formatRupiah(n) {
  return "Rp" + (n || 0).toLocaleString("id-ID");
}

function genToken() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const pluginConfig = {
  name: ["nokossmm", "smm", "suntik"],
  alias: ["nokos-smm", "nokossmm", "smm", "suntik"],
  category: "tools",
  description: "Beli SMM services (followers, likes, views) via NexusSMM",
  usage: ".smm\n.smm setkey <api_id>:<api_key>\n.smm saldo\n.smm cari <keyword>\n.smm beli <service_id> <target> <qty>\n.smm bayar <token>\n.smm cek <order_id>\n.smm list",
  example: ".smm cari instagram follower\n.smm beli 11010 https://t.me/test 100",
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
  const isOwner = m.isOwner || false;

  // SETKEY
  if (sub === "setkey" || sub === "setapi") {
    if (!isOwner) return m.reply(claraWrap(" + profile.username + ", "Khusus owner!"));
    const key = arg1;
    if (!key || !key.includes(":")) {
      return m.reply( claraWrap("NexusSMM", "Set API Key (Owner)\n\n.smm setkey <api_id>:<api_key>\n\nContoh:\n.smm setkey SHizVS9:531446-ed17f7\n\nDaftar: https://nexussmm.com"), "smm");
    }
    const parts = key.split(":");
    data.apiId = parts[0]; data.apiKey = parts.slice(1).join(":"); saveData(data);
    return m.reply( claraWrap("NexusSMM", "API Key tersimpan!\nAPI ID: " + data.apiId.slice(0,6) + "...\nAPI Key: " + data.apiKey.slice(0,6) + "..." + data.apiKey.slice(-4)), "smm");
  }

  // SALDO
  if (sub === "saldo" || sub === "balance") {
    if (!data.apiId) return m.reply( claraWrap("NexusSMM", "Belum setup!\nOwner: .smm setkey <api_id>:<api_key>"), "smm");
    try {
      const profile = await getProfile(data);
      return m.reply(claraWrap("NexusSMM", `Profil NexusSMM\n\nUsername: nokos-smm\nNama: ${profile.full_name}\nLevel: ${profile.level}\nSaldo: ${formatRupiah(parseInt(profile.balance) || 0)}\nTerdaftar: ${profile.registered || "-"}`), "smm");
    } catch (err) {
      return m.reply( claraWrap("NexusSMM", "Error: " + err.message), "smm");
    }
  }

  // CARI - Search SMM services
  if (sub === "cari" || sub === "search" || sub === "carijasa") {
    if (!data.apiId) return m.reply( claraWrap("NexusSMM", "Belum setup!\nOwner: .smm setkey <api_id>:<api_key>"), "smm");
    const keyword = (arg1 || "").toLowerCase();
    const categoryFilter = arg2 ? arg2.toLowerCase() : "";
    if (!keyword) return m.reply( claraWrap("NexusSMM", "Cari Layanan SMM\n\n.smm cari <keyword> [kategori]\n\nContoh:\n.smm cari instagram follower\n.smm cari telegram views\n.smm cari tiktok likes\n.smm cari youtube\n\nKategori populer: Instagram, Telegram, TikTok, YouTube, Facebook, Twitter"), "smm");
    try {
      const services = await getServices(data);
      let filtered = services.filter(s =>
        (s.name || "").toLowerCase().includes(keyword) ||
        (s.category || "").toLowerCase().includes(keyword)
      );
      if (categoryFilter) filtered = filtered.filter(s => (s.category || "").toLowerCase().includes(categoryFilter));
      if (filtered.length === 0) {
        return m.reply( claraWrap("NexusSMM", "Tidak ada layanan untuk: " + keyword + "\n\nCoba keyword lain:\n.smm cari instagram\n.smm cari telegram\n.smm cari tiktok\n.smm cari youtube"), "smm");
      }
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      let body = "NexusSMM - " + keyword + (categoryFilter ? " (" + categoryFilter + ")" : "") + "\n\n" + filtered.length + " layanan ditemukan\n\n";
      filtered.slice(0, 15).forEach((s, i) => {
        const price = parseFloat(s.price) || 0;
        body += (i+1) + ". ID: " + s.service_id + "\n   " + (s.name || "?").substring(0, 60) + "\n   Kategori: " + (s.category || "?") + "\n   Harga: " + formatRupiah(Math.round(price)) + "\n   Min: " + (s.min || "?") + " | Max: " + (s.max || "?") + "\n\n";
      });
      if (filtered.length > 15) body += "... dan " + (filtered.length - 15) + " layanan lain\n";
      body += "\nBeli: .smm beli <service_id> <target> <qty>\n💡 *Contoh:* .smm beli " + filtered[0].service_id + " @username 100";
      return m.reply( claraWrap("NexusSMM", body), "smm");
    } catch (err) {
      return m.reply( claraWrap("NexusSMM", "Error: " + err.message), "smm");
    }
  }

  // BELI - Start order flow
  if (sub === "beli" || sub === "buy" || sub === "pesan") {
    if (!data.apiId) return m.reply( claraWrap("NexusSMM", "Belum setup!\nOwner: .smm setkey <api_id>:<api_key>"), "smm");
    const serviceId = arg1;
    const target = arg2;
    const quantity = parseInt(arg3) || 0;
    if (!serviceId || !target || !quantity) {
      return m.reply( claraWrap("NexusSMM", "Format beli SMM\n\n.smm beli <service_id> <target> <qty>\n\nContoh:\n.smm beli 11010 https://t.me/test 100\n.smm beli 5320448 @username 500\n\nCari service_id:\n.smm cari instagram follower"), "smm");
    }
    try {
      const services = await getServices(data);
      const svc = services.find(s => String(s.service_id) === String(serviceId));
      if (!svc) {
        return m.reply( claraWrap("NexusSMM", "Service ID tidak ditemukan: " + serviceId + "\n\nCari: .smm cari <keyword>"), "smm");
      }
      const minQ = parseInt(svc.min) || 1;
      const maxQ = parseInt(svc.max) || 999999;
      if (quantity < minQ || quantity > maxQ) {
        return m.reply( claraWrap("NexusSMM", "Quantity tidak valid!\n\nMin: " + minQ + "\nMax: " + maxQ + "\nInput: " + quantity), "smm");
      }
      const pricePerUnit = parseFloat(svc.price) || 0;
      const totalPrice = Math.round(pricePerUnit * quantity / 1000);
      const token = genToken();
      data.pendingPayments[token] = { sender, serviceId, target, quantity, serviceName: svc.name, category: svc.category, price: totalPrice, createdAt: Date.now(), expiresAt: Date.now() + 300000 };
      saveData(data);
      return m.reply( claraWrap("NexusSMM", "Konfirmasi Order SMM\n\nLayanan: " + svc.name + "\nKategori: " + svc.category + "\nTarget: " + target + "\nQuantity: " + quantity + "\n\nHarga: " + formatRupiah(totalPrice) + "\n\nToken: " + token + "\n\nBayar: .smm bayar " + token + "\nExpired: 5 menit\n\nCatatan: Pastikan target benar. Order yang sudah berjalan tidak bisa dibatalkan."), "smm");
    } catch (err) {
      return m.reply( claraWrap("NexusSMM", "Error: " + err.message), "smm");
    }
  }

  // BAYAR
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1 ? arg1.toUpperCase() : "";
    if (!token) return m.reply( claraWrap("NexusSMM", "Masukkan token!\n💡 *Contoh:* .smm bayar ABC123"), "smm");
    const pending = data.pendingPayments[token];
    if (!pending) return m.reply( claraWrap("NexusSMM", "Token tidak ditemukan!"), "smm");
    if (pending.sender !== sender) return m.reply( claraWrap("NexusSMM", "Bukan token kamu!"), "smm");
    if (Date.now() > pending.expiresAt) { delete data.pendingPayments[token]; saveData(data); return m.reply( claraWrap("NexusSMM", "Token expired!"), "smm"); }
    try {
      const order = await createOrder(data, pending.serviceId, pending.target, pending.quantity);
      data.orders.push({ id: String(order.id), serviceId: pending.serviceId, serviceName: pending.serviceName, category: pending.category, target: pending.target, quantity: pending.quantity, price: pending.price, sender, status: "PENDING", createdAt: new Date().toISOString() });
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      delete data.pendingPayments[token]; saveData(data);
      return m.reply( claraWrap("NexusSMM", "Order Berhasil!\n\nOrder ID: " + order.id + "\nLayanan: " + pending.serviceName + "\nTarget: " + pending.target + "\nQuantity: " + pending.quantity + "\nHarga: " + formatRupiah(pending.price) + "\n\nCek status:\n.smm cek " + order.id + "\n\nCatatan: SMM order butuh waktu 0-1 jam untuk mulai."), "smm");
    } catch (err) {
      delete data.pendingPayments[token]; saveData(data);
      return m.reply( claraWrap("NexusSMM", "Gagal order! Saldo NexusSMM tidak dipotong di sistem ini.\n\nError: " + err.message + "\n\nSaldo NexusSMM dibebankan langsung oleh provider.\nCek saldo: .smm saldo"), "smm");
    }
  }

  // CEK - Check order status
  if (sub === "cek" || sub === "check" || sub === "status") {
    const orderId = arg1;
    if (!orderId) return m.reply( claraWrap("NexusSMM", "Masukkan Order ID!\n💡 *Contoh:* .smm cek 12345"), "smm");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return m.reply( claraWrap("NexusSMM", "Order tidak ditemukan!"), "smm");
    try {
      const result = await checkStatus(data, orderId);
      let body = "Order SMM #" + orderId + "\n\nLayanan: " + (order ? order.serviceName : "?") + "\nTarget: " + (order ? order.target : "?") + "\nQuantity: " + (order ? order.quantity : "?") + "\n\n";
      if (typeof result === "object") {
        body += "Status: " + (result.status || "UNKNOWN") + "\n";
        body += "Start count: " + (result.start_count || "-") + "\n";
        body += "Remains: " + (result.remains || "0") + "\n";
        body += "Progress: " + (result.progress || "-") + "\n";
      } else {
        body += "Status: " + result + "\n";
      }
      return m.reply( claraWrap("NexusSMM", body), "smm");
    } catch (err) {
      return m.reply( claraWrap("NexusSMM", "Error: " + err.message), "smm");
    }
  }

  // LIST
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) return m.reply( claraWrap("NexusSMM", "Belum ada order.\nCari: .smm cari <keyword>\nBeli: .smm beli <id> <target> <qty>"), "smm");
    let body = "Riwayat SMM (" + myOrders.length + ")\n\n";
    myOrders.slice(-10).reverse().forEach((o, i) => {
      body += (i+1) + ". ID: " + o.id + "\n   " + (o.serviceName || "?").substring(0, 50) + "\n   Target: " + o.target + " | " + o.quantity + " pcs\n   " + formatRupiah(o.price) + " | " + o.status + "\n";
    });
    body += "\n.smm cek <id> - cek status";
    return m.reply( claraWrap("NexusSMM", body), "smm");
  }

  // KATEGORI - Show available categories
  if (sub === "kategori" || sub === "category") {
    if (!data.apiId) return m.reply( claraWrap("NexusSMM", "Belum setup!\nOwner: .smm setkey <api_id>:<api_key>"), "smm");
    try {
      const services = await getServices(data);
      const categories = {};
      services.forEach(s => { const cat = s.category || "Other"; categories[cat] = (categories[cat] || 0) + 1; });
      let body = "Kategori NexusSMM (" + Object.keys(categories).length + ")\n\n";
      Object.entries(categories).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
        body += cat + " (" + count + ")\n";
      });
      body += "\nCari layanan:\n.smm cari <keyword>";
      return m.reply( claraWrap("NexusSMM", body), "smm");
    } catch (err) {
      return m.reply( claraWrap("NexusSMM", "Error: " + err.message), "smm");
    }
  }

  // HELP / MENU
  let body = "NexusSMM - Social Media Services\n\n";
  body += "Layanan: Followers, Likes, Views, dll\n";
  body += "Platform: Instagram, Telegram, TikTok, YouTube, FB, Twitter\n\n";
  body += "1. Set API (Owner):\n   .smm setkey <api_id>:<api_key>\n\n";
  body += "2. Cek Saldo:\n   .smm saldo\n\n";
  body += "3. Cari Layanan:\n   .smm cari <keyword> [kategori]\n   .smm kategori\n\n";
  body += "4. Beli:\n   .smm beli <service_id> <target> <qty>\n\n";
  body += "5. Bayar:\n   .smm bayar <token>\n\n";
  body += "6. Cek Status:\n   .smm cek <order_id>\n\n";
  body += "7. Riwayat:\n   .smm list\n\n";
  body += "Contoh:\n.smm cari instagram follower\n.smm beli 11010 @username 100\n.smm bayar ABC123\n.smm cek 12345";
  if (isOwner && data.apiId) {
    body += "\n\n--- Owner ---\nAPI ID: " + data.apiId.slice(0,6) + "...";
  }
  return m.reply( claraWrap("NexusSMM", body), "smm");
}

export { pluginConfig as config, handler };
