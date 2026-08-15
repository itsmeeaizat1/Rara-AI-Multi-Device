import axios from "axios";
import fs from "fs";
import path from "path";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// Nokos Beli v3 - Multi-Tier Pricing
// Budget (Rp1000) / Standard / Premium
// Providers: 5SIM, SMS-Activate, SMS-Hub
// ============================================================

const DATA_FILE = path.join(process.cwd(), "database", "nokos_beli.json");

// === TIER SYSTEM ===
const TIERS = {
  budget: {
    name: "Budget",
    desc: "Termurah! Cocok untuk coba-coba",
    multiplier: 0.2,
    note: "Success rate lebih rendah, nomor bisa reuse",
  },
  standard: {
    name: "Standard",
    desc: "Balance antara harga & success rate",
    multiplier: 1.0,
    note: "Success rate normal, nomor fresh",
  },
  premium: {
    name: "Premium",
    desc: "Success rate tinggi, nomor private",
    multiplier: 1.8,
    note: "Success rate tinggi, nomor exclusive",
  },
};

const COUNTRIES = {
  // Asia Tenggara
  6: { name: "Indonesia", wa: 5000, tg: 4000, ig: 3000, fb: 3000, gmail: 4000, tiktok: 3500 },
  7: { name: "Malaysia", wa: 5000, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  10: { name: "Vietnam", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  117: { name: "Thailand", wa: 5000, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  187: { name: "Philippines", wa: 5000, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  8: { name: "Singapore", wa: 6000, tg: 4500, ig: 4000, fb: 4000, gmail: 4500, tiktok: 4000 },
  9: { name: "Cambodia", wa: 4000, tg: 3000, ig: 2500, fb: 2500, gmail: 3000, tiktok: 2500 },
  191: { name: "Myanmar", wa: 3500, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  5: { name: "Laos", wa: 4000, tg: 3000, ig: 2500, fb: 2500, gmail: 3000, tiktok: 2500 },
  // Asia Timur & Selatan
  22: { name: "India", wa: 4000, tg: 3000, ig: 2500, fb: 2500, gmail: 3000, tiktok: 3000 },
  18: { name: "Japan", wa: 7000, tg: 5000, ig: 4500, fb: 4500, gmail: 5000, tiktok: 5000 },
  13: { name: "China", wa: 6000, tg: 4500, ig: 4000, fb: 4000, gmail: 5000, tiktok: 4500 },
  173: { name: "Taiwan", wa: 5000, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  82: { name: "South Korea", wa: 7000, tg: 5000, ig: 4500, fb: 4500, gmail: 5000, tiktok: 5000 },
  114: { name: "Pakistan", wa: 3500, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  152: { name: "Bangladesh", wa: 3500, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  62: { name: "Uzbekistan", wa: 3500, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  192: { name: "Nepal", wa: 3500, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  198: { name: "Sri Lanka", wa: 3500, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  // Eropa
  16: { name: "UK", wa: 7000, tg: 5000, ig: 4500, fb: 4500, gmail: 5000, tiktok: 5000 },
  73: { name: "France", wa: 6000, tg: 4500, ig: 4000, fb: 4000, gmail: 4500, tiktok: 4500 },
  43: { name: "Germany", wa: 6000, tg: 4500, ig: 4000, fb: 4000, gmail: 4500, tiktok: 4500 },
  36: { name: "Canada", wa: 7000, tg: 5000, ig: 4500, fb: 4500, gmail: 5000, tiktok: 5000 },
  15: { name: "Spain", wa: 5500, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  33: { name: "Italy", wa: 5500, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  85: { name: "Netherlands", wa: 5500, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  174: { name: "Poland", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  37: { name: "Finland", wa: 5000, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  // Amerika
  12: { name: "USA", wa: 8000, tg: 6000, ig: 5000, fb: 5000, gmail: 6000, tiktok: 5500 },
  78: { name: "Brazil", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  177: { name: "Mexico", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  // Afrika
  131: { name: "Nigeria", wa: 3500, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  158: { name: "South Africa", wa: 4000, tg: 3000, ig: 2500, fb: 2500, gmail: 3000, tiktok: 2500 },
  // Timur Tengah
  0: { name: "Russia", wa: 3000, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  54: { name: "Turkey", wa: 4000, tg: 3000, ig: 2500, fb: 2500, gmail: 3000, tiktok: 2500 },
  60: { name: "Saudi Arabia", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  94: { name: "United Arab Emirates", wa: 6000, tg: 4500, ig: 4000, fb: 4000, gmail: 4500, tiktok: 4000 },
  202: { name: "Qatar", wa: 5000, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  118: { name: "Kuwait", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  // Oseania
  190: { name: "Australia", wa: 7000, tg: 5000, ig: 4500, fb: 4500, gmail: 5000, tiktok: 5000 },
  188: { name: "New Zealand", wa: 6000, tg: 4500, ig: 4000, fb: 4000, gmail: 4500, tiktok: 4000 },
};

const SERVICES = {
  wa: "WhatsApp", wa2: "WhatsApp 2", wa3: "WhatsApp 3", wa4: "WhatsApp 4",
  tg: "Telegram", ig: "Instagram", fb: "Facebook",
  gmail: "Google/Gmail", tiktok: "TikTok", twitter: "Twitter/X",
  discord: "Discord", steam: "Steam", line: "LINE", snap: "Snapchat",
  uber: "Uber", tinder: "Tinder", netflix: "Netflix", spotify: "Spotify",
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {}
  return { provider: "5sim", apiKey: "", users: {}, orders: [], pendingPayments: {}, tier: "budget" };
}

function saveData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function formatRupiah(n) { return "Rp" + Math.round(n).toLocaleString("id-ID"); }

function calcPrice(basePrice, tier) {
  const t = TIERS[tier] || TIERS.budget;
  return Math.max(500, Math.round(basePrice * t.multiplier / 100) * 100);
}

function genToken() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function getUser(data, sender) {
  if (!data.users[sender]) data.users[sender] = { balance: 0, totalOrders: 0, totalSpent: 0, tier: "budget" };
  return data.users[sender];
}

const pluginConfig = {
  name: ["nokosbeli", "belinomor", "vnum"],
  alias: ["nokosbuy", "buynumber", "belinosim"],
  category: "tools",
  description: "Beli nomor virtual + OTP (multi-tier: budget/standard/premium)",
  usage: ".nokosbeli\n.nokosbeli tier <budget|standard|premium>\n.nokosbeli harga [negara] [layanan]\n.nokosbeli buy [negara] [layanan]\n.nokosbeli bayar <token>\n.nokosbeli otp <order_id>\n.nokosbeli batal <order_id>\n.nokosbeli saldo\n.nokosbeli list\n.nokosbeli negara\n.nokosbeli layanan",
  example: ".nokosbeli buy 6 wa\n.nokosbeli bayar ABC123\n.nokosbeli otp 99999",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 5, isEnabled: true,
};

// === 5SIM API ===
async function fivesimBuy(apiKey, country, service) {
  const res = await axios.get("https://5sim.net/v1/user/buy/activation/" + country + "/any/" + service, { headers: { Authorization: "Bearer " + apiKey }, timeout: 15000 });
  return { id: res.data.id, phone: res.data.phone, operator: res.data.operator, price: res.data.price };
}
async function fivesimCheck(apiKey, orderId) {
  const res = await axios.get("https://5sim.net/v1/user/check/" + orderId, { headers: { Authorization: "Bearer " + apiKey }, timeout: 10000 });
  const sms = res.data.sms || [];
  return { status: res.data.status, phone: res.data.phone, sms: sms.map(s => ({ code: s.code, text: s.text })) };
}
async function fivesimCancel(apiKey, orderId) {
  try { await axios.get("https://5sim.net/v1/user/cancel/" + orderId, { headers: { Authorization: "Bearer " + apiKey }, timeout: 10000 }); return { success: true }; } catch { return { success: false }; }
}
async function fivesimFinish(apiKey, orderId) {
  try { await axios.get("https://5sim.net/v1/user/finish/" + orderId, { headers: { Authorization: "Bearer " + apiKey }, timeout: 10000 }); } catch {}
}
async function fivesimBalance(apiKey) {
  const res = await axios.get("https://5sim.net/v1/user/profile", { headers: { Authorization: "Bearer " + apiKey }, timeout: 10000 });
  return { balance: res.data.balance };
}

// === SMS-Activate / SMS-Hub API ===
const SA_BASES = { smsactivate: "https://api.sms-activate.org/stubs/handler_api.php", smshub: "https://smshub.org/stubs/handler_api.php" };

async function saBuy(apiKey, country, service, provider) {
  const base = SA_BASES[provider] || SA_BASES.smsactivate;
  const res = await axios.get(base, { params: { api_key: apiKey, action: "getNumber", service, country }, timeout: 15000 });
  const parts = res.data.split(":");
  if (parts[0] === "ACCESS_NUMBER") return { id: parts[1], phone: parts[2] };
  throw new Error(parts[0] || "ERROR");
}
async function saCheck(apiKey, orderId, provider) {
  const base = SA_BASES[provider] || SA_BASES.smsactivate;
  const res = await axios.get(base, { params: { api_key: apiKey, action: "getStatus", id: orderId }, timeout: 10000 });
  const parts = res.data.split(":");
  if (parts[0] === "STATUS_WAIT_CODE") return { status: "WAITING", sms: [] };
  if (parts[0] === "STATUS_OK") return { status: "RECEIVED", sms: [{ code: parts[1], text: parts[1] }] };
  if (parts[0] === "STATUS_CANCEL") return { status: "CANCELED", sms: [] };
  return { status: parts[0], sms: [] };
}
async function saCancel(apiKey, orderId, provider) {
  const base = SA_BASES[provider] || SA_BASES.smsactivate;
  try { const res = await axios.get(base, { params: { api_key: apiKey, action: "setStatus", id: orderId, status: 8 }, timeout: 10000 }); return { success: res.data === "ACCESS_CANCEL" }; } catch { return { success: false }; }
}
async function saBalance(apiKey, provider) {
  const base = SA_BASES[provider] || SA_BASES.smsactivate;
  const res = await axios.get(base, { params: { api_key: apiKey, action: "getBalance" }, timeout: 10000 });
  const parts = res.data.split(":");
  if (parts[0] === "ACCESS_BALANCE") return { balance: parseFloat(parts[1]) };
  throw new Error(parts[0]);
}

// === Unified ===
async function buyNumber(data, country, service) {
  if (data.provider === "5sim") return await fivesimBuy(data.apiKey, country, service);
  return await saBuy(data.apiKey, country, service, data.provider);
}
async function checkOrder(data, orderId) {
  if (data.provider === "5sim") return await fivesimCheck(data.apiKey, orderId);
  return await saCheck(data.apiKey, orderId, data.provider);
}
async function cancelOrderApi(data, orderId) {
  if (data.provider === "5sim") return await fivesimCancel(data.apiKey, orderId);
  return await saCancel(data.apiKey, orderId, data.provider);
}
async function getApiBalance(data) {
  if (data.provider === "5sim") return await fivesimBalance(data.apiKey);
  return await saBalance(data.apiKey, data.provider);
}

// === Handler ===
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
  const tier = user.tier || data.tier || "budget";

  // SETKEY
  if (sub === "setkey" || sub === "setapi") {
    if (!isOwner) return m.reply("Khusus owner!");
    const prov = arg1 ? arg1.toLowerCase() : "";
    const key = arg2;
    if (!prov || !key) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Set API Key (Owner)\n\n.nokosbeli setkey 5sim <key>\n.nokosbeli setkey smsactivate <key>\n.nokosbeli setkey smshub <key>\n\n5SIM: https://5sim.net\nSMS-Activate: https://sms-activate.org\nSMS-Hub: https://smshub.org"), "nokosbeli");
    }
    if (!["5sim", "smsactivate", "smshub"].includes(prov)) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Provider tidak valid!\nPilihan: 5sim, smsactivate, smshub"), "nokosbeli");
    data.provider = prov; data.apiKey = key; saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "API Key tersimpan!\nProvider: " + prov + "\nKey: " + key.slice(0,6) + "..." + key.slice(-4)), "nokosbeli");
  }

  // TOPUP
  if (sub === "topup") {
    if (!isOwner) return m.reply("Khusus owner!");
    const target = (arg1 || "").replace(/[^0-9]/g, "");
    const amount = parseInt(arg2) || 0;
    if (!target || amount < 500) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Topup Saldo (Owner)\n\n.nokosbeli topup <nomor> <jumlah>\nContoh: .nokosbeli topup 628123456789 10000\nMin: Rp500"), "nokosbeli");
    }
    const targetUser = getUser(data, target + "@s.whatsapp.net");
    targetUser.balance += amount; saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Topup Berhasil!\n\nUser: " + target + "\nJumlah: " + formatRupiah(amount) + "\nSaldo: " + formatRupiah(targetUser.balance)), "nokosbeli");
  }

  // SETPRICE
  if (sub === "setprice" || sub === "setharga") {
    if (!isOwner) return m.reply("Khusus owner!");
    const country = arg1; const service = arg2 ? arg2.toLowerCase() : ""; const price = parseInt(arg3);
    if (!country || !service || !price) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Set Custom Price (Owner)\n\n.nokosbeli setprice <negara> <layanan> <harga>\nContoh: .nokosbeli setprice 6 wa 4000\n\nBudget = 20% x standard\nPremium = 180% x standard"), "nokosbeli");
    }
    const cData = COUNTRIES[parseInt(country)];
    if (cData) cData[service] = price;
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Harga diupdate!\n" + (cData ? cData.name : country) + " - " + service.toUpperCase() + "\nStandard: " + formatRupiah(price) + "\nBudget: " + formatRupiah(calcPrice(price, "budget")) + "\nPremium: " + formatRupiah(calcPrice(price, "premium"))), "nokosbeli");
  }

  // TIER
  if (sub === "tier" || sub === "kelas") {
    const choice = arg1 ? arg1.toLowerCase() : "";
    if (!choice) {
      let body = "Pilih Tier Layanan\n\n";
      Object.entries(TIERS).forEach(([key, t]) => {
        const indoWa = calcPrice(COUNTRIES[6] ? COUNTRIES[6].wa : 5000, key);
        body += key.toUpperCase() + ": " + t.name + "\n   " + t.desc + "\n   " + t.note + "\n   WA Indo: " + formatRupiah(indoWa) + "\n\n";
      });
      body += "Pilih: .nokosbeli tier budget\n.nokosbeli tier standard\n.nokosbeli tier premium";
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
    }
    if (!TIERS[choice]) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Tier tidak valid!\nPilihan: budget, standard, premium"), "nokosbeli");
    user.tier = choice; saveData(data);
    await m.react("✅");
    const t = TIERS[choice];
    const indoWa = calcPrice(COUNTRIES[6] ? COUNTRIES[6].wa : 5000, choice);
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Tier: " + t.name + "\n\n" + t.desc + "\n" + t.note + "\n\nWA Indo: " + formatRupiah(indoWa) + "\n\n.nokosbeli harga 6 wa"), "nokosbeli");
  }

  // SALDO
  if (sub === "saldo" || sub === "balance") {
    await m.react("✅");
    let body = "Saldo Nokos Beli\n\nSaldo: " + formatRupiah(user.balance) + "\nTier: " + (TIERS[tier] ? TIERS[tier].name : "Budget") + "\nTotal order: " + user.totalOrders + "\nTotal spent: " + formatRupiah(user.totalSpent);
    if (isOwner && data.apiKey) {
      body += "\n\n--- Owner ---\nProvider: " + data.provider + "\n";
      try { const bal = await getApiBalance(data); body += "Saldo API: $" + bal.balance + "\n"; } catch { body += "Saldo API: Gagal\n"; }
    }
    if (user.balance < 1000) body += "\n\nSaldo kurang! Minta topup ke owner.";
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // HARGA
  if (sub === "harga" || sub === "price") {
    const country = arg1 || "6";
    const service = (arg2 || "wa").toLowerCase();
    const cData = COUNTRIES[parseInt(country)];
    if (!cData) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Negara tidak ditemukan!\nLihat: .nokosbeli negara"), "nokosbeli");
    const basePrice = cData[service] || 5000;
    let body = "Harga " + cData.name + " - " + (SERVICES[service] || service.toUpperCase()) + "\n\n";
    Object.entries(TIERS).forEach(([key, t]) => {
      const p = calcPrice(basePrice, key);
      const tag = key === tier ? " << AKTIF" : "";
      body += t.name + ": " + formatRupiah(p) + tag + "\n";
    });
    body += "\nSaldo: " + formatRupiah(user.balance) + "\nTier: " + TIERS[tier].name + "\n\nUbah: .nokosbeli tier <budget|standard|premium>\nBeli: .nokosbeli buy " + country + " " + service;
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // BUY
  if (sub === "buy" || sub === "beli" || sub === "pesan") {
    if (!data.apiKey) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Layanan belum aktif!\n\nOwner set API key:\n.nokosbeli setkey 5sim <key>\n.nokosbeli setkey smsactivate <key>\n.nokosbeli setkey smshub <key>"), "nokosbeli");
    }
    const country = arg1 || "6";
    const service = (arg2 || "wa").toLowerCase();
    const cData = COUNTRIES[parseInt(country)];
    if (!cData) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Negara tidak ditemukan: " + country), "nokosbeli");
    const basePrice = cData[service] || 5000;
    const price = calcPrice(basePrice, tier);
    if (user.balance < price) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Saldo tidak cukup!\n\nHarga (" + TIERS[tier].name + "): " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nKurang: " + formatRupiah(price - user.balance) + "\n\nMinta topup:\n.nokosbeli topup " + sender.split("@")[0] + " <jumlah>\n\nAtau ganti tier murah:\n.nokosbeli tier budget"), "nokosbeli");
    }
    const token = genToken();
    data.pendingPayments[token] = { sender, country, service, price, tier, createdAt: Date.now(), expiresAt: Date.now() + 300000 };
    saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Konfirmasi Pembelian\n\nNegara: " + cData.name + " (" + country + ")\nLayanan: " + (SERVICES[service] || service) + "\nTier: " + TIERS[tier].name + "\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nSisa: " + formatRupiah(user.balance - price) + "\n\nToken: " + token + "\n\nBayar: .nokosbeli bayar " + token + "\nExpired: 5 menit"), "nokosbeli");
  }

  // BAYAR
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1 ? arg1.toUpperCase() : "";
    if (!token) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Masukkan token!\nContoh: .nokosbeli bayar ABC123"), "nokosbeli");
    const pending = data.pendingPayments[token];
    if (!pending) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Token tidak ditemukan!\nBeli: .nokosbeli buy"), "nokosbeli");
    if (pending.sender !== sender) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Bukan token kamu!"), "nokosbeli");
    if (Date.now() > pending.expiresAt) { delete data.pendingPayments[token]; saveData(data); return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Token expired!\nBeli: .nokosbeli buy " + pending.country + " " + pending.service), "nokosbeli"); }
    const u = getUser(data, sender);
    if (u.balance < pending.price) { delete data.pendingPayments[token]; saveData(data); return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Saldo tidak cukup!"), "nokosbeli"); }
    await m.react("🕐");
    u.balance -= pending.price; u.totalSpent += pending.price;
    try {
      const order = await buyNumber(data, pending.country, pending.service);
      data.orders.push({ id: String(order.id), phone: order.phone, country: pending.country, service: pending.service, price: pending.price, tier: pending.tier, sender, status: "WAITING", createdAt: new Date().toISOString() });
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      u.totalOrders += 1; delete data.pendingPayments[token]; saveData(data);
      await m.react("✅");
      const phone = order.phone && order.phone.startsWith("+") ? order.phone : "+" + order.phone;
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Pembelian Berhasil!\n\nNomor: " + phone + "\nNegara: " + (COUNTRIES[parseInt(pending.country)] ? COUNTRIES[parseInt(pending.country)].name : pending.country) + "\nLayanan: " + pending.service.toUpperCase() + "\nTier: " + (TIERS[pending.tier] ? TIERS[pending.tier].name : "Budget") + "\nHarga: " + formatRupiah(pending.price) + "\nSisa: " + formatRupiah(u.balance) + "\nOrder ID: " + order.id + "\n\nCek OTP:\n.nokosbeli otp " + order.id + "\n\nBatal:\n.nokosbeli batal " + order.id), "nokosbeli");
    } catch (err) {
      u.balance += pending.price; u.totalSpent -= pending.price; delete data.pendingPayments[token]; saveData(data);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Gagal beli! Saldo di-refund: " + formatRupiah(pending.price) + "\n\nError: " + err.message + "\n\nCoba tier/negara lain."), "nokosbeli");
    }
  }

  // OTP / CEK
  if (sub === "otp" || sub === "cek" || sub === "check" || sub === "sms") {
    const orderId = arg1;
    if (!orderId) 
raWrap("Nokos Beli", "Masukkan Order ID!\nContoh: .nokosbeli otp 12345\nLihat: .nokosbeli list"), "nokosbeli");
    }
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Order tidak ditemukan!"), "nokosbeli");
    await m.react("🕐");
    try {
      const result = await checkOrder(data, orderId);
      await m.react("✅");
      let body = "Order #" + orderId + "\n\nNomor: +" + (result.phone || (order ? order.phone : "??")) + "\nStatus: " + result.status + "\n";
      if (result.sms && result.sms.length > 0) {
        body += "\nOTP diterima:\n";
        result.sms.forEach((s, i) => {
          body += "\n" + (i+1) + ". Kode: " + s.code + "\n";
          if (s.text && s.text !== s.code) body += "   Pesan: " + s.text + "\n";
        });
        body += "\nGunakan kode di atas untuk verifikasi!";
        if (data.provider === "5sim") { try { await fivesimFinish(data.apiKey, orderId); } catch {} }
      } else {
        body += "\nBelum ada OTP. Cek lagi:\n.nokosbeli otp " + orderId + "\n\nBatal: .nokosbeli batal " + orderId;
      }
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Error: " + err.message), "nokosbeli");
    }
  }

  // BATAL
  if (sub === "batal" || sub === "cancel") {
    const orderId = arg1;
    if (!orderId) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Masukkan Order ID!\nContoh: .nokosbeli batal 12345"), "nokosbeli");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Order tidak ditemukan!"), "nokosbeli");
    await m.react("🕐");
    try {
      const result = await cancelOrderApi(data, orderId);
      await m.react("✅");
      const refund = Math.floor((order ? order.price : 0) * 0.5);
      if (order && refund > 0) { const u = getUser(data, sender); u.balance += refund; }
      if (order) order.status = "CANCELED";
      saveData(data);
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", result.success ? "Order #" + orderId + " dibatalkan.\nRefund 50%: " + formatRupiah(refund) + "\nSaldo: " + formatRupiah(user.balance + refund) : "Gagal batalkan. OTP mungkin sudah masuk."), "nokosbeli");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Error: " + err.message), "nokosbeli");
    }
  }

  // LIST
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", "Belum ada order.\nBeli: .nokosbeli buy 6 wa"), "nokosbeli");
    let body = "Riwayat Order (" + myOrders.length + ")\n\n";
    myOrders.slice(-10).reverse().forEach((o, i) => {
      const phone = o.phone && o.phone.startsWith("+") ? o.phone : "+" + o.phone;
      body += (i+1) + ". ID: " + o.id + "\n   " + phone + " | " + o.service.toUpperCase() + " | " + (COUNTRIES[parseInt(o.country)] ? COUNTRIES[parseInt(o.country)].name : o.country) + "\n   " + formatRupiah(o.price) + " | " + (o.tier || "budget") + " | " + o.status + "\n";
    });
    body += "\n.nokosbeli otp <id> - cek OTP\n.nokosbeli batal <id> - batal";
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // NEGARA
  if (sub === "negara" || sub === "country") {
    let body = "Daftar Negara (Tier: " + (TIERS[tier] ? TIERS[tier].name : "Budget") + ")\n\n";
    Object.entries(COUNTRIES).forEach(([code, c]) => {
      const p = calcPrice(c.wa || 5000, tier);
      body += code + ": " + c.name + " - " + formatRupiah(p) + "\n";
    });
    body += "\nHarga sesuai tier aktif.\nUbah: .nokosbeli tier <budget|standard|premium>";
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // LAYANAN
  if (sub === "layanan" || sub === "service") {
    let body = "Daftar Layanan\n\n";
    Object.entries(SERVICES).forEach(([code, name]) => { body += code + ": " + name + "\n"; });
    body += "\nContoh: .nokosbeli buy 6 wa";
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // HELP / MENU
  let body = "Nokos Beli - Virtual Number Store\n\n";
  body += "Saldo: " + formatRupiah(user.balance) + "\n";
  body += "Tier: " + (TIERS[tier] ? TIERS[tier].name : "Budget") + "\n\n";
  body += "1. Pilih Tier:\n   .nokosbeli tier budget (termurah)\n   .nokosbeli tier standard\n   .nokosbeli tier premium\n\n";
  body += "2. Lihat Harga:\n   .nokosbeli harga 6 wa\n\n";
  body += "3. Beli Nomor:\n   .nokosbeli buy 6 wa\n\n";
  body += "4. Konfirmasi Bayar:\n   .nokosbeli bayar <token>\n\n";
  body += "5. Cek OTP:\n   .nokosbeli otp <order_id>\n\n";
  body += "6. Cek Saldo:\n   .nokosbeli saldo\n\n";
  body += "7. Batalkan:\n   .nokosbeli batal <id> (refund 50%)\n\n";
  body += "8. Riwayat:\n   .nokosbeli list\n\n";
  body += "9. Negara & Layanan:\n   .nokosbeli negara\n   .nokosbeli layanan\n\n";
  if (isOwner) {
    body += "--- Owner ---\n.nokosbeli setkey <provider> <key>\n.nokosbeli topup <nomor> <jumlah>\n.nokosbeli setprice <negara> <layanan> <harga>\n\n";
  }
  const t = TIERS[tier];
  const indoBudget = calcPrice(COUNTRIES[6] ? COUNTRIES[6].wa : 5000, "budget");
  body += "Tier " + t.name + ": " + t.note + "\nWA Indo budget: " + formatRupiah(indoBudget) + "\n\nProviders: 5SIM, SMS-Activate, SMS-Hub";
  return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
}

export default { pluginConfig, handler };
