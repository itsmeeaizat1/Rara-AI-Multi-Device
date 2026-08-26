// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// FMPulsa - Pulsa, Paket Data, Token PLN, Topup Game
// Provider: FMPedia (fmpedia.id)
// Auth: user_id + api_key (md5 sign)
// API: POST https://fmpedia.id/api/prepaid
// ============================================================

const DATA_FILE = path.join(process.cwd(), "database", "fmpulsa.json");
const BASE_API = "https://fmpedia.id/api/prepaid";

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) { console.error('[fmpulsa.js]:', e.message); }
  return {
    userId: "", apiKey: "", markup: 5,
    orders: [], pendingPayments: {},
    serviceCache: null, serviceCacheAt: 0, users: {},
  };
}
function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('[fmpulsa.js]:', e.message); }
}
function getUser(data, sender) {
  if (!data.users[sender]) data.users[sender] = { balance: 0, totalOrders: 0, totalSpent: 0 };
  return data.users[sender];
}
function formatRupiah(n) { return "Rp" + Math.round(n || 0).toLocaleString("id-ID"); }
function genToken() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function genRefId() { return "FM" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 4).toUpperCase(); }

// FMPedia sign = md5(user_id + api_key)
function sign(data) {
  return crypto.createHash("md5").update(data.userId + data.apiKey).digest("hex");
}

async function fmPost(params) {
  const res = await axios.post(BASE_API, params, {
    headers: { "Content-Type": "application/json" }, timeout: 25000,
  });
  return res.data;
}

async function getServices(data, force = false) {
  if (!force && data.serviceCache && data.serviceCache.length > 0 && Date.now() - data.serviceCacheAt < 1800000) {
    return data.serviceCache;
  }
  const result = await fmPost({ key: data.apiKey, sign: sign(data), type: "service" });
  if (result.code === 200 && Array.isArray(result.data)) {
    data.serviceCache = result.data; data.serviceCacheAt = Date.now(); saveData(data);
    return result.data;
  }
  throw new Error(result.message || "Gagal mengambil daftar layanan");
}

async function placeOrder(data, serviceCode, dataNo, refId) {
  const result = await fmPost({
    key: data.apiKey, sign: sign(data), type: "order",
    service: serviceCode, data_no: dataNo, ref_id: refId,
  });
  if (result.code === 200) return result.data;
  throw new Error(result.message || "Gagal membuat order");
}

async function checkStatus(data, refId) {
  const result = await fmPost({
    key: data.apiKey, sign: sign(data), type: "status", ref_id: refId,
  });
  if (result.code === 200) return result.data;
  throw new Error(result.message || "Gagal cek status");
}

function calcPrice(basePrice, markup) {
  return Math.ceil(((basePrice || 0) * (1 + (markup || 0) / 100)) / 100) * 100;
}

