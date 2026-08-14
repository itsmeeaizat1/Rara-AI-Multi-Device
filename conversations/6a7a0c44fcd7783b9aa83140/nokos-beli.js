import axios from "axios";
import fs from "fs";
import path from "path";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// Nokos Beli v2 - Payment Flow
// 1. User topup saldo (owner approve)
// 2. User pilih nomor (lihat harga)
// 3. User bayar (saldo dipotong)
// 4. Bot beli nomor dari provider API
// 5. Bot kasih nomor
// 6. User tunggu OTP
// 7. Bot kasih OTP setelah masuk
// ============================================================

const DATA_FILE = path.join(process.cwd(), "database", "nokos_beli.json");

const COUNTRIES = {
  6: { name: "Indonesia", wa: 5000, tg: 4000, ig: 3000, fb: 3000, gmail: 4000, tiktok: 3500 },
  12: { name: "USA", wa: 8000, tg: 6000, ig: 5000, fb: 5000, gmail: 6000, tiktok: 5500 },
  16: { name: "UK", wa: 7000, tg: 5000, ig: 4500, fb: 4500, gmail: 5000, tiktok: 5000 },
  0: { name: "Russia", wa: 3000, tg: 2500, ig: 2000, fb: 2000, gmail: 2500, tiktok: 2500 },
  22: { name: "India", wa: 4000, tg: 3000, ig: 2500, fb: 2500, gmail: 3000, tiktok: 3000 },
  7: { name: "Malaysia", wa: 5000, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  117: { name: "Thailand", wa: 5000, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  187: { name: "Philippines", wa: 5000, tg: 4000, ig: 3500, fb: 3500, gmail: 4000, tiktok: 3500 },
  78: { name: "Brazil", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
  10: { name: "Vietnam", wa: 4500, tg: 3500, ig: 3000, fb: 3000, gmail: 3500, tiktok: 3000 },
};

const SERVICES = {
  wa: "WhatsApp", wa2: "WhatsApp 2", wa3: "WhatsApp 3", wa4: "WhatsApp 4",
  tg: "Telegram", ig: "Instagram", fb: "Facebook",
  gmail: "Google/Gmail", tiktok: "TikTok", twitter: "Twitter/X",
  discord: "Discord", steam: "Steam",
};

const SERVICE_NAMES = Object.keys(SERVICES);

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {}
  return {
    provider: "5sim",
    apiKey: "",
    users: {},
    orders: [],
    pendingPayments: {},
    topupRequests: [],
  };
}

function saveData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function formatRupiah(n) {
  return "Rp" + n.toLocaleString("id-ID");
}

function genToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getUser(data, sender) {
  if (!data.users[sender]) {
    data.users[sender] = { balance: 0, totalOrders: 0, totalSpent: 0 };
  }
  return data.users[sender];
}

const pluginConfig = {
  name: ["nokosbeli", "belinomor", "vnum"],
  alias: ["nokosbuy", "buynumber", "belinosim"],
  category: "tools",
  description: "Beli nomor virtual + OTP (payment flow - saldo internal)",
  usage: ".nokosbeli\n.nokosbeli harga [negara] [layanan]\n.nokosbeli buy [negara] [layanan]\n.nokosbeli bayar <token>\n.nokosbeli otp <order_id>\n.nokosbeli cek <order_id>\n.nokosbeli saldo\n.nokosbeli batal <order_id>\n.nokosbeli list\n.nokosbeli negara\n.nokosbeli layanan",
  example: ".nokosbeli buy 6 wa\n.nokosbeli bayar ABC123\n.nokosbeli otp 99999",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 5,
  isEnabled: true,
};

// === 5SIM API ===

async function fivesimBuy(apiKey, country, service) {
  const res = await axios.get(`https://5sim.net/v1/user/buy/activation/${country}/any/${service}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return { id: res.data.id, phone: res.data.phone, operator: res.data.operator, price: res.data.price };
}

async function fivesimCheck(apiKey, orderId) {
  const res = await axios.get(`https://5sim.net/v1/user/check/${orderId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 10000,
  });
  const sms = res.data.sms || [];
  return { status: res.data.status, phone: res.data.phone, sms: sms.map(s => ({ code: s.code, text: s.text })) };
}

async function fivesimCancel(apiKey, orderId) {
  try {
    const res = await axios.get(`https://5sim.net/v1/user/cancel/${orderId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    return { success: true };
  } catch { return { success: false }; }
}

async function fivesimFinish(apiKey, orderId) {
  try {
    await axios.get(`https://5sim.net/v1/user/finish/${orderId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
  } catch {}
}

async function fivesimBalance(apiKey) {
  const res = await axios.get("https://5sim.net/v1/user/profile", {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 10000,
  });
  return { balance: res.data.balance };
}

// === SMS-Activate API ===

async function saBuy(apiKey, country, service) {
  const res = await axios.get("https://api.sms-activate.org/stubs/handler_api.php", {
    params: { api_key: apiKey, action: "getNumber", service, country },
    timeout: 15000,
  });
  const parts = res.data.split(":");
  if (parts[0] === "ACCESS_NUMBER") return { id: parts[1], phone: parts[2] };
  throw new Error(parts[0]);
}

async function saCheck(apiKey, orderId) {
  const res = await axios.get("https://api.sms-activate.org/stubs/handler_api.php", {
    params: { api_key: apiKey, action: "getStatus", id: orderId },
    timeout: 10000,
  });
  const parts = res.data.split(":");
  if (parts[0] === "STATUS_WAIT_CODE") return { status: "WAITING", sms: [] };
  if (parts[0] === "STATUS_OK") return { status: "RECEIVED", sms: [{ code: parts[1], text: parts[1] }] };
  if (parts[0] === "STATUS_CANCEL") return { status: "CANCELED", sms: [] };
  return { status: parts[0], sms: [] };
}

async function saCancel(apiKey, orderId) {
  try {
    const res = await axios.get("https://api.sms-activate.org/stubs/handler_api.php", {
      params: { api_key: apiKey, action: "setStatus", id: orderId, status: 8 },
      timeout: 10000,
    });
    return { success: res.data === "ACCESS_CANCEL" };
  } catch { return { success: false }; }
}

async function saBalance(apiKey) {
  const res = await axios.get("https://api.sms-activate.org/stubs/handler_api.php", {
    params: { api_key: apiKey, action: "getBalance" },
    timeout: 10000,
  });
  const parts = res.data.split(":");
  if (parts[0] === "ACCESS_BALANCE") return { balance: parseFloat(parts[1]) };
  throw new Error(parts[0]);
}

// === Unified ===

async function buyNumber(data, country, service) {
  if (data.provider === "5sim") return await fivesimBuy(data.apiKey, country, service);
  return await saBuy(data.apiKey, country, service);
}

async function checkOrder(data, orderId) {
  if (data.provider === "5sim") return await fivesimCheck(data.apiKey, orderId);
  return await saCheck(data.apiKey, orderId);
}

async function cancelOrderApi(data, orderId) {
  if (data.provider === "5sim") return await fivesimCancel(data.apiKey, orderId);
  return await saCancel(data.apiKey, orderId);
}

async function getApiBalance(data) {
  if (data.provider === "5sim") return await fivesimBalance(data.apiKey);
  return await saBalance(data.apiKey);
}

// === Handler ===

async function handler(m, { sock }) {
  const args = (m.text || "").trim().split(/\s+/);
  const sub = args[0]?.toLowerCase();
  const arg1 = args[1] || "";
  const arg2 = args[2] || "";
  const arg3 = args[3] || "";
  const sender = m.sender;

  const data = loadData();
  const user = getUser(data, sender);
  const isOwner = m.isOwner || false;

  // --- SETKEY (owner only) ---
  if (sub === "setkey" || sub === "setapi") {
    if (!isOwner) return m.reply("Khusus owner!");
    const provider = arg1?.toLowerCase() === "smsactivate" ? "smsactivate" : "5sim";
    const key = arg2;
    if (!key) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Set API Key (Owner)\n\n.nokosbeli setkey 5sim <key>\n.nokosbeli setkey smsactivate <key>\n\n5SIM: https://5sim.net\nSMS-Activate: https://sms-activate.org`
      ), "nokosbeli");
    }
    data.provider = provider;
    data.apiKey = key;
    saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
      `API Key tersimpan!\nProvider: ${provider}\nKey: ${key.slice(0,6)}...${key.slice(-4)}`
    ), "nokosbeli");
  }

  // --- TOPUP (owner only) ---
  if (sub === "topup") {
    if (!isOwner) return m.reply("Khusus owner!");
    const target = arg1?.replace("@", "") || "";
    const amount = parseInt(arg2) || 0;
    if (!target || amount < 1000) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Topup Saldo User (Owner)\n\n.nokosbeli topup <@tag/number> <jumlah>\nContoh: .nokosbeli topup 628123456789 10000`
      ), "nokosbeli");
    }
    const targetKey = target.includes("@") ? target.replace(/@s\.whatsapp\.net/, "") + "@s.whatsapp.net" : target.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const targetUser = getUser(data, targetKey);
    targetUser.balance += amount;
    saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
      `Topup Berhasil!\n\nUser: ${target}\nJumlah: ${formatRupiah(amount)}\nSaldo sekarang: ${formatRupiah(targetUser.balance)}`
    ), "nokosbeli");
  }

  // --- SALDO ---
  if (sub === "saldo" || sub === "balance") {
    await m.react("✅");
    let body = `Saldo Nokos Beli\n\n`;
    body += `Saldo kamu: ${formatRupiah(user.balance)}\n`;
    body += `Total order: ${user.totalOrders}\n`;
    body += `Total spent: ${formatRupiah(user.totalSpent)}\n`;
    if (isOwner) {
      body += `\n--- Owner Info ---\n`;
      body += `Provider: ${data.provider}\n`;
      if (data.apiKey) {
        try {
          const bal = await getApiBalance(data);
          body += `Saldo API: $${bal.balance}\n`;
        } catch {
          body += `Saldo API: Gagal cek\n`;
        }
      } else {
        body += `API: Belum diset (.nokosbeli setkey)\n`;
      }
    }
    if (user.balance < 5000) {
      body += `\nSaldo kurang! Minta topup ke owner.`;
    }
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // --- HARGA ---
  if (sub === "harga" || sub === "price") {
    const country = arg1 || "6";
    const cData = COUNTRIES[parseInt(country)];
    if (!cData) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Negara tidak ditemukan!\nLihat: .nokosbeli negara`
      ), "nokosbeli");
    }
    let body = `Daftar Harga - ${cData.name}\n\n`;
    Object.entries(cData).forEach(([k, v]) => {
      if (k === "name") return;
      const sName = SERVICES[k] || k;
      body += `${k.toUpperCase()}: ${sName} = ${formatRupiah(v)}\n`;
    });
    body += `\nSaldo kamu: ${formatRupiah(user.balance)}\n\nBeli: .nokosbeli buy ${country} wa`;
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // --- BUY (creates pending payment) ---
  if (sub === "buy" || sub === "beli" || sub === "pesan") {
    if (!data.apiKey) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Layanan belum aktif!\n\nOwner harus set API key dulu:\n.nokosbeli setkey 5sim <key>\n\nDaftar: https://5sim.net`
      ), "nokosbeli");
    }
    const country = arg1 || "6";
    const service = (arg2 || "wa").toLowerCase();
    const cData = COUNTRIES[parseInt(country)];
    if (!cData) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Negara tidak ditemukan: ${country}\nLihat: .nokosbeli negara`
      ), "nokosbeli");
    }
    const price = cData[service] || 5000;
    const sName = SERVICES[service] || service;
    if (user.balance < price) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Saldo tidak cukup!\n\nHarga: ${formatRupiah(price)}\nSaldo kamu: ${formatRupiah(user.balance)}\nKurang: ${formatRupiah(price - user.balance)}\n\nMinta topup ke owner:\n.nokosbeli topup ${sender.split("@")[0]} <jumlah>`
      ), "nokosbeli");
    }
    const token = genToken();
    data.pendingPayments[token] = {
      sender,
      country,
      service,
      price,
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000),
    };
    saveData(data);
    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
      `Konfirmasi Pembelian\n\nNegara: ${cData.name} (${country})\nLayanan: ${sName} (${service.toUpperCase()})\nHarga: ${formatRupiah(price)}\nSaldo kamu: ${formatRupiah(user.balance)}\nSaldo setelah: ${formatRupiah(user.balance - price)}\n\nToken: ${token}\n\nUntuk konfirmasi bayar:\n.nokosbeli bayar ${token}\n\nToken expired dalam 5 menit. Saldo akan dipotong setelah konfirmasi.`
    ), "nokosbeli");
  }

  // --- BAYAR (confirm payment, buy from API) ---
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1?.toUpperCase();
    if (!token) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Masukkan token pembayaran!\n\nContoh: .nokosbeli bayar ABC123`
      ), "nokosbeli");
    }
    const pending = data.pendingPayments[token];
    if (!pending) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Token tidak ditemukan!\n\nBeli ulang: .nokosbeli buy`
      ), "nokosbeli");
    }
    if (pending.sender !== sender) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Token ini bukan milik kamu!`
      ), "nokosbeli");
    }
    if (Date.now() > pending.expiresAt) {
      delete data.pendingPayments[token];
      saveData(data);
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Token expired!\n\nBeli ulang: .nokosbeli buy ${pending.country} ${pending.service}`
      ), "nokosbeli");
    }
    const u = getUser(data, sender);
    if (u.balance < pending.price) {
      delete data.pendingPayments[token];
      saveData(data);
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Saldo tidak cukup!\nSaldo: ${formatRupiah(u.balance)}\nButuh: ${formatRupiah(pending.price)}`
      ), "nokosbeli");
    }

    await m.react("🕐");

    // Deduct balance
    u.balance -= pending.price;
    u.totalSpent += pending.price;

    // Buy from API
    try {
      const order = await buyNumber(data, pending.country, pending.service);
      const orderRecord = {
        id: String(order.id),
        phone: order.phone,
        country: pending.country,
        service: pending.service,
        price: pending.price,
        sender,
        status: "WAITING",
        createdAt: new Date().toISOString(),
      };
      data.orders.push(orderRecord);
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      u.totalOrders += 1;
      delete data.pendingPayments[token];
      saveData(data);

      await m.react("✅");
      const phoneDisplay = order.phone?.startsWith("+") ? order.phone : "+" + order.phone;
      const cName = COUNTRIES[parseInt(pending.country)]?.name || pending.country;
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Pembelian Berhasil!\n\nNomor: ${phoneDisplay}\nNegara: ${cName}\nLayanan: ${pending.service.toUpperCase()}\nHarga: ${formatRupiah(pending.price)}\nSaldo tersisa: ${formatRupiah(u.balance)}\nOrder ID: ${order.id}\n\nStatus: Menunggu OTP...\n\nCek OTP (tunggu 1-5 menit):\n.nokosbeli otp ${order.id}\n\nBatalkan (refund 50%):\n.nokosbeli batal ${order.id}`
      ), "nokosbeli");
    } catch (err) {
      // Refund on failure
      u.balance += pending.price;
      u.totalSpent -= pending.price;
      delete data.pendingPayments[token];
      saveData(data);
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Gagal beli nomor!\nSaldo di-refund: ${formatRupiah(pending.price)}\n\nError: ${err.message}\n\nKemungkinan:\n1. Nomor habis\n2. Saldo API habis\n3. API key salah\n\nCoba negara/layanan lain.`
      ), "nokosbeli");
    }
  }

  // --- OTP / CEK ---
  if (sub === "otp" || sub === "cek" || sub === "check" || sub === "sms") {
    const orderId = arg1;
    if (!orderId) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Masukkan Order ID!\n\nContoh: .nokosbeli otp 12345\nLihat order: .nokosbeli list`
      ), "nokosbeli");
    }
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Order tidak ditemukan atau bukan milik kamu!`
      ), "nokosbeli");
    }
    await m.react("🕐");
    try {
      const result = await checkOrder(data, orderId);
      await m.react("✅");
      let body = `Order #${orderId}\n\n`;
      body += `Nomor: +${result.phone || order?.phone || "??"}\n`;
      body += `Status: ${result.status}\n`;
      if (result.sms && result.sms.length > 0) {
        body += `\nOTP diterima:\n`;
        result.sms.forEach((s, i) => {
          body += `\n${i + 1}. Kode: ${s.code}\n`;
          if (s.text && s.text !== s.code) body += `   Pesan: ${s.text}\n`;
        });
        body += `\nGunakan kode di atas untuk verifikasi ${order?.service?.toUpperCase() || "WA"}!\n\nJangan lupa cek lagi jika perlu kode baru.`;
        if (data.provider === "5sim") {
          try { await fivesimFinish(data.apiKey, orderId); } catch {}
        }
      } else {
        body += `\nBelum ada OTP.\nTunggu 1-5 menit, cek lagi:\n.nokosbeli otp ${orderId}\n\nAtau batalkan:\n.nokosbeli batal ${orderId}`;
      }
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Error: ${err.message}`
      ), "nokosbeli");
    }
  }

  // --- BATAL ---
  if (sub === "batal" || sub === "cancel") {
    const orderId = arg1;
    if (!orderId) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        `Masukkan Order ID!\nContoh: .nokosbeli batal 12345`
      ), "nokosbeli");
    }
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", `Order tidak ditemukan!`), "nokosbeli");
    }
    await m.react("🕐");
    try {
      const result = await cancelOrderApi(data, orderId);
      await m.react("✅");
      // Refund 50%
      const refund = Math.floor((order?.price || 0) * 0.5);
      if (order && refund > 0) {
        const u = getUser(data, sender);
        u.balance += refund;
      }
      if (order) order.status = "CANCELED";
      saveData(data);
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli",
        result.success
          ? `Order #${orderId} dibatalkan.\nRefund 50%: ${formatRupiah(refund)}\nSaldo: ${formatRupiah(user.balance + refund)}`
          : `Gagal batalkan #${orderId}. Mungkin OTP sudah masuk.`
      ), "nokosbeli");
    } catch (err) {
      await m.react("✅");
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", `Error: ${err.message}`), "nokosbeli");
    }
  }

  // --- LIST ---
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) {
      return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", `Belum ada order.\n\nBeli: .nokosbeli buy 6 wa`), "nokosbeli");
    }
    let body = `Riwayat Order (${myOrders.length})\n\n`;
    myOrders.slice(-10).reverse().forEach((o, i) => {
      const phone = o.phone?.startsWith("+") ? o.phone : "+" + o.phone;
      body += `${i + 1}. ID: ${o.id}\n   ${phone} | ${o.service.toUpperCase()} | ${COUNTRIES[parseInt(o.country)]?.name || o.country}\n   ${formatRupiah(o.price)} | ${o.status}\n`;
    });
    body += `\n.nokosbeli otp <id> - cek OTP\n.nokosbeli batal <id> - batalkan`;
    return sendReplyWithNav(sock, m, cla
raWrap("Nokos Beli", body), "nokosbeli");
  }

  // --- NEGARA ---
  if (sub === "negara" || sub === "country") {
    let body = `Daftar Negara & Harga WA\n\n`;
    Object.entries(COUNTRIES).forEach(([code, c]) => {
      body += `${code}: ${c.name} - ${formatRupiah(c.wa || 5000)}\n`;
    });
    body += `\nLihat semua harga:\n.nokosbeli harga <kode> <layanan>\nContoh: .nokosbeli harga 6 wa`;
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // --- LAYANAN ---
  if (sub === "layanan" || sub === "service") {
    let body = `Daftar Layanan\n\n`;
    Object.entries(SERVICES).forEach(([code, name]) => {
      body += `${code}: ${name}\n`;
    });
    body += `\nContoh: .nokosbeli buy 6 wa (WhatsApp Indonesia)`;
    return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
  }

  // --- HELP / MENU ---
  let body = `Nokos Beli - Virtual Number Store\n\n`;
  body += `Saldo kamu: ${formatRupiah(user.balance)}\n\n`;
  body += `1. Lihat Harga:\n   .nokosbeli harga 6 wa\n\n`;
  body += `2. Beli Nomor:\n   .nokosbeli buy 6 wa\n   (akan buat token pembayaran)\n\n`;
  body += `3. Konfirmasi Bayar:\n   .nokosbeli bayar <token>\n   (saldo dipotong, nomor dibeli)\n\n`;
  body += `4. Cek OTP:\n   .nokosbeli otp <order_id>\n\n`;
  body += `5. Cek Saldo:\n   .nokosbeli saldo\n\n`;
  body += `6. Batalkan Order:\n   .nokosbeli batal <order_id>\n   (refund 50%)\n\n`;
  body += `7. Riwayat Order:\n   .nokosbeli list\n\n`;
  body += `8. Daftar Negara:\n   .nokosbeli negara\n\n`;
  body += `9. Daftar Layanan:\n   .nokosbeli layanan\n\n`;
  if (isOwner) {
    body += `--- Owner ---\n`;
    body += `.nokosbeli setkey 5sim <key>\n`;
    body += `.nokosbeli topup <number> <jumlah>\n`;
    body += `.nokosbeli saldo (cek saldo API)\n\n`;
  }
  body += `Alur:\nBeli -> Bayar -> Dapat Nomor -> Tunggu OTP -> Cek OTP\n\nProvider: 5SIM / SMS-Activate`;
  return sendReplyWithNav(sock, m, claraWrap("Nokos Beli", body), "nokosbeli");
}

export default { pluginConfig, handler };
