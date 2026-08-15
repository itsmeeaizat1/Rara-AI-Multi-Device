import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// DigiPulsa - Pulsa, Paket Data, Token PLN, Topup Game
// Provider: DigiFlazz (api.digiflazz.com)
// Auth: username + apiKey (md5 sign)
// Flow: liat produk -> isi data -> bayar -> data dikirim API
// ============================================================

const DATA_FILE = path.join(process.cwd(), "database", "digipulsa.json");
const BASE_API = "https://api.digiflazz.com/v1";

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {}
  return {
    username: "", apiKey: "", markup: 5,
    orders: [], pendingPayments: {},
    priceCache: null, priceCacheAt: 0, users: {},
  };
}
function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch {}
}
function getUser(data, sender) {
  if (!data.users[sender]) data.users[sender] = { balance: 0, totalOrders: 0, totalSpent: 0 };
  return data.users[sender];
}
function formatRupiah(n) { return "Rp" + Math.round(n || 0).toLocaleString("id-ID"); }
function genToken() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function genRefId() { return "DG" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 4).toUpperCase(); }

function sign(data, keyword) {
  return crypto.createHash("md5").update(data.username + data.apiKey + keyword).digest("hex");
}

async function dgPost(endpoint, payload) {
  const res = await axios.post(BASE_API + endpoint, payload, {
    headers: { "Content-Type": "application/json" }, timeout: 25000,
  });
  return res.data;
}

async function cekSaldo(data) {
  const result = await dgPost("/cek-saldo", { cmd: "deposit", username: data.username, sign: sign(data, "depo") });
  if (result.data && result.data.deposit !== undefined) return result.data.deposit;
  throw new Error(result.data?.message || "Gagal cek saldo");
}

async function getPriceList(data, force = false) {
  if (!force && data.priceCache && data.priceCache.length > 0 && Date.now() - data.priceCacheAt < 1800000) return data.priceCache;
  const result = await dgPost("/price-list", { cmd: "prepaid", username: data.username, sign: sign(data, "pricelist") });
  if (result.data && Array.isArray(result.data)) {
    data.priceCache = result.data; data.priceCacheAt = Date.now(); saveData(data);
    return result.data;
  }
  throw new Error(result.data?.message || "Gagal mengambil daftar harga");
}

async function topup(data, sku, customerNo, refId) {
  const payload = { username: data.username, buyer_sku_code: sku, customer_no: customerNo, ref_id: refId, sign: sign(data, refId) };
  const result = await dgPost("/transaction", payload);
  if (result.data) return result.data;
  throw new Error(result.data?.message || "Gagal topup");
}

function calcPrice(basePrice, markup) {
  return Math.ceil(((basePrice || 0) * (1 + (markup || 0) / 100)) / 100) * 100;
}

