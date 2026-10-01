// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import fs from "fs";
import path from "path";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// Nokos Beli v3 - Multi-Tier Pricing
// Budget (Rp1000) / Standard / Premium
// Providers: 5SIM, SMS-Activate, SMS-Hub, WarungNokos (WN1 // Providers: 5SIM, SMS-Activate, SMS-Hub, WarungNokos (WN1 Providers: 5SIM, SMS-Activate, SMS-Hub WN2) WN2)
// ============================================================

const DATA_FILE = path.join(process.cwd(), "src", "database", "panel", "nokos_beli.json");

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
    alias: ["Budget", "nokosbeli"],
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
  } catch (e) { console.error('[nokos-beli.js]:', e.message); }
  return { provider: "5sim", apiKey: "", apiId: "", users: {}, orders: [], pendingPayments: {}, tier: "budget" };
}

function saveData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[nokos-beli.js]:', e.message); }
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
  alias: ["Budget", "nokosbeli"],
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
  try { await axios.get("https://5sim.net/v1/user/finish/" + orderId, { headers: { Authorization: "Bearer " + apiKey }, timeout: 10000 }); } catch (e) { console.error('[nokos-beli.js]:', e.message); }
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
async function buyNumber(data, country, service, tier) {
  if (data.provider === "5sim") return await fivesimBuy(data.apiKey, country, service);
  if (data.provider === "wn1" || data.provider === "wn2") return await wnBuy(data, country, service, tier || "budget");
  if (data.provider === "nexus") return await nexusBuy(data, service);
  return await saBuy(data.apiKey, country, service, data.provider);
}
async function checkOrder(data, orderId) {
  if (data.provider === "5sim") return await fivesimCheck(data.apiKey, orderId);
  if (data.provider === "wn1" || data.provider === "wn2") return await wnCheck(data, orderId);
  if (data.provider === "nexus") return await nexusCheck(data, orderId);
  return await saCheck(data.apiKey, orderId, data.provider);
}
async function cancelOrderApi(data, orderId) {
  if (data.provider === "5sim") return await fivesimCancel(data.apiKey, orderId);
  if (data.provider === "wn1" || data.provider === "wn2") return await wnCancel(data, orderId);
  if (data.provider === "nexus") return await nexusCancel(data, orderId);
  return await saCancel(data.apiKey, orderId, data.provider);
}
async function getApiBalance(data) {
  if (data.provider === "5sim") return await fivesimBalance(data.apiKey);
  if (data.provider === "wn1" || data.provider === "wn2") return await wnBalance(data);
  if (data.provider === "nexus") return await nexusBalance(data);
  return await saBalance(data.apiKey, data.provider);
}


// === Retry OTP (request another SMS to same number) ===
async function fivesimRetry(apiKey, orderId) {
  try {
    const res = await axios.get("https://5sim.net/v1/user/next/" + orderId, { headers: { Authorization: "Bearer " + apiKey }, timeout: 10000 });
    return { success: res.data === "1" || res.data?.status === "PENDING" };
  } catch { return { success: false }; }
}
async function fivesimRetrySMS(apiKey, orderId) {
  try {
    const res = await axios.get("https://5sim.net/v1/user/sms/" + orderId, { headers: { Authorization: "Bearer " + apiKey }, timeout: 10000 });
    return { success: true, sms: (res.data.sms || []).map(s => ({ code: s.code, text: s.text })) };
  } catch { return { success: false }; }
}

async function saRetry(apiKey, orderId, provider) {
  const base = SA_BASES[provider] || SA_BASES.smsactivate;
  try {
    const res = await axios.get(base, { params: { api_key: apiKey, action: "setStatus", id: orderId, status: 3 }, timeout: 10000 });
    return { success: res.data === "ACCESS_RETRY" };
  } catch { return { success: false }; }
}

async function retryOrder(data, orderId) {
  if (data.provider === "5sim") return await fivesimRetry(data.apiKey, orderId);
  if (data.provider === "wn1" || data.provider === "wn2") return await wnRetry(data, orderId);
  if (data.provider === "nexus") return await nexusRetry(data, orderId);
  return await saRetry(data.apiKey, orderId, data.provider);
}

// === Rental (long-term number) ===
async function fivesimRent(apiKey, country, service) {
  try {
    const res = await axios.get("https://5sim.net/v1/user/buy/hosting/" + country + "/any/" + service, { headers: { Authorization: "Bearer " + apiKey }, timeout: 15000 });
    return { id: res.data.id, phone: res.data.phone, price: res.data.price, type: "rent" };
  } catch (err) { throw new Error("Rental tidak tersedia untuk layanan ini"); }
}

async function saRent(apiKey, country, service, provider) {
  const base = SA_BASES[provider] || SA_BASES.smsactivate;
  try {
    const res = await axios.get(base, { params: { api_key: apiKey, action: "rentNumber", country, time: 43200, service }, timeout: 15000 });
    const parts = res.data.split(":");
    if (parts[0] === "ACCESS_NUMBER") return { id: parts[1], phone: parts[2], type: "rent" };
    throw new Error(parts[0] || "Rental gagal");
  } catch (err) { throw new Error("Rental SMS-Activate: " + err.message); }
}

async function rentNumber(data, country, service) {
  if (data.provider === "5sim") return await fivesimRent(data.apiKey, country, service);
  if (data.provider === "wn1" || data.provider === "wn2") return await wnBuy(data, country, service, "standard");
  if (data.provider === "nexus") return await nexusBuy(data, service);
  return await saRent(data.apiKey, country, service, data.provider);
}

// === WarungNokos API (Indonesian provider) ===
// Server 1: V2 format (service_code based)
// Server 2: Simple format (product_id based)
const WN_BASE = "https://warungnokos.web.id";