const pluginConfig = {
  name: ["fmpulsa", "fm", "fmppulsa"],
  alias: ["fmpulsa", "fm", "fmppulsa", "fmpedia", "belifm", "fmp"],
  category: "tools",
  description: "Beli pulsa, paket data, token PLN, topup game via FMPedia",
  usage: ".fm\n.fm setkey <user_id>:<api_key>\n.fm saldo\n.fm kategori\n.fm cari <keyword>\n.fm beli <service_code> <nomor>\n.fm bayar <token>\n.fm cek <ref_id>\n.fm setmarkup <persen>\n.fm list",
  example: ".fm cari telkomsel\n.fm beli SL5 08123456789",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  const args = (m.text || "").trim().split(/\s+/);
  const sub = args[0] ? args[0].toLowerCase() : "";
  const arg1 = args[1] || "", arg2 = args[2] || "", arg3 = args[3] || "";
  const sender = m.sender;
  const data = loadData();
  const user = getUser(data, sender);
  const isOwner = m.isOwner || false;
  const markup = data.markup || 5;

  // SETKEY
  if (sub === "setkey" || sub === "setapi") {
    if (!isOwner) return m.reply(claraWrap("fmpulsa", "Khusus owner!"));
    const cred = arg1;
    if (!cred || !cred.includes(":")) {
      return m.reply( claraWrap("FMPulsa", "Set API (Owner)\n\n.fm setkey <user_id>:<api_key>\n\nContoh:\n.fm setkey 12345:abc123def456\n\nDaftar: https://fmpedia.id\nAPI Key di: Profile > API"), "fmpulsa");
    }
    const [userId, apiKey] = cred.split(":");
    data.userId = userId; data.apiKey = apiKey; data.serviceCache = null;
    saveData(data);
    await m.react("🐣");
    return m.reply( claraWrap("FMPulsa", "Credentials tersimpan!\nUser ID: " + userId + "\nAPI Key: " + apiKey.slice(0,6) + "..." + apiKey.slice(-4) + "\n\nCek saldo: .fm saldo"), "fmpulsa");
  }

  // SETMARKUP
  if (sub === "setmarkup" || sub === "markup") {
    if (!isOwner) return m.reply(claraWrap("fmpulsa", "Khusus owner!"));
    const pct = parseInt(arg1);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return m.reply( claraWrap("FMPulsa", "Set Markup (Owner)\n\n.fm setmarkup <persen>\n\nContoh:\n.fm setmarkup 5 (tambah 5%)\n.fm setmarkup 0 (harga pas)\n\nMarkup aktif: " + markup + "%"), "fmpulsa");
    }
    data.markup = pct; saveData(data);
    await m.react("🐣");
    return m.reply( claraWrap("FMPulsa", "Markup: " + pct + "%\n\nContoh: Pulsa 50k harga API Rp49.000\nHarga jual: " + formatRupiah(49000 * (1 + pct/100))), "fmpulsa");
  }

  // TOPUP
  if (sub === "topup") {
    if (!isOwner) return m.reply(claraWrap("fmpulsa", "Khusus owner!"));
    const target = (arg1 || "").replace(/[^0-9]/g, "");
    const amount = parseInt(arg2) || 0;
    if (!target || amount < 100) {
      return m.reply( claraWrap("FMPulsa", "Topup Saldo (Owner)\n\n.fm topup <nomor> <jumlah>\nContoh: .fm topup 628123456789 50000\nMin: Rp100"), "fmpulsa");
    }
    const targetUser = getUser(data, target + "@s.whatsapp.net");
    targetUser.balance += amount; saveData(data);
    await m.react("🐣");
    return m.reply( claraWrap("FMPulsa", "Topup Berhasil!\nUser: " + target + "\nJumlah: " + formatRupiah(amount) + "\nSaldo: " + formatRupiah(targetUser.balance)), "fmpulsa");
  }

  // SALDO
  if (sub === "saldo" || sub === "balance") {
    if (!data.userId || !data.apiKey) return m.reply( claraWrap("FMPulsa", "Belum setup!\nOwner: .fm setkey <user_id>:<api_key>"), "fmpulsa");
    await m.react("🕒");
    try {
      // FMPedia profile endpoint - cek via profile API
      const result = await fmPost({ key: data.apiKey, sign: sign(data), type: "profile" });
      await m.react("🐣");
      let body = "Saldo FMPulsa\n\n";
      if (result.data && result.data.balance !== undefined) {
        body += "Saldo API: " + formatRupiah(result.data.balance) + "\n";
      } else {
        body += "Saldo API: cek di dashboard FMPedia\n";
      }
      body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
      body += "Markup: " + markup + "%";
      return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
    } catch (err) {
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Saldo Bot: " + formatRupiah(user.balance) + "\nSaldo API: cek di https://fmpedia.id\nMarkup: " + markup + "%\n\nError: " + err.message), "fmpulsa");
    }
  }

  // KATEGORI
  if (sub === "kategori" || sub === "category") {
    if (!data.userId || !data.apiKey) return m.reply( claraWrap("FMPulsa", "Belum setup!\nOwner: .fm setkey <user_id>:<api_key>"), "fmpulsa");
    await m.react("🕒");
    try {
      const services = await getServices(data);
      const cats = {};
      services.forEach(s => {
        if (s.status === "ready") {
          const cat = (s.category && s.category.main) ? s.category.main : "Other";
          cats[cat] = (cats[cat] || 0) + 1;
        }
      });
      let body = "Kategori FMPulsa (" + Object.keys(cats).length + " kategori, " + services.length + " layanan)\n\n";
      Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
        body += cat + " (" + count + ")\n";
      });
      body += "\nCari layanan:\n.fm cari <keyword>";
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
    } catch (err) {
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Error: " + err.message), "fmpulsa");
    }
  }

  // CARI
  if (sub === "cari" || sub === "search") {
    if (!data.userId || !data.apiKey) return m.reply( claraWrap("FMPulsa", "Belum setup!\nOwner: .fm setkey <user_id>:<api_key>"), "fmpulsa");
    const keyword = (arg1 || "").toLowerCase();
    if (!keyword) {
      return m.reply( claraWrap("FMPulsa", "Cari Produk\n\n.fm cari <keyword>\n\nContoh:\n.fm cari telkomsel\n.fm cari pln\n.fm cari mobile legend\n.fm cari free fire\n.fm cari genshin\n.fm cari dana\n.fm cari wuthering\n\nLihat kategori: .fm kategori"), "fmpulsa");
    }
    await m.react("🕒");
    try {
      const services = await getServices(data);
      let filtered = services.filter(s =>
        s.status === "ready" &&
        (
          (s.name || "").toLowerCase().includes(keyword) ||
          (s.code || "").toLowerCase().includes(keyword) ||
          (s.category && s.category.main && s.category.main.toLowerCase().includes(keyword)) ||
          (s.category && s.category.type && s.category.type.toLowerCase().includes(keyword))
        )
      );
      if (filtered.length === 0) {
        await m.react("🐣");
        return m.reply( claraWrap("FMPulsa", "Tidak ada: " + keyword + "\n\nCoba:\n.fm cari telkomsel\n.fm cari pln\n.fm cari mobile legend\n.fm cari dana"), "fmpulsa");
      }
      filtered.sort((a, b) => (a.price?.current || 0) - (b.price?.current || 0));
      let body = "FMPulsa - " + keyword + "\n" + filtered.length + " produk\n\n";
      filtered.slice(0, 15).forEach((s, i) => {
        const basePrice = s.price?.current || s.price?.list?.basic || 0;
        const price = calcPrice(basePrice, markup);
        body += (i+1) + ". " + (s.name || "?").substring(0, 65) + "\n";
        body += "   Code: " + s.code + "\n";
        const cat = s.category ? (s.category.main || "?") : "?";
        const sub_cat = s.category ? (s.category.type || "") : "";
        body += "   " + cat + (sub_cat ? " | " + sub_cat : "") + "\n";
        body += "   Harga: " + formatRupiah(price) + "\n";
        if (s.note) body += "   Note: " + s.note + "\n";
        if (s.multi === "0") body += "   1x per nomor/hari\n";
        body += "\n";
      });
      if (filtered.length > 15) body += "... dan " + (filtered.length - 15) + " produk lain\n";
      body += "\nBeli: .fm beli <code> <nomor>\nContoh: .fm beli " + filtered[0].code + " 08123456789";
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
    } catch (err) {
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Error: " + err.message), "fmpulsa");
    }
  }

  // BELI
  if (sub === "beli" || sub === "buy" || sub === "pesan") {
    if (!data.userId || !data.apiKey) return m.reply( claraWrap("FMPulsa", "Belum setup!\nOwner: .fm setkey <user_id>:<api_key>"), "fmpulsa");
    const serviceCode = arg1, dataNo = arg2;
    if (!serviceCode || !dataNo) {
      return m.reply( claraWrap("FMPulsa", "Format Beli\n\n.fm beli <service_code> <nomor_tujuan>\n\nContoh:\n.fm beli SL5 08123456789 (Pulsa Tsel 5k)\n.fm beli PLN20 12345678901 (Token PLN 20k)\n.fm beli ML5 123456789 (ML Diamond 5)\n\nCari code:\n.fm cari <keyword>"), "fmpulsa");
    }
    await m.react("🕒");
    try {
      const services = await getServices(data);
      const svc = services.find(s => s.code === serviceCode);
      if (!svc) {
        await m.react("🐣");
        return m.reply( claraWrap("FMPulsa", "Code tidak ditemukan: " + serviceCode + "\n\nCari: .fm cari <keyword>"), "fmpulsa");
      }
      if (svc.status !== "ready") {
        await m.react("🐣");
        return m.reply( claraWrap("FMPulsa", "Layanan sedang gangguan!\n\nLayanan: " + svc.name + "\nStatus: " + svc.status), "fmpulsa");
      }
      const basePrice = svc.price?.current || svc.price?.list?.basic || 0;
      const price = calcPrice(basePrice, markup);
      if (user.balance < price) {
        await m.react("🐣");
        return m.reply( claraWrap("FMPulsa", "Saldo tidak cukup!\n\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nKurang: " + formatRupiah(price - user.balance) + "\n\nMinta topup:\n.fm topup " + sender.split("@")[0] + " <jumlah>"), "fmpulsa");
      }
      const token = genToken();
      data.pendingPayments[token] = {
        sender, serviceCode, dataNo, serviceName: svc.name,
        category: svc.category, price, refId: genRefId(),
        note: svc.note || "",
        createdAt: Date.now(), expiresAt: Date.now() + 300000,
      };
      saveData(data);
      await m.react("🐣");
      let body = "Konfirmasi Order FMPulsa\n\n";
      body += "Layanan: " + svc.name + "\n";
      const cat = svc.category ? (svc.category.main || "?") : "?";
      body += "Kategori: " + cat + "\n";
      body += "Code: " + serviceCode + "\n";
      body += "Tujuan: " + dataNo + "\n";
      if (svc.note) body += "Note: " + svc.note + "\n";
      body += "Harga: " + formatRupiah(price) + "\n";
      body += "Saldo: " + formatRupiah(user.balance) + "\n";
      body += "Sisa: " + formatRupiah(user.balance - price) + "\n";
      body += "\nToken: " + token + "\n\nBayar: .fm bayar " + token + "\nExpired: 5 menit";
      return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
    } catch (err) {
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Error: " + err.message), "fmpulsa");
    }
  }

  // BAYAR - Execute order, send to API
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1 ? arg1.toUpperCase() : "";
    if (!token) return m.reply( claraWrap("FMPulsa", "Masukkan token!\nContoh: .fm bayar ABC123"), "fmpulsa");
    const pending = data.pendingPayments[token];
    if (!pending) return m.reply( claraWrap("FMPulsa", "Token tidak ditemukan!"), "fmpulsa");
    if (pending.sender !== sender) return m.reply( claraWrap("FMPulsa", "Bukan token kamu!"), "fmpulsa");
    if (Date.now() > pending.expiresAt) { delete data.pendingPayments[token]; saveData(data); return m.reply( claraWrap("FMPulsa", "Token expired!"), "fmpulsa"); }
    const u = getUser(data, sender);
    if (u.balance < pending.price) { delete data.pendingPayments[token]; saveData(data); return m.reply( claraWrap("FMPulsa", "Saldo tidak cukup!"), "fmpulsa"); }
    await m.react("🕒");
    try {
      u.balance -= pending.price;
      u.totalSpent += pending.price;
      const result = await placeOrder(data, pending.serviceCode, pending.dataNo, pending.refId);
      const status = result.status || "waiting";
      const voucher = result.voucher || "";
      const apiPrice = result.price || 0;
      data.orders.push({
        refId: pending.refId, serviceCode: pending.serviceCode,
        serviceName: pending.serviceName, dataNo: pending.dataNo,
        price: pending.price, sender, status, voucher,
        apiPrice, note: pending.note,
        createdAt: new Date().toISOString(),
      });
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      u.totalOrders += 1;
      delete data.pendingPayments[token];
      saveData(data);
      await m.react("🐣");
      let body = "Order FMPulsa\n\n";
      body += "Ref ID: " + pending.refId + "\n";
      body += "Layanan: " + pending.serviceName + "\n";
      body += "Tujuan: " + pending.dataNo + "\n";
      body += "Harga: " + formatRupiah(pending.price) + "\n";
      body += "Sisa saldo: " + formatRupiah(u.balance) + "\n\n";
      body += "Status: " + status + "\n";
      if (result.note) body += "Note: " + result.note + "\n";
      if (voucher) body += "\nVoucher / SN:\n" + voucher + "\n";
      body += "\nCek status:\n.fm cek " + pending.refId;
      if (status === "success" && voucher) {
        body += "\n\n*Transaksi Berhasil!*";
      } else if (status === "waiting") {
        body += "\n\nPending. Cek lagi nanti:\n.fm cek " + pending.refId;
      } else if (status === "failed" || status === "error") {
        u.balance += pending.price;
        u.totalSpent -= pending.price;
        saveData(data);
        body += "\n\nGagal. Saldo di-refund.";
      }
      return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
    } catch (err) {
      u.balance += pending.price;
      u.totalSpent -= pending.price;
      delete data.pendingPayments[token];
      saveData(data);
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Gagal order! Saldo di-refund.\n\nError: " + err.message), "fmpulsa");
    }
  }

  // CEK
  if (sub === "cek" || sub === "check" || sub === "status") {
    const refId = arg1;
    if (!refId) return m.reply( claraWrap("FMPulsa", "Masukkan Ref ID!\nContoh: .fm cek FM1234ABC"), "fmpulsa");
    const order = data.orders.find(o => o.refId === refId && o.sender === sender);
    if (!order && !isOwner) return m.reply( claraWrap("FMPulsa", "Order tidak ditemukan!"), "fmpulsa");
    await m.react("🕒");
    try {
      const result = await checkStatus(data, refId);
      const statusData = Array.isArray(result) ? result[0] : result;
      if (order) {
        const oldStatus = order.status;
        order.status = statusData.status || order.status;
        order.voucher = statusData.voucher || order.voucher;
        if ((statusData.status === "failed" || statusData.status === "error") && oldStatus !== "failed" && oldStatus !== "error") {
          const u = getUser(data, sender);
          u.balance += order.price;
          order.status = "failed (refunded)";
        }
        saveData(data);
      }
      await m.react("🐣");
      let body = "Status Order " + refId + "\n\n";
      body += "Layanan: " + (order ? order.serviceName : "?") + "\n";
      body += "Tujuan: " + (order ? order.dataNo : "?") + "\n";
      body += "Harga: " + formatRupiah(order ? order.price : 0) + "\n\n";
      body += "Status: " + (statusData.status || "Unknown") + "\n";
      if (statusData.note) body += "Note: " + statusData.note + "\n";
      if (statusData.voucher) body += "\nVoucher / SN:\n" + statusData.voucher + "\n";
      if (statusData.price) body += "\nHarga API: " + formatRupiah(statusData.price) + "\n";
      if (statusData.status === "success" && statusData.voucher) body += "\n*Transaksi Berhasil!*";
      else if (statusData.status === "waiting") body += "\nMasih pending... cek lagi nanti";
      else if (statusData.status === "failed" || statusData.status === "error") body += "\nGagal. Saldo di-refund.";
      return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
    } catch (err) {
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Error: " + err.message), "fmpulsa");
    }
  }

  // LIST
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) return m.reply( claraWrap("FMPulsa", "Belum ada order.\nCari: .fm cari <keyword>\nBeli: .fm beli <code> <nomor>"), "fmpulsa");
    let body = "Riwayat Order (" + myOrders.length + ")\n\n";
    myOrders.slice(-10).reverse().forEach((o, i) => {
      body += (i+1) + ". " + o.refId + "\n   " + (o.serviceName || "?").substring(0, 50) + "\n   " + o.dataNo + " | " + formatRupiah(o.price) + "\n   " + o.status;
      if (o.voucher) body += " | SN: " + o.voucher.substring(0, 30);
      body += "\n";
    });
    body += "\n.fm cek <ref_id> - cek status";
    return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
  }

  // REFRESH
  if (sub === "refresh" || sub === "sync") {
    if (!isOwner) return m.reply(claraWrap("fmpulsa", "Khusus owner!"));
    if (!data.userId || !data.apiKey) return m.reply( claraWrap("FMPulsa", "Belum setup!"), "fmpulsa");
    await m.react("🕒");
    try {
      const services = await getServices(data, true);
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Cache di-refresh!\nTotal layanan: " + services.length), "fmpulsa");
    } catch (err) {
      await m.react("🐣");
      return m.reply( claraWrap("FMPulsa", "Error: " + err.message), "fmpulsa");
    }
  }

  // MENU
  let body = "FMPulsa - Produk Digital\n\n";
  body += "Provider: FMPedia\n";
  body += "Layanan: Pulsa, Paket Data, Token PLN, Topup Game, E-Money\n";
  body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
  body += "Markup: " + markup + "%\n\n";
  body += "1. Cari Produk:\n   .fm cari <keyword>\n   .fm kategori\n\n";
  body += "2. Beli:\n   .fm beli <code> <nomor_tujuan>\n\n";
  body += "3. Bayar:\n   .fm bayar <token>\n\n";
  body += "4. Cek Status:\n   .fm cek <ref_id>\n\n";
  body += "5. Riwayat:\n   .fm list\n\n";
  body += "6. Saldo:\n   .fm saldo\n\n";
  body += "Contoh:\n.fm cari telkomsel\n.fm beli SL5 08123456789\n.fm bayar ABC123\n.fm cek FM1234ABC\n\n";
  body += "Kategori populer:\nPulsa, Paket Data, Token PLN, Mobile Legends, Free Fire, Genshin, Wuthering Waves, PUBG, DANA";
  if (isOwner) {
    body += "\n\n--- Owner ---\n.fm setkey <user_id>:<api_key>\n.fm setmarkup <persen>\n.fm topup <nomor> <jumlah>\n.fm refresh\nAPI: https://fmpedia.id/api/prepaid\nDaftar: https://fmpedia.id";
  }
  return m.reply( claraWrap("FMPulsa", body), "fmpulsa");
}

export { pluginConfig as config, handler };
