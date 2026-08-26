// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// PPOB - Pembayaran & Pengisian Online Terintegrasi
// Multi-Provider: DigiFlazz, FMPedia, (mudah ditambah provider lain)
// Payment: Sistem payment sendiri (text mode atau image mode)
// Flow: lihat produk -> pesan -> bayar (QRIS/Dana/Bank) -> owner konfirmasi -> proses
// ============================================================

const DATA_FILE = path.join(process.cwd(), "database", "ppob.json");

// ============================================================
// PROVIDER ABSTRACTION
// ============================================================

const PROVIDERS = {
  digiflazz: {
    name: "DigiFlazz",
    alias: ["DigiFlazz"],
    baseApi: "https://api.digiflazz.com/v1",
    label: "digiflazz",
    setupHint: "Daftar gratis: https://digiflazz.com\nAPI: Profile > Koneksi API",
    // credentials: { username, apiKey }
    sign(cred, keyword) {
      return crypto
        .createHash("md5")
        .update(cred.username + cred.apiKey + keyword)
        .digest("hex");
    },
    isSetup(cred) {
      return !!(cred && cred.username && cred.apiKey);
    },
    async cekSaldo(cred) {
      const res = await axios.post(
        this.baseApi + "/cek-saldo",
        { cmd: "deposit", username: cred.username, sign: this.sign(cred, "depo") },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data?.deposit !== undefined) return res.data.data.deposit;
      throw new Error(res.data?.data?.message || "Gagal cek saldo");
    },
    async getPriceList(cred) {
      const res = await axios.post(
        this.baseApi + "/price-list",
        { cmd: "prepaid", username: cred.username, sign: this.sign(cred, "pricelist") },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
      throw new Error(res.data?.data?.message || "Gagal mengambil daftar harga");
    },
    async topup(cred, sku, customerNo, refId) {
      const res = await axios.post(
        this.baseApi + "/transaction",
        {
          username: cred.username,
          buyer_sku_code: sku,
          customer_no: customerNo,
          ref_id: refId,
          sign: this.sign(cred, refId),
        },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data) return res.data.data;
      throw new Error(res.data?.data?.message || "Gagal topup");
    },
    async checkStatus(cred, refId) {
      const res = await axios.post(
        this.baseApi + "/transaction",
        { cmd: "status", username: cred.username, ref_id: refId, sign: this.sign(cred, refId) },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      return res.data?.data || null;
    },
    // Normalize produk ke format universal
    normalizeProduct(p) {
      return {
        sku: p.buyer_sku_code || "",
        name: p.product_name || p.product_name,
        brand: p.brand || "",
        category: p.category || "",
        price: p.price || 0,
        buyerStatus: p.buyer_product_status || false,
        sellerStatus: p.seller_product_status || false,
        desc: p.desc || "",
      };
    },
    parseKey(input) {
      if (!input || !input.includes(":")) return null;
      const [username, apiKey] = input.split(":");
      return { username, apiKey };
    },
    credLabel(cred) {
      if (!cred || !cred.username) return "Belum diatur";
      return (
        cred.username +
        " | Key: " +
        (cred.apiKey || "").slice(0, 4) +
        "..." +
        (cred.apiKey || "").slice(-4)
      );
    },
  },

  fmpedia: {
    name: "FMPedia",
    baseApi: "https://fmpedia.id/api/prepaid",
    label: "fmpedia",
    setupHint: "Daftar: https://fmpedia.id\nAPI: Dashboard > Pengaturan API",
    // credentials: { userId, apiKey }
    sign(cred) {
      return crypto
        .createHash("md5")
        .update(cred.userId + cred.apiKey)
        .digest("hex");
    },
    isSetup(cred) {
      return !!(cred && cred.userId && cred.apiKey);
    },
    async cekSaldo(cred) {
      const res = await axios.post(
        this.baseApi,
        { key: cred.apiKey, sign: this.sign(cred), type: "saldo" },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.code === 200 && res.data?.data?. saldo !== undefined)
        return res.data.data.saldo;
      if (res.data?.code === 200 && res.data?.data !== undefined)
        return res.data.data;
      throw new Error(res.data?.message || "Gagal cek saldo");
    },
    async getPriceList(cred) {
      const res = await axios.post(
        this.baseApi,
        { key: cred.apiKey, sign: this.sign(cred), type: "service" },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.code === 200 && Array.isArray(res.data.data))
        return res.data.data;
      throw new Error(res.data?.message || "Gagal mengambil daftar layanan");
    },
    async topup(cred, sku, customerNo, refId) {
      const res = await axios.post(
        this.baseApi,
        {
          key: cred.apiKey,
          sign: this.sign(cred),
          type: "order",
          service: sku,
          data_no: customerNo,
          ref_id: refId,
        },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.code === 200) return res.data.data || { status: "Pending" };
      throw new Error(res.data?.message || "Gagal membuat order");
    },
    async checkStatus(cred, refId) {
      const res = await axios.post(
        this.baseApi,
        { key: cred.apiKey, sign: this.sign(cred), type: "status", ref_id: refId },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      return res.data?.data || null;
    },
    normalizeProduct(p) {
      return {
        sku: p.code || p.service_code || "",
        name: p.name || p.service_name || "",
        brand: p.brand || p.provider || "",
        category: p.category || p.type || "",
        price: p.price || p.price_basic || 0,
        buyerStatus: p.status !== false,
        sellerStatus: p.status !== false,
        desc: p.desc || p.description || "",
      };
    },
    parseKey(input) {
      if (!input || !input.includes(":")) return null;
      const [userId, apiKey] = input.split(":");
      return { userId, apiKey };
    },
    credLabel(cred) {
      if (!cred || !cred.userId) return "Belum diatur";
      return (
        cred.userId +
        " | Key: " +
        (cred.apiKey || "").slice(0, 4) +
        "..." +
        (cred.apiKey || "").slice(-4)
      );
    },
  },

  mobilepulsa: {
    name: "MobilePulsa",
    baseApi: "https://api.mobilepulsa.net/v1",
    label: "mobilepulsa",
    setupHint: "Daftar: https://mobilepulsa.net\nAPI: Profile > Settings > API",
    // credentials: { username, apiKey }
    sign(cred, keyword) {
      return crypto
        .createHash("md5")
        .update(cred.username + cred.apiKey + keyword)
        .digest("hex");
    },
    isSetup(cred) {
      return !!(cred && cred.username && cred.apiKey);
    },
    async cekSaldo(cred) {
      const res = await axios.post(
        this.baseApi + "/balance",
        { cmd: "balance", username: cred.username, sign: this.sign(cred, "balance") },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data) return res.data.data.balance || res.data.data;
      throw new Error(res.data?.message || "Gagal cek saldo");
    },
    async getPriceList(cred) {
      const res = await axios.post(
        this.baseApi + "/pricelist",
        { cmd: "pricelist", username: cred.username, sign: this.sign(cred, "pricelist") },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
      throw new Error(res.data?.message || "Gagal mengambil daftar harga");
    },
    async topup(cred, sku, customerNo, refId) {
      const res = await axios.post(
        this.baseApi + "/transaction",
        {
          cmd: "topup",
          username: cred.username,
          ref_id: refId,
          buyer_sku_code: sku,
          customer_no: customerNo,
          sign: this.sign(cred, refId),
        },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data) return res.data.data;
      throw new Error(res.data?.message || "Gagal topup");
    },
    async checkStatus(cred, refId) {
      const res = await axios.post(
        this.baseApi + "/transaction",
        { cmd: "status", username: cred.username, ref_id: refId, sign: this.sign(cred, refId) },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      return res.data?.data || null;
    },
    normalizeProduct(p) {
      return {
        sku: p.buyer_sku_code || p.sku_code || "",
        name: p.product_name || p.name || "",
        brand: p.brand || "",
        category: p.category || "",
        price: p.price || 0,
        buyerStatus: p.buyer_product_status !== false,
        sellerStatus: p.seller_product_status !== false,
        desc: p.desc || "",
      };
    },
    parseKey(input) {
      if (!input || !input.includes(":")) return null;
      const [username, apiKey] = input.split(":");
      return { username, apiKey };
    },
    credLabel(cred) {
      if (!cred || !cred.username) return "Belum diatur";
      return cred.username + " | Key: " + (cred.apiKey || "").slice(0, 4) + "..." + (cred.apiKey || "").slice(-4);
    },
  },

  vocagame: {
    name: "VocaGame",
    baseApi: "https://api.vocagame.com/v1",
    label: "vocagame",
    setupHint: "Daftar: https://vocagame.com\nAPI: Dashboard > Pengaturan API",
    // credentials: { userId, apiKey }
    sign(cred, keyword) {
      return crypto
        .createHash("md5")
        .update(cred.userId + cred.apiKey + (keyword || ""))
        .digest("hex");
    },
    isSetup(cred) {
      return !!(cred && cred.userId && cred.apiKey);
    },
    async cekSaldo(cred) {
      const res = await axios.post(
        this.baseApi + "/balance",
        { user_id: cred.userId, sign: this.sign(cred, "cek") },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data) return res.data.data.balance || res.data.data;
      throw new Error(res.data?.message || "Gagal cek saldo");
    },
    async getPriceList(cred) {
      const res = await axios.post(
        this.baseApi + "/services",
        { user_id: cred.userId, sign: this.sign(cred, "services") },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
      throw new Error(res.data?.message || "Gagal mengambil daftar layanan");
    },
    async topup(cred, sku, customerNo, refId) {
      const res = await axios.post(
        this.baseApi + "/order",
        {
          user_id: cred.userId,
          sign: this.sign(cred, refId),
          service_code: sku,
          data_no: customerNo,
          ref_id: refId,
        },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      if (res.data?.data) return res.data.data;
      throw new Error(res.data?.message || "Gagal membuat order");
    },
    async checkStatus(cred, refId) {
      const res = await axios.post(
        this.baseApi + "/status",
        { user_id: cred.userId, sign: this.sign(cred, refId), ref_id: refId },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      return res.data?.data || null;
    },
    normalizeProduct(p) {
      return {
        sku: p.code || p.service_code || "",
        name: p.name || p.service_name || "",
        brand: p.brand || p.provider || "",
        category: p.category || p.type || "",
        price: p.price || p.price_basic || 0,
        buyerStatus: p.status !== false,
        sellerStatus: p.status !== false,
        desc: p.desc || p.description || "",
      };
    },
    parseKey(input) {
      if (!input || !input.includes(":")) return null;
      const [userId, apiKey] = input.split(":");
      return { userId, apiKey };
    },
    credLabel(cred) {
      if (!cred || !cred.userId) return "Belum diatur";
      return cred.userId + " | Key: " + (cred.apiKey || "").slice(0, 4) + "..." + (cred.apiKey || "").slice(-4);
    },
  },
};

// ============================================================
// DATA & UTILS
// ============================================================

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE))
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) { console.error('[ppob.js]:', e.message); }
  return {
    activeProvider: "digiflazz",
    credentials: {
      digiflazz: { username: "", apiKey: "" },
      fmpedia: { userId: "", apiKey: "" },
      mobilepulsa: { username: "", apiKey: "" },
      vocagame: { userId: "", apiKey: "" },
    },
    markup: 5,
    // Mode payment: "text" = text only, "image" = kirim gambar QR
    paymentMode: "image",
    // QR images per metode (URL atau path file lokal)
    paymentImages: {
      qris: { url: "https://i.ibb.co.com/3mdfp8s8/qr-ID1025405090990-21-08-26-1787245670-1787245670924.jpg", enabled: true },
      dana: { url: "https://i.ibb.co.com/QvvwkgVd/shareqr.png", enabled: true },
    },
    orders: [],
    pendingOrders: {},
    priceCache: {},
    priceCacheAt: {},
  };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[ppob.js]:', e.message); }
}

function getProvider(data) {
  return PROVIDERS[data.activeProvider] || PROVIDERS.digiflazz;
}

function getCred(data) {
  return data.credentials[data.activeProvider] || {};
}

function genOrderId() {
  return (
    "PP" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 5).toUpperCase()
  );
}

function formatRupiah(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

function calcPrice(basePrice, markup) {
  return Math.ceil(((basePrice || 0) * (1 + (markup || 0) / 100)) / 100) * 100;
}

// Normalize products from any provider to universal format
function normalizeProducts(rawProducts, provider) {
  return (rawProducts || [])
    .map((p) => provider.normalizeProduct(p))
    .filter((p) => p.sku && p.name);
}

async function getCachedPriceList(data, force = false) {
  const provider = getProvider(data);
  const cacheKey = data.activeProvider;
  if (
    !force &&
    data.priceCache[cacheKey] &&
    data.priceCache[cacheKey].length > 0 &&
    Date.now() - (data.priceCacheAt[cacheKey] || 0) < 1800000
  ) {
    return data.priceCache[cacheKey];
  }
  const cred = getCred(data);
  if (!provider.isSetup(cred))
    throw new Error("Provider belum di-setup. Owner: .ppob setkey <user>:<key>");
  const raw = await provider.getPriceList(cred);
  const normalized = normalizeProducts(raw, provider);
  data.priceCache[cacheKey] = normalized;
  data.priceCacheAt[cacheKey] = Date.now();
  saveData(data);
  return normalized;
}

// ============================================================
// PAYMENT INSTRUCTIONS (PPOB own payment config)
// ============================================================

function buildPaymentInstructions(price, ppobPayment) {
  const payment = ppobPayment || {};
  const methods = [];

  if (payment.qrisUrl) {
    methods.push("QRIS (gambar akan dikirim)");
  }

  const eWallets = (payment.methods || []).filter((m) => m.number);
  for (const m of eWallets) {
    methods.push(
      m.name + ": " + m.number + (m.holder ? " a/n " + m.holder : "")
    );
  }

  const banks = (payment.banks || []).filter((b) => b.number);
  for (const b of banks) {
    methods.push(
      b.name + ": " + b.number + (b.holder ? " a/n " + b.holder : "")
    );
  }

  if (payment.cash?.enabled) {
    methods.push("Cash/COD: " + (payment.cash.info || "Tersedia"));
  }

  if (methods.length === 0) {
    methods.push("Hubungi owner untuk metode pembayaran");
  }

  let text = "Total: " + formatRupiah(price) + "\n\n";
  text += "Bayar via:\n";
  methods.forEach((m) => (text += "  " + m + "\n"));
  text += "\nKirim bukti ke owner\n";
  text += "Konfirmasi: .ppob konfirmasi <orderId>\n";
  text += "Cek status: .ppob cek <orderId>";

  return text;
}

// Kirim gambar QR dari URL atau path lokal
async function sendQrImage(sock, chatId, imageUrl, caption, quoted) {
  if (!imageUrl) return false;
  try {
    let buffer;
    if (/^https?:\/\//.test(imageUrl)) {
      const response = await fetch(imageUrl);
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      buffer = fs.readFileSync(imageUrl);
    }
    await sock.sendMessage(
      chatId,
      { image: buffer, caption },
      { quoted: quoted || undefined }
    );
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PLUGIN CONFIG
// ============================================================

const pluginConfig = {
  name: ["ppob"],
  alias: ["ppob"],
  category: "store",
  description:
    "PPOB - Pulsa, Paket Data, Token PLN, Topup Game, Voucher (Multi-Provider)",
  usage:
    ".ppob\n" +
    ".ppob setprovider <digiflazz|fmpedia>\n" +
    ".ppob setkey <username>:<apiKey>\n" +
    ".ppob saldo\n" +
    ".ppob kategori\n" +
    ".ppob cari <keyword>\n" +
    ".ppob beli <sku> <nomor>\n" +
    ".ppob konfirmasi <orderId>\n" +
    ".ppob cek <orderId>\n" +
    ".ppob setmarkup <persen>\n" +
    ".ppob batal <orderId>\n" +
    ".ppob refresh\n" +
    ".ppob setqris <url>\n" +
    ".ppob setwallet <no> <number> <holder>\n" +
    ".ppob setbank <no> <number> <holder>\n" +
    ".ppob premium\n" +
    ".ppob riwayat\n" +
    ".ppob providers",
  example:
    ".ppob cari telkomsel\n" +
    ".ppob beli S5 08123456789\n" +
    ".ppob konfirmasi PP1A2B3C",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 3,
  isEnabled: true,
};

// ============================================================
// HANDLER
// ============================================================

async function handler(m, { sock }) {
  const args = (m.text || "").trim().split(/\s+/);
  const sub = args[0] ? args[0].toLowerCase() : "";
  const arg1 = args[1] || "";
  const arg2 = args[2] || "";
  const sender = m.sender;
  const data = loadData();
  const isOwner = m.isOwner || false;
  const markup = data.markup || 5;
  const provider = getProvider(data);
  const cred = getCred(data);

  // === PROVIDERS (list all) ===
  if (sub === "providers" || sub === "provider") {
    let body = "Provider PPOB\n\n";
    Object.keys(PROVIDERS).forEach((key) => {
      const p = PROVIDERS[key];
      const isActive = data.activeProvider === key;
      const isSetup = p.isSetup(data.credentials[key]);
      body +=
        (isActive ? "[AKTIF] " : "        ") +
        p.name + "\n";
      body +=
        "  Status: " +
        (isSetup ? "Terhubung" : "Belum di-setup") + "\n";
      body +=
        "  " + p.credLabel(data.credentials[key]) + "\n\n";
    });
    body += "Switch: .ppob setprovider <nama>\n";
    body += "Set key: .ppob setkey <user>:<key>";
    return m.reply( claraWrap("PPOB", body), "ppob");
  }

  // === SET PROVIDER ===
  if (sub === "setprovider" || sub === "switch") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const target = (arg1 || "").toLowerCase();
    if (!PROVIDERS[target]) {
      let body = "Provider tidak ditemukan: " + arg1 + "\n\nTersedia:\n";
      Object.keys(PROVIDERS).forEach(
        (k) => (body += "  " + PROVIDERS[k].name + " (" + k + ")\n")
      );
      body += "\nContoh: .ppob setprovider digiflazz";
      return m.reply( claraWrap("PPOB", body), "ppob");
    }
    data.activeProvider = target;
    saveData(data);
    await m.react("🐣");
    await m.reply(claraWrap(
        "PPOB",
        "Provider aktif: " +
          PROVIDERS[target].name +
          "\n\n" +
          (PROVIDERS[target].isSetup(data.credentials[target])
            ? "Status: Terhubung\nCek saldo: .ppob saldo"
            : "Belum di-setup!\nSet key: .ppob setkey <user>:<key>\n\n" +
              PROVIDERS[target].setupHint)
      ));
  }

  // === SETKEY ===
  if (sub === "setkey" || sub === "setapi") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const credInput = arg1;
    if (!credInput || !credInput.includes(":")) {
    await m.reply(claraWrap(
          "PPOB",
          "Set API - Provider: " +
            provider.name +
            " (Owner)\n\n" +
            ".ppob setkey <username>:<apiKey>\n\n" +
            "Contoh:\n" +
            ".ppob setkey user123:abc123def456\n\n" +
            provider.setupHint
        ));
    }
    const parsed = provider.parseKey(credInput);
    if (!parsed) {
    await m.reply(claraWrap("PPOB", "Format salah! Gunakan: <user>:<apiKey>"));
    }
    data.credentials[data.activeProvider] = parsed;
    data.priceCache[data.activeProvider] = null;
    saveData(data);
    await m.react("🐣");
    await m.reply(claraWrap(
        "PPOB",
        "Credentials tersimpan!\n" +
          "Provider: " + provider.name + "\n" +
          provider.credLabel(parsed) +
          "\n\nCek saldo: .ppob saldo\nLihat produk: .ppob kategori"
      ));
  }

  // === SETMARKUP ===
  if (sub === "setmarkup" || sub === "markup") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const pct = parseInt(arg1);
    if (isNaN(pct) || pct < 0 || pct > 100) {
    await m.reply(claraWrap(
          "PPOB",
          "Set Markup (Owner)\n\n" +
            ".ppob setmarkup <persen>\n\n" +
            "Contoh:\n" +
            ".ppob setmarkup 5 (tambah 5%)\n" +
            ".ppob setmarkup 0 (harga pas)\n\n" +
            "Markup aktif: " + markup + "%"
        ));
    }
    data.markup = pct;
    saveData(data);
    await m.react("🐣");
    await m.reply(claraWrap(
        "PPOB",
        "Markup: " + pct + "%\n\n" +
          "Contoh: Pulsa 50k harga API Rp49.000\n" +
          "Harga jual: " + formatRupiah(49000 * (1 + pct / 100))
      ));
  }

  // === SALDO ===
  if (sub === "saldo" || sub === "balance") {
    if (!provider.isSetup(cred))
    await m.reply(claraWrap(
          "PPOB",
          "Provider belum setup!\nOwner: .ppob setkey <user>:<key>\n\n" +
            provider.setupHint
        ));
    await m.react("🕒");
    try {
      const saldo = await provider.cekSaldo(cred);
      await m.react("🐣");
    await m.reply(claraWrap(
          "PPOB",
          "Saldo " + provider.name + "\n\n" +
            "Saldo: " + formatRupiah(saldo) + "\n" +
            "Markup: " + markup + "%"
        ));
    } catch (err) {
      await m.react("❌");
    await m.reply(claraWrap("PPOB", "Error: " + err.message));
    }
  }

  // === KATEGORI ===
  if (sub === "kategori" || sub === "category" || sub === "menu") {
    if (!provider.isSetup(cred))
    await m.reply(claraWrap(
          "PPOB",
          "Provider belum setup!\nOwner: .ppob setkey <user>:<key>"
        ));
    await m.react("🕒");
    try {
      const products = await getCachedPriceList(data);
      const cats = {};
      products.forEach((p) => {
        if (p.buyerStatus && p.sellerStatus) {
          const c = p.category || "Other";
          cats[c] = (cats[c] || 0) + 1;
        }
      });

      let body = "PPOB Menu - " + provider.name + "\n\n";
      Object.keys(cats)
        .sort()
        .forEach((cat) => {
          body += cat + " (" + cats[cat] + " produk)\n";
        });
      body += "\nTotal: " + products.length + " produk\n\n";
      body += "Cari produk: .ppob cari <keyword>\n";
      body += "Contoh:\n";
      body += "  .ppob cari telkomsel\n";
      body += "  .ppob cari pln\n";
      body += "  .ppob cari mobile legend\n";
      body += "  .ppob cari dana\n";
      body += "  .ppob cari wifi";
      await m.react("🐣");
      return m.reply( claraWrap("PPOB", body), "ppob");
    } catch (err) {
      await m.react("❌");
    await m.reply(claraWrap("PPOB", "Error: " + err.message));
    }
  }

  // === CARI ===
  if (sub === "cari" || sub === "search") {
    if (!provider.isSetup(cred))
    await m.reply(claraWrap("PPOB", "Provider belum setup!\nOwner: .ppob setkey <user>:<key>"));
    const keyword = (arg1 || "").toLowerCase();
    if (!keyword) {
    await m.reply(claraWrap(
          "PPOB",
          "Cari Produk\n\n" +
            ".ppob cari <keyword>\n\n" +
            "Contoh:\n" +
            ".ppob cari telkomsel\n" +
            ".ppob cari pln\n" +
            ".ppob cari mobile legend\n" +
            ".ppob cari free fire\n" +
            ".ppob cari genshin\n" +
            ".ppob cari dana\n" +
            ".ppob cari wifi\n\n" +
            "Lihat kategori: .ppob kategori"
        ));
    }
    await m.react("🕒");
    try {
      const products = await getCachedPriceList(data);
      const filtered = products
        .filter(
          (p) =>
            p.buyerStatus &&
            p.sellerStatus &&
            (p.name.toLowerCase().includes(keyword) ||
              p.brand.toLowerCase().includes(keyword) ||
              p.category.toLowerCase().includes(keyword) ||
              p.sku.toLowerCase().includes(keyword))
        )
        .sort((a, b) => a.price - b.price);

      if (filtered.length === 0) {
        await m.react("❌");
    await m.reply(claraWrap(
            "PPOB",
            "Tidak ada produk: " + keyword + "\n\nCoba:\n" +
              ".ppob cari telkomsel\n" +
              ".ppob cari pln\n" +
              ".ppob cari mobile legend\n" +
              ".ppob cari dana"
          ));
      }

      let body = "PPOB - " + keyword + "\n";
      body += filtered.length + " produk\n\n";
      filtered.slice(0, 20).forEach((p, i) => {
        const price = calcPrice(p.price, markup);
        body += (i + 1) + ". " + p.name + "\n";
        body += "   " + formatRupiah(price) + " | " + p.brand + "\n";
        body += "   SKU: " + p.sku + "\n";
      });
      body += "\nBeli: .ppob beli <sku> <nomor>\n";
      body += "Contoh: .ppob beli " + filtered[0].sku + " 08123456789";
      await m.react("🐣");
      return m.reply( claraWrap("PPOB", body), "ppob");
    } catch (err) {
      await m.react("❌");
    await m.reply(claraWrap("PPOB", "Error: " + err.message));
    }
  }

  // === BELI ===
  if (sub === "beli" || sub === "buy" || sub === "pesan") {
    if (!provider.isSetup(cred))
    await m.reply(claraWrap("PPOB", "Provider belum setup!\nOwner: .ppob setkey <user>:<key>"));
    const sku = (arg1 || "").toUpperCase();
    const customerNo = (arg2 || "").replace(/[^0-9]/g, "");
    if (!sku || !customerNo) {
    await m.reply(claraWrap(
          "PPOB",
          "Format Beli\n\n" +
            ".ppob beli <sku_code> <nomor_tujuan>\n\n" +
            "Contoh:\n" +
            ".ppob beli S5 08123456789 (Pulsa Tsel 5k)\n" +
            ".ppob beli PLN20 12345678901 (Token PLN 20k)\n" +
            ".ppob beli ML5 123456789 (ML Diamond 5)\n" +
            ".ppob beli DANA5000 08123456789 (Topup DANA 5k)\n\n" +
            "Cari SKU: .ppob cari <keyword>"
        ));
    }
    await m.react("🕒");
    try {
      const products = await getCachedPriceList(data);
      const prod = products.find((p) => p.sku === sku);
      if (!prod) {
        await m.react("❌");
    await m.reply(claraWrap("PPOB", "SKU tidak ditemukan: " + sku + "\nCari: .ppob cari <keyword>"));
      }
      if (!prod.buyerStatus || !prod.sellerStatus) {
        await m.react("❌");
    await m.reply(claraWrap("PPOB", "Produk sedang gangguan/tidak tersedia: " + prod.name));
      }

      const price = calcPrice(prod.price, markup);
      const orderId = genOrderId();

      data.pendingOrders[orderId] = {
        provider: data.activeProvider,
        sku,
        customerNo,
        productName: prod.name,
        brand: prod.brand,
        category: prod.category,
        price,
        sender,
        createdAt: Date.now(),
        expiredAt: Date.now() + 30 * 60 * 1000,
        status: "menunggu_pembayaran",
      };
      saveData(data);

      const payText = buildPaymentInstructions(price, data.payment);
      let body = "Pesanan Dibuat!\n\n";
      body += "Order ID: " + orderId + "\n";
      body += "Provider: " + provider.name + "\n";
      body += "Produk: " + prod.name + "\n";
      body += "Brand: " + prod.brand + "\n";
      body += "Nomor: " + customerNo + "\n";
      body += "\n" + payText;

      await m.react("🐣");

      // Mode image: kirim gambar QR untuk setiap metode yang ada
      if (data.paymentMode === "image" && data.paymentImages) {
        const imgs = data.paymentImages;
        const imgKeys = Object.keys(imgs).filter(
          (k) => imgs[k] && imgs[k].url && imgs[k].enabled !== false
        );
        if (imgKeys.length > 0) {
          // Kirim text info dulu
          await m.reply( claraWrap("PPOB", body), "ppob");
          // Kirim setiap QR image
          for (const key of imgKeys) {
            await sendQrImage(
              sock,
              m.chat,
              imgs[key],
              claraWrap("PPOB", "QR " + key.toUpperCase() + "\nScan untuk bayar"),
              m
            );
          }
          return;
        }
      }

      // Mode text atau fallback
      const sent = await sendQrImage(
        sock,
        m.chat,
        data.payment?.qrisUrl || "",
        claraWrap("PPOB - QRIS", body),
        m
      );
      if (!sent) {
        return m.reply( claraWrap("PPOB", body), "ppob");
      }
      return;
    } catch (err) {
      await m.react("❌");
    await m.reply(claraWrap("PPOB", "Error: " + err.message));
    }
  }

  // === SETMODE (Owner only) ===
  if (sub === "setmode" || sub === "paymode") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const mode = (arg1 || "").toLowerCase();
    if (mode !== "text" && mode !== "image") {
    await m.reply(claraWrap(
          "PPOB",
          "Set Mode Payment (Owner)\n\n" +
            ".ppob setmode <text|image>\n\n" +
            "text  = metode pembayaran sebagai teks\n" +
            "image = kirim gambar QR (QRIS, Dana, dll)\n\n" +
            "Mode aktif: " + (data.paymentMode || "image")
        ));
    }
    data.paymentMode = mode;
    saveData(data);
    await m.react("🐣");
    await m.reply(claraWrap(
        "PPOB",
        "Mode payment: " + mode + "\n\n" +
          (mode === "image"
            ? "Bot akan kirim gambar QR saat user order\n" +
              "Atur gambar QR: .ppob setqrimg"
            : "Bot akan tampilkan metode sebagai teks")
      ));
  }

  // === SETQRIMG (Owner only) ===
  if (sub === "setqrimg" || sub === "setqrimage") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const key = (arg1 || "").toLowerCase();
    const url = arg2 || "";
    if (!data.paymentImages) data.paymentImages = {};
    if (!key || !url) {
      let body = "Set QR Image (Owner)\n\n";
      body += "Mode aktif: " + (data.paymentMode || "image") + "\n\n";
      body += "QR Images:\n";
      const imgs = data.paymentImages || {};
      if (Object.keys(imgs).length === 0) {
        body += "  (kosong)\n";
      } else {
        for (const [k, v] of Object.entries(imgs)) {
          const status = v.enabled ? "ON" : "OFF";
          body += "  [" + status + "] " + k + ": " + (v.url || "kosong") + "\n";
        }
      }
      body += "\nToggle: .ppob toggleqrimg <nama>\n";
      body += "\n.ppob setqrimg <nama> <url>\n";
      body += "Contoh:\n";
      body += "  .ppob setqrimg qris https://i.ibb.co.com/xxx.jpg\n";
      body += "  .ppob setqrimg dana https://i.ibb.co.com/yyy.png\n";
      body += "  .ppob setqrimg gopay https://i.ibb.co.com/zzz.png\n\n";
      body += "Hapus: .ppob setqrimg <nama> off";
      return m.reply( claraWrap("PPOB", body), "ppob");
    }
    if (url === "off" || url === "delete") {
      delete data.paymentImages[key];
      saveData(data);
      await m.react("🐣");
    await m.reply(claraWrap("PPOB", "QR image '" + key + "' dihapus"));
    }
    // Preserve existing enabled state or default true
    const wasEnabled = data.paymentImages[key]?.enabled !== false;
    data.paymentImages[key] = { url, enabled: wasEnabled };
    saveData(data);
    await m.react("🐣");
    // Kirim preview gambar ke owner
    const sent = await sendQrImage(sock, m.chat, url, claraWrap("PPOB", "QR " + key + " disimpan!\nStatus: " + (wasEnabled ? "ON" : "OFF") + "\nPreview:"), m);
    if (!sent) {
    await m.reply(claraWrap("PPOB", "QR " + key + " disimpan!\nURL: " + url + "\n\n(Gagal preview, cek URL)"));
    }
    return;
  }

  // === TOGGLEQRIMG (Owner only) ===
  if (sub === "toggleqrimg" || sub === "toggleqr") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const key = (arg1 || "").toLowerCase();
    if (!key) {
      let body = "Toggle QR Image (Owner)\n\n";
      const imgs = data.paymentImages || {};
      if (Object.keys(imgs).length === 0) {
        body += "Belum ada QR image\nTambah: .ppob setqrimg <nama> <url>";
      } else {
        for (const [k, v] of Object.entries(imgs)) {
          const status = v.enabled ? "ON" : "OFF";
          body += "[" + status + "] " + k + "\n";
        }
        body += "\n.ppob toggleqrimg <nama>\n";
        body += "Contoh: .ppob toggleqrimg qris\n";
        body += "Contoh: .ppob toggleqrimg dana";
      }
      return m.reply( claraWrap("PPOB", body), "ppob");
    }
    if (!data.paymentImages[key]) {
    await m.reply(claraWrap("PPOB", "QR image '" + key + "' tidak ada\nTambah: .ppob setqrimg " + key + " <url>"));
    }
    data.paymentImages[key].enabled = !data.paymentImages[key].enabled;
    saveData(data);
    await m.react("🐣");
    await m.reply(claraWrap(
        "PPOB",
        "QR " + key + ": " + (data.paymentImages[key].enabled ? "ON" : "OFF") + "\n\n" +
          (data.paymentImages[key].enabled
            ? "Akan dikirim ke user saat order"
            : "Disembunyikan dari user")
      ));
  }

  // === SETQRIS (Owner only) ===
  if (sub === "setqris" || sub === "setqrisurl") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const qrisUrl = arg1 || "";
    if (!qrisUrl) {
    await m.reply(claraWrap(
          "PPOB",
          "Set QRIS untuk PPOB (Owner)\n\n" +
            ".ppob setqris <path atau URL>\n\n" +
            "Contoh:\n" +
            ".ppob setqris ./assets/image/qris-ppob.jpg\n" +
            ".ppob setqris https://contoh.com/qris.jpg\n\n" +
            "Kosongin untuk nonaktif:\n" +
            ".ppob setqris off\n\n" +
            "QRIS aktif: " + (data.payment?.qrisUrl ? "Ya" : "Tidak")
        ));
    }
    if (!data.payment) data.payment = {};
    data.payment.qrisUrl = (qrisUrl === "off" || qrisUrl === "false") ? "" : qrisUrl;
    saveData(data);
    await m.react("🐣");
    await m.reply(claraWrap(
        "PPOB",
        "QRIS PPOB: " +
          (data.payment.qrisUrl ? "Diatur (" + data.payment.qrisUrl + ")" : "Nonaktif")
      ));
  }

  // === SETPAYMENT (Owner only) ===
  if (sub === "setpayment" || sub === "setwallet" || sub === "setbank") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    if (!data.payment) data.payment = { qrisUrl: "", methods: [], banks: [] };
    
    // .ppob setwallet <index> <number> <holder>
    if (sub === "setwallet") {
      const idx = parseInt(arg1) - 1;
      if (isNaN(idx) || !data.payment.methods[idx]) {
        let body = "Set E-Wallet PPOB (Owner)\n\n";
        data.payment.methods.forEach((m, i) => {
          body += (i + 1) + ". " + m.name + ": " + (m.number || "kosong") + "\n";
        });
        body += "\n.ppob setwallet <nomor> <number> <holder>\n";
        body += "Contoh: .ppob setwallet 1 08123456789 Aizat";
        return m.reply( claraWrap("PPOB", body), "ppob");
      }
      const number = arg2 || "";
      const holder = args.slice(3).join(" ") || "";
      data.payment.methods[idx].number = number;
      data.payment.methods[idx].holder = holder;
      saveData(data);
      await m.react("🐣");
    await m.reply(claraWrap("PPOB", data.payment.methods[idx].name + ": " + number + (holder ? " a/n " + holder : "") + "\n\nKosongin number untuk nonaktif"));
    }
    
    // .ppob setbank <index> <number> <holder>
    if (sub === "setbank") {
      const idx = parseInt(arg1) - 1;
      if (isNaN(idx) || !data.payment.banks[idx]) {
        let body = "Set Bank PPOB (Owner)\n\n";
        data.payment.banks.forEach((b, i) => {
          body += (i + 1) + ". " + b.name + ": " + (b.number || "kosong") + "\n";
        });
        body += "\n.ppob setbank <nomor> <number> <holder>\n";
        body += "Contoh: .ppob setbank 1 1234567890 Aizat";
        return m.reply( claraWrap("PPOB", body), "ppob");
      }
      const number = arg2 || "";
      const holder = args.slice(3).join(" ") || "";
      data.payment.banks[idx].number = number;
      data.payment.banks[idx].holder = holder;
      saveData(data);
      await m.react("🐣");
    await m.reply(claraWrap("PPOB", data.payment.banks[idx].name + ": " + number + (holder ? " a/n " + holder : "") + "\n\nKosongin number untuk nonaktif"));
    }
    
    // .ppob setpayment (show all)
    let body = "Payment PPOB (Owner)\n\n";
    body += "QRIS: " + (data.payment.qrisUrl ? "Aktif" : "Nonaktif") + "\n";
    body += "Set QRIS: .ppob setqris <url>\n\n";
    body += "E-Wallet:\n";
    data.payment.methods.forEach((m, i) => {
      body += (i + 1) + ". " + m.name + ": " + (m.number || "-") + (m.holder ? " a/n " + m.holder : "") + "\n";
    });
    body += "\nSet: .ppob setwallet <no> <number> <holder>\n\n";
    body += "Bank:\n";
    data.payment.banks.forEach((b, i) => {
      body += (i + 1) + ". " + b.name + ": " + (b.number || "-") + (b.holder ? " a/n " + b.holder : "") + "\n";
    });
    body += "\nSet: .ppob setbank <no> <number> <holder>";
    return m.reply( claraWrap("PPOB", body), "ppob");
  }

  // === KONFIRMASI (Owner only) ===
  if (sub === "konfirmasi" || sub === "confirm") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const orderId = (arg1 || "").toUpperCase();
    if (!orderId) {
    await m.reply(claraWrap(
          "PPOB",
          "Konfirmasi Pembayaran (Owner)\n\n" +
            ".ppob konfirmasi <orderId>\n\n" +
            "Cek pending: .ppob pending"
        ));
    }
    const order = data.pendingOrders[orderId];
    if (!order) {
    await m.reply(claraWrap("PPOB", "Order tidak ditemukan: " + orderId));
    }
    if (order.status !== "menunggu_pembayaran") {
    await m.reply(claraWrap("PPOB", "Status: " + order.status + "\nTidak bisa dikonfirmasi"));
    }

    await m.react("🕒");
    try {
      const orderProvider = PROVIDERS[order.provider] || provider;
      const orderCred = data.credentials[order.provider] || cred;
      const refId = orderId;

      const result = await orderProvider.topup(
        orderCred,
        order.sku,
        order.customerNo,
        refId
      );

      order.status = "diproses";
      order.digiflazzRef = refId;
      order.providerStatus = result.status || "Pending";
      order.confirmedAt = Date.now();
      data.orders.push({ ...order });
      delete data.pendingOrders[orderId];
      saveData(data);

      await m.react("🐣");
      let body = "Pembayaran Dikonfirmasi!\n\n";
      body += "Order ID: " + orderId + "\n";
      body += "Provider: " + orderProvider.name + "\n";
      body += "Produk: " + order.productName + "\n";
      body += "Nomor: " + order.customerNo + "\n";
      body += "Harga: " + formatRupiah(order.price) + "\n";
      body += "Status: " + (result.status || "Pending") + "\n\n";
      body += "Cek status: .ppob cek " + orderId;

      // Auto-notifikasi sukses ke user
      const providerStatus = (result.status || "Pending").toLowerCase();
      if (providerStatus === "sukses" || providerStatus === "success") {
        order.status = "sukses";
        saveData(data);
        let successBody = "Pembayaran Berhasil!\n\n";
        successBody += "Order ID: " + orderId + "\n";
        successBody += "Produk: " + order.productName + "\n";
        successBody += "Nomor: " + order.customerNo + "\n";
        if (result.sn) successBody += "SN: " + result.sn + "\n";
        successBody += "Status: Sukses\n\n";
        successBody += "Produk sudah masuk ke nomor tujuan.\nTerima kasih!";
        try {
          await sock.sendMessage(order.sender, {
            text: claraWrap("PPOB - Sukses", successBody),
          });
        } catch (e) { console.error('[ppob.js]:', e.message); }
      } else if (order.sender && order.sender !== sender) {
        try {
          await sock.sendMessage(order.sender, {
            text: claraWrap("PPOB", body),
          });
        } catch (e) { console.error('[ppob.js]:', e.message); }
      }

      return m.reply( claraWrap("PPOB", body), "ppob");
    } catch (err) {
      await m.react("❌");
      order.status = "error";
      order.error = err.message;
      saveData(data);
    await m.reply(claraWrap("PPOB", "Error proses: " + err.message));
    }
  }

  // === CEK STATUS ===
  if (sub === "cek" || sub === "status") {
    const orderId = (arg1 || "").toUpperCase();
    if (!orderId) {
    await m.reply(claraWrap("PPOB", "Cek Status Order\n\n.ppob cek <orderId>"));
    }

    let order = data.pendingOrders[orderId];
    let isPending = true;
    if (!order) {
      order = data.orders.find((o) => o.digiflazzRef === orderId);
      isPending = false;
    }
    if (!order) {
    await m.reply(claraWrap("PPOB", "Order tidak ditemukan: " + orderId));
    }

    let body = "Status Order\n\n";
    body += "Order ID: " + orderId + "\n";
    body += "Produk: " + order.productName + "\n";
    body += "Nomor: " + order.customerNo + "\n";
    body += "Harga: " + formatRupiah(order.price) + "\n";
    body += "Status: " + order.status + "\n";

    if (!isPending && order.providerStatus) {
      body += "Status Provider: " + order.providerStatus + "\n";
    }

    if (order.status === "menunggu_pembayaran") {
      const remaining = Math.max(
        0,
        Math.floor((order.expiredAt - Date.now()) / 60000)
      );
      body += "Sisa waktu: " + remaining + " menit\n\n";
      body += "Bayar lalu owner konfirmasi:\n.ppob konfirmasi " + orderId;
    } else if (order.status === "diproses") {
      const orderProvider = PROVIDERS[order.provider] || provider;
      const orderCred = data.credentials[order.provider] || cred;
      if (orderProvider.isSetup(orderCred)) {
        try {
          const result = await orderProvider.checkStatus(orderCred, orderId);
          if (result) {
            const newStatus =
              result.status || order.providerStatus;
            if (newStatus !== order.providerStatus) {
              order.providerStatus = newStatus;
              if (newStatus === "Sukses" || newStatus === "success")
                order.status = "sukses";
              else if (newStatus === "Gagal" || newStatus === "failed")
                order.status = "gagal";
              saveData(data);
            }
            body += "\nStatus terbaru: " + newStatus;
            if (result.sn) {
              body += "\nSN: " + result.sn;
              body += "\n\nProduk sudah masuk ke nomor tujuan!";
            }
            // Auto-notifikasi ke pemilik order kalau status baru sukses
            if ((newStatus === "Sukses" || newStatus === "success") && order.sender !== sender) {
              let sucBody = "Pesanan Selesai!\n\n";
              sucBody += "Order ID: " + orderId + "\n";
              sucBody += "Produk: " + order.productName + "\n";
              sucBody += "Nomor: " + order.customerNo + "\n";
              if (result.sn) sucBody += "SN: " + result.sn + "\n";
              sucBody += "Status: Sukses\n\nTerima kasih!";
              try {
                await sock.sendMessage(order.sender, {
                  text: claraWrap("PPOB - Sukses", sucBody),
                });
              } catch (e) { console.error('[ppob.js]:', e.message); }
            }
          }
        } catch (e) { console.error('[ppob.js]:', e.message); }
      }
    }

    return m.reply( claraWrap("PPOB", body), "ppob");
  }

  // === PENDING (Owner only) ===
  if (sub === "pending" || sub === "listpending") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    const pending = Object.entries(data.pendingOrders).filter(
      ([, o]) => o.status === "menunggu_pembayaran"
    );
    if (pending.length === 0) {
    await m.reply(claraWrap("PPOB", "Tidak ada order pending"));
    }
    let body = "Order Pending (" + pending.length + ")\n\n";
    pending.forEach(([id, o], i) => {
      const remaining = Math.max(
        0,
        Math.floor((o.expiredAt - Date.now()) / 60000)
      );
      body += (i + 1) + ". " + id + "\n";
      body += "   " + o.productName + "\n";
      body += "   " + formatRupiah(o.price) + " | " + o.customerNo + "\n";
      body += "   Sisa: " + remaining + " menit\n";
      body += "   Konfirmasi: .ppob konfirmasi " + id + "\n";
    });
    return m.reply( claraWrap("PPOB", body), "ppob");
  }

  // === BATAL ===
  if (sub === "batal" || sub === "cancel") {
    const orderId = (arg1 || "").toUpperCase();
    if (!orderId) {
    await m.reply(claraWrap("PPOB", "Batalkan Order\n\n.ppob batal <orderId>"));
    }
    const order = data.pendingOrders[orderId];
    if (!order) {
    await m.reply(claraWrap("PPOB", "Order tidak ditemukan atau sudah diproses"));
    }
    if (!isOwner && order.sender !== sender) {
      return m.reply(claraWrap("PPOB", "Bukan order kamu!"));
    }
    if (order.status !== "menunggu_pembayaran") {
    await m.reply(claraWrap("PPOB", "Status: " + order.status + "\nTidak bisa dibatalkan"));
    }
    delete data.pendingOrders[orderId];
    saveData(data);
    await m.react("🐣");
    await m.reply(claraWrap("PPOB", "Order dibatalkan: " + orderId));
  }

  // === REFRESH ===
  if (sub === "refresh" || sub === "reload") {
    if (!isOwner)
      return m.reply(claraWrap("PPOB", "Khusus owner!"));
    if (!provider.isSetup(cred))
    await m.reply(claraWrap("PPOB", "Provider belum setup!\nOwner: .ppob setkey <user>:<key>"));
    await m.react("🕒");
    try {
      data.priceCache[data.activeProvider] = null;
      const products = await getCachedPriceList(data, true);
      await m.react("🐣");
    await m.reply(claraWrap(
          "PPOB",
          "Daftar harga di-refresh!\n" +
            "Provider: " + provider.name + "\n" +
            "Total: " + products.length + " produk\n\n" +
            "Cari: .ppob cari <keyword>"
        ));
    } catch (err) {
      await m.react("❌");
    await m.reply(claraWrap("PPOB", "Error: " + err.message));
    }
  }

  // === PREMIUM (curated app premium listings) ===
  if (sub === "premium" || sub === "apppremium" || sub === "langganan") {
    if (!provider.isSetup(cred))
    await m.reply(claraWrap("PPOB", "Provider belum setup!\nOwner: .ppob setkey <user>:<key>"));
    await m.react("🕒");
    try {
      const products = await getCachedPriceList(data);
      // Keyword filter untuk app premium populer
      const premiumKeywords = [
        "netflix", "spotify", "disney", "canva", "youtube",
        "vidio", "viu", "weton", "wetv", "iflix", "mola",
        "goo", "bigo", "zenius", "ruangguru", "skill academy",
        "teach", "duolingo", "wattpad", "karya", "microsoft",
        "chatgpt", "claude", "gemini",
      ];
      const filtered = products
        .filter(
          (p) =>
            p.buyerStatus &&
            p.sellerStatus &&
            premiumKeywords.some(
              (kw) =>
                p.name.toLowerCase().includes(kw) ||
                p.brand.toLowerCase().includes(kw) ||
                p.category.toLowerCase().includes(kw)
            )
        )
        .sort((a, b) => a.price - b.price);

      if (filtered.length === 0) {
        await m.react("❌");
    await m.reply(claraWrap("PPOB", "Tidak ada produk premium di katalog " + provider.name + "\n\nCoba cari manual:\n.ppob cari netflix\n.ppob cari spotify\n.ppob cari disney"));
      }

      // Group by brand/app
      const byBrand = {};
      filtered.forEach((p) => {
        const brand = p.brand || p.category || "Other";
        if (!byBrand[brand]) byBrand[brand] = [];
        byBrand[brand].push(p);
      });

      let body = "PPOB - App Premium\n";
      body += filtered.length + " produk | " + Object.keys(byBrand).length + " app\n\n";
      Object.keys(byBrand)
        .sort()
        .forEach((brand) => {
          body += brand + " (" + byBrand[brand].length + ")\n";
          // Tampil 3 produk termurah per brand
          byBrand[brand].slice(0, 3).forEach((p) => {
            const price = calcPrice(p.price, markup);
            body += "  " + p.name + "\n";
            body += "  " + formatRupiah(price) + " | SKU: " + p.sku + "\n";
          });
          if (byBrand[brand].length > 3)
            body += "  +" + (byBrand[brand].length - 3) + " produk lain\n";
          body += "\n";
        });
      body += "Beli: .ppob beli <sku> <nomor/email>\n";
      body += "Cari: .ppob cari <keyword>";
      await m.react("🐣");
      return m.reply( claraWrap("PPOB", body), "ppob");
    } catch (err) {
      await m.react("❌");
    await m.reply(claraWrap("PPOB", "Error: " + err.message));
    }
  }

  // === RIWAYAT ===
  if (sub === "riwayat" || sub === "history" || sub === "list") {
    const userOrders = data.orders.filter((o) => o.sender === sender);
    if (userOrders.length === 0) {
    await m.reply(claraWrap("PPOB", "Belum ada riwayat order"));
    }
    let body = "Riwayat Order (" + userOrders.length + ")\n\n";
    userOrders
      .slice(-10)
      .reverse()
      .forEach((o, i) => {
        body += (i + 1) + ". " + o.productName + "\n";
        body += "   " + formatRupiah(o.price) + " | " + o.customerNo + "\n";
        body += "   Status: " + o.status + "\n";
        if (o.digiflazzRef)
          body += "   ID: " + o.digiflazzRef + "\n";
      });
    return m.reply( claraWrap("PPOB", body), "ppob");
  }

  // === HELP / DEFAULT ===
  if (!provider.isSetup(cred)) {
    await m.reply(claraWrap(
        "PPOB",
        "Belum setup!\n\n" +
          "Provider aktif: " + provider.name + "\n" +
          "Owner: .ppob setkey <user>:<key>\n\n" +
          provider.setupHint + "\n\n" +
          "Lihat provider lain: .ppob providers"
      ));
  }

  let body = "PPOB - " + provider.name + "\n\n";
  body += "Saldo: .ppob saldo\n";
  body += "Kategori: .ppob kategori\n";
  body += "Cari: .ppob cari <keyword>\n";
  body += "Beli: .ppob beli <sku> <nomor>\n";
  body += "Cek: .ppob cek <orderId>\n";
  body += "Riwayat: .ppob riwayat\n";
  body += "Batal: .ppob batal <orderId>\n";
  body += "Premium: .ppob premium";
  if (isOwner) {
    body += "\n\nOwner:\n";
    body += "Provider: .ppob providers\n";
    body += "Switch: .ppob setprovider <nama>\n";
    body += "Set API: .ppob setkey <user>:<key>\n";
    body += "Markup: .ppob setmarkup <persen>\n";
    body += "Pending: .ppob pending\n";
    body += "Konfirmasi: .ppob konfirmasi <orderId>\n";
    body += "Refresh: .ppob refresh\n";
    body += "Set QRIS: .ppob setqris <url>\n";
    body += "Set Payment: .ppob setpayment\n";
    body += "Set Mode: .ppob setmode <text|image>\n";
    body += "Set QR Image: .ppob setqrimg <nama> <url>\n";
    body += "Toggle QR: .ppob toggleqrimg <nama>";
  }
  return m.reply( claraWrap("PPOB", body), "ppob");
}

export { pluginConfig as config, handler };