// Map our service codes to WarungNokos service codes
const WN_SERVICES_S1 = {
  wa: 14, tg: 86, ig: 88, fb: 90, gmail: 92, tiktok: 94,
  twitter: 96, discord: 98, steam: 100, line: 102, snap: 104,
  uber: 106, tinder: 108, netflix: 110, spotify: 112,
};
const WN_SERVICES_S2 = {
  wa: 3, tg: 5, ig: 7, fb: 9, gmail: 11, tiktok: 13,
  twitter: 15, discord: 17, steam: 19, line: 21,
};

function wnHeaders(apiKey) {
  return { "x-api-key": apiKey, "Accept": "application/json", "Content-Type": "application/json" };
}

// Server 1: Get countries & prices for a service
async function wn1GetCountries(apiKey, serviceCode) {
  const res = await axios.get(WN_BASE + "/api/otp/countries/" + serviceCode, { headers: wnHeaders(apiKey), timeout: 15000 });
  return res.data.data || [];
}

// Server 1: Order OTP
async function wn1Buy(apiKey, numberId, providerId, operatorId, priceJual, serviceName) {
  const res = await axios.post(WN_BASE + "/api/otp/order", {
    number_id: String(numberId), provider_id: String(providerId),
    operator_id: operatorId || "any", price_jual: priceJual, service_name: serviceName
  }, { headers: wnHeaders(apiKey), timeout: 15000 });
  return { id: res.data.data.trxId, phone: res.data.data.phoneNumber, price: res.data.data.amount };
}

// Server 1: Check OTP status
async function wn1Check(apiKey, trxId) {
  const res = await axios.get(WN_BASE + "/api/otp/status/" + trxId, { headers: wnHeaders(apiKey), timeout: 10000 });
  const status = res.data.status || "waiting";
  const otp = res.data.otp_code || "";
  if (otp) return { status: "RECEIVED", phone: "", sms: [{ code: otp, text: otp }] };
  if (status === "canceled") return { status: "CANCELED", phone: "", sms: [] };
  return { status: "WAITING", phone: "", sms: [] };
}

// Server 1: Cancel / Resend
async function wn1SetStatus(apiKey, trxId, action) {
  const res = await axios.post(WN_BASE + "/api/otp/set_status", { trxId, action_status: action }, { headers: wnHeaders(apiKey), timeout: 10000 });
  return { success: res.data.success || false };
}

// Server 1: Get profile/balance
async function wn1Balance(apiKey) {
  const res = await axios.get(WN_BASE + "/api/user/profile", { headers: wnHeaders(apiKey), timeout: 10000 });
  return { balance: res.data.data.balance };
}

// Server 2: Get products (servers & prices)
async function wn2GetProducts(apiKey, platformId, countryId) {
  const res = await axios.get(WN_BASE + "/api/smscode/products", { params: { platform_id: platformId, country_id: countryId }, headers: wnHeaders(apiKey), timeout: 15000 });
  return res.data.data || [];
}

// Server 2: Get countries
async function wn2GetCountries(apiKey) {
  const res = await axios.get(WN_BASE + "/api/smscode/countries", { headers: wnHeaders(apiKey), timeout: 10000 });
  return res.data.data || [];
}

// Server 2: Get services
async function wn2GetServices(apiKey) {
  const res = await axios.get(WN_BASE + "/api/smscode/services", { headers: wnHeaders(apiKey), timeout: 10000 });
  return res.data.data || [];
}

// Server 2: Order OTP
async function wn2Buy(apiKey, productId, appId, countryId, serviceName) {
  const res = await axios.post(WN_BASE + "/api/smscode/order", {
    product_id: productId, app_id: appId, country_id: countryId, service_name: serviceName
  }, { headers: wnHeaders(apiKey), timeout: 15000 });
  return { id: res.data.data.trxId, phone: res.data.data.phoneNumber, price: res.data.data.amount };
}

// Server 2: Check OTP status
async function wn2Check(apiKey, trxId) {
  const res = await axios.get(WN_BASE + "/api/smscode/status/" + trxId, { headers: wnHeaders(apiKey), timeout: 10000 });
  const status = res.data.status || "waiting";
  const otp = res.data.otp_code || "";
  if (otp) return { status: "RECEIVED", phone: "", sms: [{ code: otp, text: otp }] };
  if (status === "canceled") return { status: "CANCELED", phone: "", sms: [] };
  return { status: "WAITING", phone: "", sms: [] };
}

// Server 2: Cancel order
async function wn2Cancel(apiKey, trxId) {
  const res = await axios.post(WN_BASE + "/api/smscode/cancel", { trxId }, { headers: wnHeaders(apiKey), timeout: 10000 });
  return { success: res.data.success || false };
}

// === WarungNokos unified ===
async function wnBuy(data, country, service, tier) {
  if (data.provider === "wn1") {
    const sCode = WN_SERVICES_S1[service];
    if (!sCode) throw new Error("Layanan tidak tersedia di WarungNokos Server 1");
    const countries = await wn1GetCountries(data.apiKey, sCode);
    const cData = countries.find(c => c.name.toLowerCase().includes((COUNTRIES[parseInt(country)] || {name: country}).name.toLowerCase()) || c.name.toLowerCase() === country.toLowerCase());
    if (!cData || !cData.pricelist || cData.pricelist.length === 0) throw new Error("Nomor tidak tersedia untuk negara ini di WN Server 1");
    const price = cData.pricelist[0];
    const t = TIERS[tier] || TIERS.budget;
    const priceJual = Math.round(price.price * t.multiplier);
    const order = await wn1Buy(data.apiKey, cData.number_id, price.provider_id, "any", priceJual, SERVICES[service] || service);
    return { id: order.id, phone: order.phone, price: order.price };
  } else {
    const sId = WN_SERVICES_S2[service];
    if (!sId) throw new Error("Layanan tidak tersedia di WarungNokos Server 2");
    const products = await wn2GetProducts(data.apiKey, sId, parseInt(country));
    if (!products || products.length === 0) throw new Error("Nomor tidak tersedia untuk negara ini di WN Server 2");
    const prod = products[0];
    const order = await wn2Buy(data.apiKey, prod.id, sId, parseInt(country), SERVICES[service] || service);
    return { id: order.id, phone: order.phone, price: order.price };
  }
}