const pluginConfig = {
  name: ["digipulsa", "dg", "pulsa"],
  alias: ["digiflazz", "belipulsa", "topupgame"],
  category: "tools",
  description: "Beli pulsa, paket data, token PLN, topup game via DigiFlazz",
  usage: ".dg\n.dg setkey <username>:<apiKey>\n.dg saldo\n.dg kategori\n.dg cari <keyword>\n.dg beli <sku_code> <nomor>\n.dg bayar <token>\n.dg cek <ref_id>\n.dg setmarkup <persen>\n.dg list",
  example: ".dg cari telkomsel\n.dg beli S5 08123456789",
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
    if (!isOwner) return m.reply(claraWrap(" + username + ", "Khusus owner!"));
    const cred = arg1;
    if (!cred || !cred.includes(":")) {
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Set API (Owner)\n\n.dg setkey <username>:<apiKey>\n\nContoh:\n.dg setkey user123:abc123def456\n\nDaftar: https://digiflazz.com\nAPI settings: Profile > Koneksi API"), "digipulsa");
    }
    const [username, apiKey] = cred.split(":");
    data.username = username; data.apiKey = apiKey; data.priceCache = null;
    saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Credentials tersimpan!\nUsername: " + username + "\nAPI Key: " + apiKey.slice(0,6) + "..." + apiKey.slice(-4) + "\n\nCek saldo: .dg saldo"), "digipulsa");
  }

  // SETMARKUP
  if (sub === "setmarkup" || sub === "markup") {
    if (!isOwner) return m.reply(claraWrap(" + username + ", "Khusus owner!"));
    const pct = parseInt(arg1);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Set Markup (Owner)\n\n.dg setmarkup <persen>\n\nContoh:\n.dg setmarkup 5 (tambah 5%)\n.dg setmarkup 0 (harga pas)\n\nMarkup aktif: " + markup + "%"), "digipulsa");
    }
    data.markup = pct; saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Markup: " + pct + "%\n\nContoh: Pulsa 50k harga API Rp49.000\nHarga jual: " + formatRupiah(49000 * (1 + pct/100))), "digipulsa");
  }

  // TOPUP
  if (sub === "topup") {
    if (!isOwner) return m.reply(claraWrap(" + username + ", "Khusus owner!"));
    const target = (arg1 || "").replace(/[^0-9]/g, "");
    const amount = parseInt(arg2) || 0;
    if (!target || amount < 100) {
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Topup Saldo (Owner)\n\n.dg topup <nomor> <jumlah>\nContoh: .dg topup 628123456789 50000\nMin: Rp100"), "digipulsa");
    }
    const targetUser = getUser(data, target + "@s.whatsapp.net");
    targetUser.balance += amount; saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Topup Berhasil!\nUser: " + target + "\nJumlah: " + formatRupiah(amount) + "\nSaldo: " + formatRupiah(targetUser.balance)), "digipulsa");
  }

  // SALDO
  if (sub === "saldo" || sub === "balance") {
    if (!data.username || !data.apiKey) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Belum setup!\nOwner: .dg setkey <username>:<apiKey>"), "digipulsa");
    await m.react("🕐");
    try {
      const saldo = await cekSaldo(data);
      await m.react("✅");
      let body = "Saldo DigiPulsa\n\n";
      body += "Saldo API: " + formatRupiah(saldo) + "\n";
      body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
      body += "Markup: " + markup + "%";
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Error: " + err.message), "digipulsa");
    }
  }

  // KATEGORI
  if (sub === "kategori" || sub === "category") {
    if (!data.username || !data.apiKey) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Belum setup!\nOwner: .dg setkey <username>:<apiKey>"), "digipulsa");
    await m.react("🕐");
    try {
      const products = await getPriceList(data);
      const cats = {};
      products.forEach(p => {
        if (p.buyer_product_status && p.seller_product_status) {
          const c = p.category || "Other";
          cats[c] = (cats[c] || 0) + 1;
        }
      });
      let body = "Kategori DigiPulsa (" + Object.keys(cats).length + " kategori, " + products.length + " produk)\n\n";
      Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
        body += cat + " (" + count + " produk)\n";
      });
      body += "\nCari produk:\n.dg cari <keyword>";
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Error: " + err.message), "digipulsa");
    }
  }

  // CARI
  if (sub === "cari" || sub === "search" || sub === "carijasa") {
    if (!data.username || !data.apiKey) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Belum setup!\nOwner: .dg setkey <username>:<apiKey>"), "digipulsa");
    const keyword = (arg1 || "").toLowerCase();
    if (!keyword) {
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Cari Produk\n\n.dg cari <keyword>\n\nContoh:\n.dg cari telkomsel\n.dg cari pln\n.dg cari mobile legend\n.dg cari free fire\n.dg cari genshin\n.dg cari dana\n.dg cari wifi\n\nLihat kategori: .dg kategori"), "digipulsa");
    }
    await m.react("🕐");
    try {
      const products = await getPriceList(data);
      let filtered = products.filter(p =>
        p.buyer_product_status && p.seller_product_status &&
        (
          (p.product_name || "").toLowerCase().includes(keyword) ||
          (p.brand || "").toLowerCase().includes(keyword) ||
          (p.category || "").toLowerCase().includes(keyword) ||
          (p.buyer_sku_code || "").toLowerCase().includes(keyword)
        )
      );
      if (filtered.length === 0) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Tidak ada: " + keyword + "\n\nCoba:\n.dg cari telkomsel\n.dg cari pln\n.dg cari mobile legend\n.dg cari dana"), "digipulsa");
      }
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      let body = "DigiPulsa - " + keyword + "\n" + filtered.length + " produk\n\n";
      filtered.slice(0, 15).forEach((p, i) => {
        const price = calcPrice(p.price, markup);
        body += (i+1) + ". " + (p.product_name || "?").substring(0, 65) + "\n";
        body += "   SKU: " + p.buyer_sku_code + "\n";
        body += "   " + (p.category || "?") + " | " + (p.brand || "?") + "\n";
        body += "   Harga: " + formatRupiah(price) + "\n";
        if (p.unlimited_stock) body += "   Stok: Unlimited\n";
        else if (p.stock !== undefined && p.stock > 0) body += "   Stok: " + p.stock + "\n";
        if (p.start_cut_off && p.start_cut_off !== "00:00") body += "   Cut Off: " + p.start_cut_off + "-" + p.end_cut_off + "\n";
        body += "\n";
      });
      if (filtered.length > 15) body += "... dan " + (filtered.length - 15) + " produk lain\n";
      body += "\nBeli: .dg beli <sku_code> <nomor>\nContoh: .dg beli " + filtered[0].buyer_sku_code + " 08123456789";
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Error: " + err.message), "digipulsa");
    }
  }

  // BELI
  if (sub === "beli" || sub === "buy" || sub === "pesan") {
    if (!data.username || !data.apiKey) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Belum setup!\nOwner: .dg setkey <username>:<apiKey>"), "digipulsa");
    const sku = arg1, customerNo = arg2;
    if (!sku || !customerNo) {
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Format Beli\n\n.dg beli <sku_code> <nomor_tujuan>\n\nContoh:\n.dg beli S5 08123456789 (Pulsa Tsel 5k)\n.dg beli PLN20 12345678901 (Token PLN 20k)\n.dg beli ML5 123456789 (ML Diamond 5)\n.dg beli DANA5000 08123456789 (Topup DANA 5k)\n\nCari SKU:\n.dg cari <keyword>"), "digipulsa");
    }
    await m.react("🕐");
    try {
      const products = await getPriceList(data);
      const prod = products.find(p => p.buyer_sku_code === sku);
      if (!prod) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "SKU tidak ditemukan: " + sku + "\n\nCari: .dg cari <keyword>"), "digipulsa");
      }
      if (!prod.buyer_product_status || !prod.seller_product_status) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Produk sedang gangguan!\n\nProduk: " + prod.product_name), "digipulsa");
      }
      const price = calcPrice(prod.price, markup);
      if (user.balance < price) {
        await m.react("✅");
        return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Saldo tidak cukup!\n\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nKurang: " + formatRupiah(price - user.balance) + "\n\nMinta topup:\n.dg topup " + sender.split("@")[0] + " <jumlah>"), "digipulsa");
      }
      const token = genToken();
      data.pendingPayments[token] = {
        sender, sku, customerNo, productName: prod.product_name,
        category: prod.category, brand: prod.brand, price,
        refId: genRefId(), createdAt: Date.now(), expiresAt: Date.now() + 300000,
      };
      saveData(data);
      await m.react("✅");
      let body = "Konfirmasi Order DigiPulsa\n\n";
      body += "Produk: " + prod.product_name + "\n";
      body += "Kategori: " + (prod.category || "?") + "\n";
      body += "Brand: " + (prod.brand || "?") + "\n";
      body += "SKU: " + sku + "\n";
      body += "Tujuan: " + customerNo + "\n";
      body += "Harga: " + formatRupiah(price) + "\n";
      body += "Saldo: " + formatRupiah(user.balance) + "\n";
      body += "Sisa: " + formatRupiah(user.balance - price) + "\n";
      body += "\nToken: " + token + "\n\nBayar: .dg bayar " + token + "\nExpired: 5 menit";
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Error: " + err.message), "digipulsa");
    }
  }

  // BAYAR - Execute order, send to API
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1 ? arg1.toUpperCase() : "";
    if (!token) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Masukkan token!\nContoh: .dg bayar ABC123"), "digipulsa");
    const pending = data.pendingPayments[token];
    if (!pending) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Token tidak ditemukan!"), "digipulsa");
    if (pending.sender !== sender) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Bukan token kamu!"), "digipulsa");
    if (Date.now() > pending.expiresAt) { delete data.pendingPayments[token]; saveData(data); return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Token expired!"), "digipulsa"); }
    const u = getUser(data, sender);
    if (u.balance < pending.price) { delete data.pendingPayments[token]; saveData(data); return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Saldo tidak cukup!"), "digipulsa"); }
    await m.react("🕐");
    try {
      u.balance -= pending.price;
      u.totalSpent += pending.price;
      const result = await topup(data, pending.sku, pending.customerNo, pending.refId);
      data.orders.push({
        refId: pending.refId, sku: pending.sku, productName: pending.productName,
        category: pending.category, brand: pending.brand, customerNo: pending.customerNo,
        price: pending.price, sender, status: result.status || "Pending",
        sn: result.sn || "", rc: result.rc || "", message: result.message || "",
        apiPrice: result.price || 0, createdAt: new Date().toISOString(),
      });
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      u.totalOrders += 1;
      delete data.pendingPayments[token];
      saveData(data);
      await m.react("✅");
      let body = "Order DigiPulsa\n\n";
      body += "Ref ID: " + pending.refId + "\n";
      body += "Produk: " + pending.productName + "\n";
      body += "Tujuan: " + pending.customerNo + "\n";
      body += "Harga: " + formatRupiah(pending.price) + "\n";
      body += "Sisa saldo: " + formatRupiah(u.balance) + "\n\n";
      body += "Status: " + (result.status || "Unknown") + "\n";
      body += "Pesan: " + (result.message || "-") + "\n";
      if (result.sn) body += "\nSerial Number / Token:\n" + result.sn + "\n";
      body += "\nCek status:\n.dg cek " + pending.refId;
      if (result.status === "Sukses" && result.sn) {
        body += "\n\n*Transaksi Berhasil!*";
      } else if (result.status === "Pending") {
        body += "\n\nPending. Cek lagi nanti:\n.dg cek " + pending.refId;
      } else if (result.status === "Gagal") {
        u.balance += pending.price;
        u.totalSpent -= pending.price;
        saveData(data);
        body += "\n\nGagal. Saldo di-refund.";
      }
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
    } catch (err) {
      u.balance += pending.price;
      u.totalSpent -= pending.price;
      delete data.pendingPayments[token];
      saveData(data);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Gagal order! Saldo di-refund.\n\nError: " + err.message), "digipulsa");
    }
  }

  // CEK
  if (sub === "cek" || sub === "check" || sub === "status") {
    const refId = arg1;
    if (!refId) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Masukkan Ref ID!\nContoh: .dg cek DG1234ABC"), "digipulsa");
    const order = data.orders.find(o => o.refId === refId && o.sender === sender);
    if (!order && !isOwner) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Order tidak ditemukan!"), "digipulsa");
    await m.react("🕐");
    try {
      const result = await topup(data, order ? order.sku : "", order ? order.customerNo : "", refId);
      if (order) {
        const oldStatus = order.status;
        order.status = result.status || order.status;
        order.sn = result.sn || order.sn;
        order.message = result.message || order.message;
        order.rc = result.rc || order.rc;
        if (result.status === "Gagal" && oldStatus !== "Gagal" && oldStatus !== "Gagal (Refunded)") {
          const u = getUser(data, sender);
          u.balance += order.price;
          order.status = "Gagal (Refunded)";
        }
        saveData(data);
      }
      await m.react("✅");
      let body = "Status Order " + refId + "\n\n";
      body += "Produk: " + (order ? order.productName : "?") + "\n";
      body += "Tujuan: " + (order ? order.customerNo : "?") + "\n";
      body += "Harga: " + formatRupiah(order ? order.price : 0) + "\n\n";
      body += "Status: " + (result.status || "Unknown") + "\n";
      body += "Pesan: " + (result.message || "-") + "\n";
      if (result.sn) body += "\nSerial Number / Token:\n" + result.sn + "\n";
      if (result.status === "Sukses" && result.sn) body += "\n*Transaksi Berhasil!*";
      else if (result.status === "Pending") body += "\nMasih pending... cek lagi nanti";
      else if (result.status === "Gagal") body += "\nGagal. Saldo di-refund.";
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Error: " + err.message), "digipulsa");
    }
  }

  // LIST
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Belum ada order.\nCari: .dg cari <keyword>\nBeli: .dg beli <sku> <nomor>"), "digipulsa");
    let body = "Riwayat Order (" + myOrders.length + ")\n\n";
    myOrders.slice(-10).reverse().forEach((o, i) => {
      body += (i+1) + ". " + o.refId + "\n   " + (o.productName || "?").substring(0, 50) + "\n   " + o.customerNo + " | " + formatRupiah(o.price) + "\n   " + o.status;
      if (o.sn) body += " | SN: " + o.sn.substring(0, 30);
      body += "\n";
    });
    body += "\n.dg cek <ref_id> - cek status";
    return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
  }

  // REFRESH
  if (sub === "refresh" || sub === "sync") {
    if (!isOwner) return m.reply(claraWrap(" + username + ", "Khusus owner!"));
    if (!data.username || !data.apiKey) return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Belum setup!"), "digipulsa");
    await m.react("🕐");
    try {
      const products = await getPriceList(data, true);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Cache di-refresh!\nTotal produk: " + products.length), "digipulsa");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", "Error: " + err.message), "digipulsa");
    }
  }

  // MENU
  let body = "DigiPulsa - Produk Digital\n\n";
  body += "Provider: DigiFlazz\n";
  body += "Layanan: Pulsa, Paket Data, Token PLN, Topup Game, E-Money\n";
  body += "Saldo Bot: " + formatRupiah(user.balance) + "\n";
  body += "Markup: " + markup + "%\n\n";
  body += "1. Cari Produk:\n   .dg cari <keyword>\n   .dg kategori\n\n";
  body += "2. Beli:\n   .dg beli <sku_code> <nomor_tujuan>\n\n";
  body += "3. Bayar:\n   .dg bayar <token>\n\n";
  body += "4. Cek Status:\n   .dg cek <ref_id>\n\n";
  body += "5. Riwayat:\n   .dg list\n\n";
  body += "6. Saldo:\n   .dg saldo\n\n";
  body += "Contoh:\n.dg cari telkomsel\n.dg beli S5 08123456789\n.dg bayar ABC123\n.dg cek DG1234ABC\n\n";
  body += "Kategori populer:\nPulsa, Paket Data, Token PLN, Mobile Legends, Free Fire, Genshin, PUBG, DANA, OVO, GoPay, WiFi";
  if (isOwner) {
    body += "\n\n--- Owner ---\n.dg setkey <username>:<apiKey>\n.dg setmarkup <persen>\n.dg topup <nomor> <jumlah>\n.dg refresh\nAPI: https://api.digiflazz.com/v1\nDaftar: https://digiflazz.com";
  }
  return sendReplyWithNav(sock, m, claraWrap("DigiPulsa", body), "digipulsa");
}

export default { pluginConfig, handler };