async function wnCheck(data, trxId) {
  if (data.provider === "wn1") return await wn1Check(data.apiKey, trxId);
  return await wn2Check(data.apiKey, trxId);
}

async function wnCancel(data, trxId) {
  if (data.provider === "wn1") return await wn1SetStatus(data.apiKey, trxId, "cancel");
  return await wn2Cancel(data.apiKey, trxId);
}

async function wnBalance(data) {
  if (data.provider === "wn1") return await wn1Balance(data.apiKey);
  // Server 2 uses same profile endpoint
  return await wn1Balance(data.apiKey);
}

async function wnRetry(data, trxId) {
  if (data.provider === "wn1") return await wn1SetStatus(data.apiKey, trxId, "resend");
  return { success: false };
}


// === NexusSMM API ===
// OTP provider with 1200+ products, uses api_id + api_key
// All requests are POST with application/x-www-form-urlencoded
const NEXUS_BASE = "https://nexussmm.com";

async function nexusRequest(endpoint, params) {
  const res = await axios.post(NEXUS_BASE + endpoint, new URLSearchParams(params).toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000
  });
  return res.data;
}

async function nexusServices(data) {
  const result = await nexusRequest("/api/otp_services", { api_id: data.apiId, api_key: data.apiKey });
  if (!result.status) throw new Error(result.data || "Gagal ambil nih layanan");
  return result.data;
}

async function nexusBuy(data, serviceId) {
  const result = await nexusRequest("/api/otp_buy", { api_id: data.apiId, api_key: data.apiKey, service_id: String(serviceId) });
  if (!result.status) throw new Error(result.data || "Gagal membeli nomor");
  return { id: String(result.data.order_id), phone: String(result.data.number), price: parseInt(result.data.price) || 0 };
}

async function nexusCheck(data, orderId) {
  const result = await nexusRequest("/api/otp_status", { api_id: data.apiId, api_key: data.apiKey, order_id: String(orderId) });
  if (!result.status) throw new Error(result.data || "Gagal cek status");
  const st = (result.data.status || "").toUpperCase();
  if (st === "RECEIVED" && result.data.sms) return { status: "RECEIVED", phone: "", sms: [{ code: String(result.data.sms), text: String(result.data.sms) }] };
  if (st === "CANCELED" || st === "CANCELLED") return { status: "CANCELED", phone: "", sms: [] };
  if (st === "TIMEOUT" || st === "EXPIRED") return { status: "EXPIRED", phone: "", sms: [] };
  return { status: "WAITING", phone: "", sms: [] };
}

async function nexusCancel(data, orderId) {
  const result = await nexusRequest("/api/otp_cancel", { api_id: data.apiId, api_key: data.apiKey, order_id: String(orderId) });
  return { success: result.status === true };
}

async function nexusRetry(data, orderId) {
  const result = await nexusRequest("/api/otp_resend", { api_id: data.apiId, api_key: data.apiKey, order_id: String(orderId) });
  return { success: result.status === true };
}

async function nexusBalance(data) {
  const result = await nexusRequest("/api/profile", { api_id: data.apiId, api_key: data.apiKey });
  if (!result.status) throw new Error("Gagal cek saldo");
  return { balance: result.data.balance || "0", currency: "IDR" };
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
    if (!isOwner) return m.reply(novaWrap("Budget", "Khusus owner!"));
    const prov = arg1 ? arg1.toLowerCase() : "";
    const key = arg2;
    if (!prov || !key) {
      return m.reply( novaWrap("Nokos Beli", "Set API Key (Owner)\n\n.nokosbeli setkey 5sim <key>\n.nokosbeli setkey smsactivate <key>\n.nokosbeli setkey smshub <key>\n.nokosbeli setkey wn1 <key>\n.nokosbeli setkey wn2 <key>\n.nokosbeli setkey nexus <api_id>:<api_key>\n\n5SIM: https://5sim.net\nSMS-Activate: https://sms-activate.org\nSMS-Hub: https://smshub.org\nWarungNokos: https://warungnokos.web.id\nNexusSMM: https://nexussmm.com"), "nokosbeli");
    }
    if (!["5sim","smsactivate","smshub","wn1","wn2","nexus"].includes(prov)) return m.reply( novaWrap("Nokos Beli", "Provider tidak valid!\nPilihan: 5sim, smsactivate, smshub, wn1, wn2, nexus"), "nokosbeli");
    if (prov === "nexus") {
      const parts = key.split(":");
      if (parts.length < 2) return m.reply( novaWrap("Nokos Beli", "Format NexusSMM:\n.nokosbeli setkey nexus <api_id>:<api_key>\n\nContoh:\n.nokosbeli setkey nexus SHizVS9:531446-ed17f7"), "nokosbeli");
      data.provider = prov; data.apiId = parts[0]; data.apiKey = parts.slice(1).join(":"); saveData(data);
      return m.reply( novaWrap("Nokos Beli", "API Key tersimpan!\nProvider: " + prov + "\nAPI ID: " + parts[0].slice(0,6) + "..." + "\nAPI Key: " + data.apiKey.slice(0,6) + "..." + data.apiKey.slice(-4)), "nokosbeli");
    }
    data.provider = prov; data.apiKey = key; saveData(data);
    return m.reply( novaWrap("Nokos Beli", "API Key tersimpan!\nProvider: " + prov + "\nKey: " + key.slice(0,6) + "..." + key.slice(-4)), "nokosbeli");
  }

  // TOPUP
  if (sub === "topup") {
    if (!isOwner) return m.reply(novaWrap("Budget", "Khusus owner!"));
    const target = (arg1 || "").replace(/[^0-9]/g, "");
    const amount = parseInt(arg2) || 0;
    if (!target || amount < 500) {
      return m.reply( novaWrap("Nokos Beli", "Topup Saldo (Owner)\n\n.nokosbeli topup <nomor> <jumlah>\n💡 *Contoh:* .nokosbeli topup 628123456789 10000\nMin: Rp500"), "nokosbeli");
    }
    const targetUser = getUser(data, target + "@s.whatsapp.net");
    targetUser.balance += amount; saveData(data);
    return m.reply( novaWrap("Nokos Beli", "Topup Berhasil!\n\nUser: " + target + "\nJumlah: " + formatRupiah(amount) + "\nSaldo: " + formatRupiah(targetUser.balance)), "nokosbeli");
  }

  // SETPRICE
  if (sub === "setprice" || sub === "setharga") {
    if (!isOwner) return m.reply(novaWrap("Budget", "Khusus owner!"));
    const country = arg1; const service = arg2 ? arg2.toLowerCase() : ""; const price = parseInt(arg3);
    if (!country || !service || !price) {
      return m.reply( novaWrap("Nokos Beli", "Set Custom Price (Owner)\n\n.nokosbeli setprice <negara> <layanan> <harga>\n💡 *Contoh:* .nokosbeli setprice 6 wa 4000\n\nBudget = 20% x standard\nPremium = 180% x standard"), "nokosbeli");
    }
    const cData = COUNTRIES[parseInt(country)];
    if (cData) cData[service] = price;
    return m.reply( novaWrap("Nokos Beli", "Harga diupdate!\n" + (cData ? cData.name : country) + " - " + service.toUpperCase() + "\nStandard: " + formatRupiah(price) + "\nBudget: " + formatRupiah(calcPrice(price, "budget")) + "\nPremium: " + formatRupiah(calcPrice(price, "premium"))), "nokosbeli");
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
      return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
    }
    if (!TIERS[choice]) return m.reply( novaWrap("Nokos Beli", "Tier tidak valid!\nPilihan: budget, standard, premium"), "nokosbeli");
    user.tier = choice; saveData(data);
    const t = TIERS[choice];
    const indoWa = calcPrice(COUNTRIES[6] ? COUNTRIES[6].wa : 5000, choice);
    return m.reply( novaWrap("Nokos Beli", "Tier: " + t.name + "\n\n" + t.desc + "\n" + t.note + "\n\nWA Indo: " + formatRupiah(indoWa) + "\n\n.nokosbeli harga 6 wa"), "nokosbeli");
  }

  // SALDO
  if (sub === "saldo" || sub === "balance") {
    let body = "Saldo Nokos Beli\n\nSaldo: " + formatRupiah(user.balance) + "\nTier: " + (TIERS[tier] ? TIERS[tier].name : "Budget") + "\nTotal order: " + user.totalOrders + "\nTotal spent: " + formatRupiah(user.totalSpent);
    if (isOwner && data.apiKey) {
      body += "\n\n--- Owner ---\nProvider: " + data.provider + "\n";
      try { const bal = await getApiBalance(data); body += "Saldo API: " + (bal.currency === "IDR" ? "Rp" + bal.balance : "$" + bal.balance) + "\n"; } catch { body += "Saldo API: Gagal\n"; }
    }
    if (user.balance < 1000) body += "\n\nSaldo kurang! Minta topup ke owner.";
    return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
  }

  // HARGA
  if (sub === "harga" || sub === "price") {
    const country = arg1 || "6";
    const service = (arg2 || "wa").toLowerCase();
    const cData = COUNTRIES[parseInt(country)];
    if (!cData) return m.reply( novaWrap("Nokos Beli", "Negara tidak ditemukan!\nLihat: .nokosbeli negara"), "nokosbeli");
    const basePrice = cData[service] || 5000;
    let body = "Harga " + cData.name + " - " + (SERVICES[service] || service.toUpperCase()) + "\n\n";
    Object.entries(TIERS).forEach(([key, t]) => {
      const p = calcPrice(basePrice, key);
      const tag = key === tier ? " << AKTIF" : "";
      body += t.name + ": " + formatRupiah(p) + tag + "\n";
    });
    body += "\nSaldo: " + formatRupiah(user.balance) + "\nTier: " + TIERS[tier].name + "\n\nUbah: .nokosbeli tier <budget|standard|premium>\nBeli: .nokosbeli buy " + country + " " + service;
    return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
  }

  // WNHARGA - Live prices from WarungNokos
  if (sub === "wnharga" || sub === "wnprice" || sub === "hargawn") {
    if (!data.apiKey || (data.provider !== "wn1" && data.provider !== "wn2")) {
      return m.reply( novaWrap("Nokos Beli", "Fitur ini khusus WarungNokos!\n\nSet provider dulu:\n.nokosbeli setkey wn1 <key>\n.nokosbeli setkey wn2 <key>\n\nDaftar: https://warungnokos.web.id"), "nokosbeli");
    }
    const service = (arg1 || "wa").toLowerCase();
    const country = arg2 || "6";
    try {
    await m.react("🕒");
      if (data.provider === "wn1") {
        const sCode = WN_SERVICES_S1[service];
        if (!sCode) return m.reply( novaWrap("Nokos Beli", "Layanan tidak ada di WN Server 1"), "nokosbeli");
        const countries = await wn1GetCountries(data.apiKey, sCode);
        const cName = COUNTRIES[parseInt(country)] ? COUNTRIES[parseInt(country)].name : country;
        const match = countries.find(c => c.name.toLowerCase().includes(cName.toLowerCase()));
        if (!match) {
          let body = "Harga WarungNokos S1 - " + (SERVICES[service] || service) + "\n\nNegara tersedia:\n";
          countries.slice(0, 20).forEach(c => {
            const p = c.pricelist && c.pricelist[0] ? c.pricelist[0].price : 0;
            body += c.name + ": Rp" + p + " (stok: " + (c.pricelist && c.pricelist[0] ? c.pricelist[0].stock : 0) + ")\n";
          });
          if (countries.length > 20) body += "\n... dan " + (countries.length - 20) + " negara lain";
          return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
        }
        let body = "Harga WarungNokos S1\n\n" + match.name + " - " + (SERVICES[service] || service) + "\n\n";
        match.pricelist.forEach((p, i) => {
          const tBudget = Math.round(p.price * 0.2 / 100) * 100;
          const tStd = p.price;
          const tPremium = Math.round(p.price * 1.8 / 100) * 100;
          body += "Server " + (i+1) + ":\n";
          body += "  Budget: Rp" + tBudget + "\n";
          body += "  Standard: Rp" + tStd + "\n";
          body += "  Premium: Rp" + tPremium + "\n";
          body += "  Stok: " + p.stock + "\n\n";
        });
        body += "Beli: .nokosbeli buy " + country + " " + service;
        return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
      } else {
        const sId = WN_SERVICES_S2[service];
        if (!sId) return m.reply( novaWrap("Nokos Beli", "Layanan tidak ada di WN Server 2"), "nokosbeli");
        const products = await wn2GetProducts(data.apiKey, sId, parseInt(country));
        if (!products || products.length === 0) {
          return m.reply( novaWrap("Nokos Beli", "Tidak ada stok untuk negara ini di WN Server 2\n\nCoba negara lain atau gunakan WN Server 1"), "nokosbeli");
        }
        let body = "Harga WarungNokos S2 - " + (SERVICES[service] || service) + "\n\n";
        const cName = COUNTRIES[parseInt(country)] ? COUNTRIES[parseInt(country)].name : "Country " + country;
        body += cName + "\n\n";
        products.forEach((p, i) => {
          const tBudget = Math.round(p.price * 0.2 / 100) * 100;
          body += (i+1) + ". " + p.name + "\n";
          body += "   Budget: Rp" + tBudget + "\n";
          body += "   Standard: Rp" + p.price + "\n";
          body += "   Stok: " + p.available + "\n\n";
        });
        body += "Beli: .nokosbeli buy " + country + " " + service;
        return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
      }
    } catch (err) {
    await m.react("❌");
      return m.reply( novaWrap("Nokos Beli", "Error: " + err.message + "\n\nCek API key atau coba lagi."), "nokosbeli");
    }
  }
  // NEXUSHARGA - Live prices from NexusSMM OTP
  if (sub === "nexusharga" || sub === "nexusprice" || sub === "harganexus") {
    if (!data.apiId || data.provider !== "nexus") {
      return m.reply( novaWrap("Nokos Beli", "Fitur ini khusus NexusSMM!\n\nSet provider dulu:\n.nokosbeli setkey nexus <api_id>:<api_key>\n\nDaftar: https://nexussmm.com"), "nokosbeli");
    }
    const keyword = (arg1 || "whatsapp").toLowerCase();
    const countryFilter = arg2 ? arg2.toLowerCase() : "";
    try {
      const services = await nexusServices(data);
      let filtered = services.filter(s => (s.product || "").toLowerCase().includes(keyword));
      if (countryFilter) filtered = filtered.filter(s => (s.country || "").toLowerCase().includes(countryFilter));
      if (filtered.length === 0) {
        return m.reply( novaWrap("Nokos Beli", "Tidak ada layanan untuk: " + keyword + (countryFilter ? " di " + countryFilter : "") + "\n\nCoba keyword lain, contoh:\n.nokosbeli nexusharga whatsapp indonesia\n.nokosbeli nexusharga telegram\n.nokosbeli nexusharga gmail"), "nokosbeli");
      }
      filtered.sort((a, b) => parseInt(a.price_idr) - parseInt(b.price_idr));
      let body = "NexusSMM OTP - " + keyword + (countryFilter ? " (" + countryFilter + ")" : "") + "\n\n" + filtered.length + " layanan ditemukan\n\n";
      filtered.slice(0, 20).forEach((s, i) => {
        const t = TIERS[tier] || TIERS.budget;
        const priceBase = parseInt(s.price_idr) || 0;
        const priceFinal = Math.round(priceBase * t.multiplier / 100) * 100;
        body += (i+1) + ". ID: " + s.id + "\n   " + (s.product || "?") + " | " + (s.country || "?") + "\n   Harga: Rp" + priceBase + " -> " + formatRupiah(priceFinal) + " (" + t.name + ")\n   Stok: " + (s.stock || 0) + "\n\n";
      });
      if (filtered.length > 20) body += "... dan " + (filtered.length - 20) + " layanan lain\n";
      body += "\nBeli: .nokosbeli nexusbuy <service_id>\n💡 *Contoh:* .nokosbeli nexusbuy " + filtered[0].id;
      return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
    } catch (err) {
      return m.reply( novaWrap("Nokos Beli", "Error: " + err.message + "\n\nCek API key atau coba lagi."), "nokosbeli");
    }
  }
  // NEXUSBUY - Buy by service_id (NexusSMM specific)
  if (sub === "nexusbuy" || sub === "belinexus") {
    if (!data.apiId || data.provider !== "nexus") {
      return m.reply( novaWrap("Nokos Beli", "Fitur ini khusus NexusSMM!\n\nSet provider:\n.nokosbeli setkey nexus <api_id>:<api_key>"), "nokosbeli");
    }
    const serviceId = arg1;
    if (!serviceId) return m.reply( novaWrap("Nokos Beli", "Masukkan Service ID!\n💡 *Contoh:* .nokosbeli nexusbuy 5320448\n\nCari ID: .nokosbeli nexusharga whatsapp indonesia"), "nokosbeli");
    try {
      const services = await nexusServices(data);
      const svc = services.find(s => String(s.id) === String(serviceId));
      if (!svc) return m.reply( novaWrap("Nokos Beli", "Service ID tidak ditemukan: " + serviceId + "\n\nCari: .nokosbeli nexusharga whatsapp indonesia"), "nokosbeli");
      const t = TIERS[tier] || TIERS.budget;
      const priceBase = parseInt(svc.price_idr) || 0;
      const price = Math.round(priceBase * t.multiplier / 100) * 100;
      if (user.balance < price) {
        return m.reply( novaWrap("Nokos Beli", "Saldo tidak cukup!\n\nHarga (" + t.name + "): " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nKurang: " + formatRupiah(price - user.balance) + "\n\nMinta topup:\n.nokosbeli topup " + sender.split("@")[0] + " <jumlah>"), "nokosbeli");
      }
      const token = genToken();
      data.pendingPayments[token] = { sender, country: "nexus", service: serviceId, price, tier, nexusService: true, nexusName: (svc.product || "Unknown") + " - " + (svc.country || "?"), createdAt: Date.now(), expiresAt: Date.now() + 300000 };
      saveData(data);
      return m.reply( novaWrap("Nokos Beli", "Konfirmasi Pembelian NexusSMM\n\nLayanan: " + (svc.product || "?") + "\nNegara: " + (svc.country || "?") + "\nHarga API: Rp" + priceBase + "\nTier: " + t.name + "\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nSisa: " + formatRupiah(user.balance - price) + "\n\nToken: " + token + "\n\nBayar: .nokosbeli bayar " + token + "\nExpired: 5 menit"), "nokosbeli");
    } catch (err) {
      return m.reply( novaWrap("Nokos Beli", "Error: " + err.message), "nokosbeli");
    }
  }
  // BUY
  if (sub === "buy" || sub === "beli" || sub === "pesan") {
    if (!data.apiKey && data.provider !== "nexus") {
      return m.reply( novaWrap("Nokos Beli", "Layanan belum aktif!\n\nOwner set API key:\n.nokosbeli setkey 5sim <key>\n.nokosbeli setkey smsactivate <key>\n.nokosbeli setkey smshub <key>\n.nokosbeli setkey wn1 <key>\n.nokosbeli setkey wn2 <key>\n.nokosbeli setkey nexus <api_id>:<api_key>"), "nokosbeli");
    }
    const country = arg1 || "6";
    const service = (arg2 || "wa").toLowerCase();
    const cData = COUNTRIES[parseInt(country)];
    if (!cData) return m.reply( novaWrap("Nokos Beli", "Negara tidak ditemukan: " + country), "nokosbeli");
    const basePrice = cData[service] || 5000;
    const price = calcPrice(basePrice, tier);
    if (user.balance < price) {
      return m.reply( novaWrap("Nokos Beli", "Saldo tidak cukup!\n\nHarga (" + TIERS[tier].name + "): " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nKurang: " + formatRupiah(price - user.balance) + "\n\nMinta topup:\n.nokosbeli topup " + sender.split("@")[0] + " <jumlah>\n\nAtau ganti tier murah:\n.nokosbeli tier budget"), "nokosbeli");
    }
    const token = genToken();
    data.pendingPayments[token] = { sender, country, service, price, tier, createdAt: Date.now(), expiresAt: Date.now() + 300000 };
    saveData(data);
    return m.reply( novaWrap("Nokos Beli", "Konfirmasi Pembelian\n\nNegara: " + cData.name + " (" + country + ")\nLayanan: " + (SERVICES[service] || service) + "\nTier: " + TIERS[tier].name + "\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nSisa: " + formatRupiah(user.balance - price) + "\n\nToken: " + token + "\n\nBayar: .nokosbeli bayar " + token + "\nExpired: 5 menit"), "nokosbeli");
  }

  // BAYAR
  if (sub === "bayar" || sub === "pay" || sub === "confirm") {
    const token = arg1 ? arg1.toUpperCase() : "";
    if (!token) return m.reply( novaWrap("Nokos Beli", "Masukkan token!\n💡 *Contoh:* .nokosbeli bayar ABC123"), "nokosbeli");
    const pending = data.pendingPayments[token];
    if (!pending) return m.reply( novaWrap("Nokos Beli", "Token tidak ditemukan!\nBeli: .nokosbeli buy"), "nokosbeli");
    if (pending.sender !== sender) return m.reply( novaWrap("Nokos Beli", "Bukan token kamu!"), "nokosbeli");
    if (Date.now() > pending.expiresAt) { delete data.pendingPayments[token]; saveData(data); return m.reply( novaWrap("Nokos Beli", "Token expired!\nBeli: .nokosbeli buy " + pending.country + " " + pending.service), "nokosbeli"); }
    const u = getUser(data, sender);
    if (u.balance < pending.price) { delete data.pendingPayments[token]; saveData(data); return m.reply( novaWrap("Nokos Beli", "Saldo tidak cukup!"), "nokosbeli"); }
    u.balance -= pending.price; u.totalSpent += pending.price;
    try {
      const order = pending.type === "rent" ? await rentNumber(data, pending.country, pending.service, pending.tier) : await buyNumber(data, pending.country, pending.service, pending.tier);
      const phone = order.phone || "";
      data.orders.push({ id: String(order.id), phone: order.phone, country: pending.country, service: pending.service, price: pending.price, tier: pending.tier, sender, status: "WAITING", createdAt: new Date().toISOString() });
      if (data.orders.length > 100) data.orders = data.orders.slice(-100);
      u.totalOrders += 1; delete data.pendingPayments[token]; saveData(data);
      const rentInfo = pending.type === "rent" ? "\nRental aktif 12 jam - OTP bisa berkali-kali!" : "\nOTP ulang kalau miss: .nokosbeli retry " + order.id;
      return m.reply( novaWrap("Nokos Beli", "Pembelian Berhasil!\n\nNomor: " + phone + "\nNegara: " + (COUNTRIES[parseInt(pending.country)] ? COUNTRIES[parseInt(pending.country)].name : pending.country) + "\nLayanan: " + (pending.nexusName || pending.service.toUpperCase()) + "\nTipe: " + (pending.type === "rent" ? "RENTAL (12 jam)" : "SEKALI PAKAI") + "\nTier: " + (TIERS[pending.tier] ? TIERS[pending.tier].name : "Budget") + "\nHarga: " + formatRupiah(pending.price) + "\nSisa: " + formatRupiah(u.balance) + "\nOrder ID: " + order.id + "\n" + rentInfo + "\n\nCek OTP:\n.nokosbeli otp " + order.id + "\n\nBatal:\n.nokosbeli batal " + order.id), "nokosbeli");
    } catch (err) {
      u.balance += pending.price; u.totalSpent -= pending.price; delete data.pendingPayments[token]; saveData(data);
      return m.reply( novaWrap("Nokos Beli", "Gagal beli! Saldo di-refund: " + formatRupiah(pending.price) + "\n\nError: " + err.message + "\n\nCoba tier/negara lain."), "nokosbeli");
    }
  }

  // OTP / CEK
  if (sub === "otp" || sub === "cek" || sub === "check" || sub === "sms") {
    const orderId = arg1;
    if (!orderId) return m.reply( novaWrap("Nokos Beli", "Masukkan Order ID!\n💡 *Contoh:* .nokosbeli otp 12345\nLihat: .nokosbeli list"), "nokosbeli");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    try {
      const result = await checkOrder(data, orderId);
      let body = "Order #" + orderId + "\n\nNomor: +" + (result.phone || (order ? order.phone : "??")) + "\nStatus: " + result.status + "\n";
      if (result.sms && result.sms.length > 0) {
        body += "\nOTP diterima:\n";
        result.sms.forEach((s, i) => {
          body += "\n" + (i+1) + ". Kode: " + s.code + "\n";
          if (s.text && s.text !== s.code) body += "   Pesan: " + s.text + "\n";
        });
        body += "\nGunakan kode di atas untuk verifikasi!";
        if (data.provider === "5sim") { try { await fivesimFinish(data.apiKey, orderId); } catch (e) { console.error('[nokos-beli.js]:', e.message); } }
      } else {
        body += "\nBelum ada OTP. Cek lagi:\n.nokosbeli otp " + orderId + "\n\nBatal: .nokosbeli batal " + orderId;
      }
      return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
    } catch (err) {
      return m.reply( novaWrap("Nokos Beli", "Error: " + err.message), "nokosbeli");
    }
  }

  // RETRY - Minta OTP lagi ke nomor yang sama
  if (sub === "retry" || sub === "ulang" || sub === "otpbaru") {
    const orderId = arg1;
    if (!orderId) return m.reply( novaWrap("Nokos Beli", "Masukkan Order ID!\n💡 *Contoh:* .nokosbeli retry 12345"), "nokosbeli");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return m.reply( novaWrap("Nokos Beli", "Order tidak ditemukan!"), "nokosbeli");
    try {
      const result = await retryOrder(data, orderId);
      if (result.success) {
        saveData(data);
        return m.reply( novaWrap("Nokos Beli", "Permintaan OTP ulang dikirim!\n\nNomor: +" + (order.phone || "??") + "\nOrder ID: " + orderId + "\n\nOTP baru akan datang dalam 1-3 menit.\nCek: .nokosbeli otp " + orderId), "nokosbeli");
      } else {
        return m.reply( novaWrap("Nokos Beli", "Gagal minta OTP ulang.\n\nKemungkinan:\n1. Nomor sudah tidak aktif (expired)\n2. Provider tidak support retry\n3. OTP pertama belum masuk\n\nSolusi: Beli nomor baru\n.nokosbeli buy " + (order.country || 6) + " " + (order.service || "wa")), "nokosbeli");
      }
    } catch (err) {
      return m.reply( novaWrap("Nokos Beli", "Error: " + err.message), "nokosbeli");
    }
  }

  // SEWA - Rental nomor (aktif berhari-hari)
  if (sub === "sewa" || sub === "rent" || sub === "rental") {
    if (!data.apiKey) return m.reply( novaWrap("Nokos Beli", "Layanan belum aktif!\nOwner: .nokosbeli setkey <provider> <key>"), "nokosbeli");
    const country = arg1 || "6";
    const service = (arg2 || "wa").toLowerCase();
    const cData = COUNTRIES[parseInt(country)];
    if (!cData) return m.reply( novaWrap("Nokos Beli", "Negara tidak ditemukan!\nLihat: .nokosbeli negara"), "nokosbeli");
    const basePrice = (cData[service] || 5000) * 5;
    const price = calcPrice(basePrice, tier);
    if (user.balance < price) {
      return m.reply( novaWrap("Nokos Beli", "Saldo tidak cukup untuk rental!\n\nHarga rental (12 jam): " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\n\nRental = 5x harga biasa, nomor aktif 12 jam.\nBisa terima OTP berkali-kali dalam masa sewa."), "nokosbeli");
    }
    const token = genToken();
    data.pendingPayments[token] = { sender, country, service, price, tier, type: "rent", createdAt: Date.now(), expiresAt: Date.now() + 300000 };
    saveData(data);
    return m.reply( novaWrap("Nokos Beli", "Konfirmasi Rental Nomor\n\nNegara: " + cData.name + " (" + country + ")\nLayanan: " + (SERVICES[service] || service) + "\nDurasi: 12 jam\nHarga: " + formatRupiah(price) + "\nSaldo: " + formatRupiah(user.balance) + "\nSisa: " + formatRupiah(user.balance - price) + "\n\nKeuntungan rental:\n- Bisa terima OTP berkali-kali\n- Nomor aktif 12 jam\n- Cocok untuk login yang butuh verifikasi ulang\n\nToken: " + token + "\n\nBayar: .nokosbeli bayar " + token + "\nExpired: 5 menit"), "nokosbeli");
  }
  // BATAL
  if (sub === "batal" || sub === "cancel") {
    const orderId = arg1;
    if (!orderId) return m.reply( novaWrap("Nokos Beli", "Masukkan Order ID!\n💡 *Contoh:* .nokosbeli batal 12345"), "nokosbeli");
    const order = data.orders.find(o => o.id === orderId && o.sender === sender);
    if (!order && !isOwner) return m.reply( novaWrap("Nokos Beli", "Order tidak ditemukan!"), "nokosbeli");
    try {
      const result = await cancelOrderApi(data, orderId);
      const refund = Math.floor((order ? order.price : 0) * 0.5);
      if (order && refund > 0) { const u = getUser(data, sender); u.balance += refund; }
      if (order) order.status = "CANCELED";
      saveData(data);
      return m.reply( novaWrap("Nokos Beli", result.success ? "Order #" + orderId + " dibatalkan.\nRefund 50%: " + formatRupiah(refund) + "\nSaldo: " + formatRupiah(user.balance + refund) : "Gagal batalkan. OTP mungkin sudah masuk."), "nokosbeli");
    } catch (err) {
      return m.reply( novaWrap("Nokos Beli", "Error: " + err.message), "nokosbeli");
    }
  }

  // LIST
  if (sub === "list" || sub === "riwayat" || sub === "history") {
    const myOrders = data.orders.filter(o => o.sender === sender);
    if (myOrders.length === 0) return m.reply( novaWrap("Nokos Beli", "Belum ada order.\nBeli: .nokosbeli buy 6 wa"), "nokosbeli");
    let body = "Riwayat Order (" + myOrders.length + ")\n\n";
    myOrders.slice(-10).reverse().forEach((o, i) => {
      const phone = o.phone && o.phone.startsWith("+") ? o.phone : "+" + o.phone;
      body += (i+1) + ". ID: " + o.id + "\n   " + phone + " | " + o.service.toUpperCase() + " | " + (COUNTRIES[parseInt(o.country)] ? COUNTRIES[parseInt(o.country)].name : o.country) + "\n   " + formatRupiah(o.price) + " | " + (o.tier || "budget") + " | " + o.status + "\n";
    });
    body += "\n.nokosbeli otp <id> - cek OTP\n.nokosbeli batal <id> - batal";
    return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
  }

  // NEGARA
  if (sub === "negara" || sub === "country") {
    let body = "Daftar Negara (Tier: " + (TIERS[tier] ? TIERS[tier].name : "Budget") + ")\n\n";
    Object.entries(COUNTRIES).forEach(([code, c]) => {
      const p = calcPrice(c.wa || 5000, tier);
      body += code + ": " + c.name + " - " + formatRupiah(p) + "\n";
    });
    body += "\nHarga sesuai tier aktif.\nUbah: .nokosbeli tier <budget|standard|premium>";
    return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
  }

  // LAYANAN
  if (sub === "layanan" || sub === "service") {
    let body = "Daftar Layanan\n\n";
    Object.entries(SERVICES).forEach(([code, name]) => { body += code + ": " + name + "\n"; });
    body += "\n💡 *Contoh:* .nokosbeli buy 6 wa";
    return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
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
  body += "7. OTP Ulang (kalau miss/expired):\n   .nokosbeli retry <id>\n\n";
  body += "8. Rental Nomor (12 jam, OTP berkali-kali):\n   .nokosbeli sewa 6 wa\n\n";
  body += "9. Batalkan:\n   .nokosbeli batal <id> (refund 50%)\n\n";
  body += "10. Riwayat:\n   .nokosbeli list\n\n";
  body += "11. Negara & Layanan:\n   .nokosbeli negara\n   .nokosbeli layanan\n\n";
  body += "12. Cek Harga WarungNokos (live):\n   .nokosbeli wnharga wa 6\n\n13. Cek Harga NexusSMM (live):\n   .nokosbeli nexusharga whatsapp indonesia\n   .nokosbeli nexusbuy <service_id>\n\n";
  if (isOwner) {
    body += "--- Owner ---\n.nokosbeli setkey <provider> <key>\n.nokosbeli topup <nomor> <jumlah>\n.nokosbeli setprice <negara> <layanan> <harga>\n\n";
  }
  const t = TIERS[tier];
  const indoBudget = calcPrice(COUNTRIES[6] ? COUNTRIES[6].wa : 5000, "budget");
  body += "Tier " + t.name + ": " + t.note + "\nWA Indo budget: " + formatRupiah(indoBudget) + "\n\nProviders: 5SIM, SMS-Activate, SMS-Hub, WarungNokos (WN1 & WN2), NexusSMM";
  await m.react("🐣");
  return m.reply( novaWrap("Nokos Beli", body), "nokosbeli");
}

export { pluginConfig as config, handler };
