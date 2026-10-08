// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-auto-order.js — AUTO ORDER PANEL: engine pembayaran QRIS (pakasir-sdk)
// + provisioning panel Pterodactyl otomatis. Porting fitur "auto order" &
// "auto order panel" dari script selfbot JPM APENBOTZ (request owner
// 21 Sep 2026). Flow: buyer order → QRIS invoice → poll status → LUNAS →
// user + server panel ke-create SENDIRI → kredensial dikirim ke DM buyer.
// Pintu command: plugins/panel/orderpanel.js (buyer) + plugins/owner/autoorder.js (config).
import axios from "axios";
import { getDatabase } from "./rara-database.js";
import { applyPteroOverrides } from "./panel/index.js";
import { pterodactyl } from "./config/external.js";
import { buildServerDescription } from "./panel/description.js";
import { isLocationMismatchError, buildLocationMismatchHelp } from "./panel/locations.js";

// ── paket RAM ala script asli (harga bisa di-override via .autoorder harga) ──
export const RAM_PACKAGES = {
  "1gb": { memory: 1024, disk: 2048, cpu: 40, price: 2000 },
  "2gb": { memory: 2048, disk: 4096, cpu: 60, price: 4000 },
  "3gb": { memory: 3072, disk: 6144, cpu: 80, price: 5000 },
  "4gb": { memory: 4096, disk: 8192, cpu: 120, price: 6000 },
  "5gb": { memory: 5120, disk: 10240, cpu: 140, price: 7000 },
  "6gb": { memory: 6144, disk: 12288, cpu: 160, price: 8000 },
  "7gb": { memory: 7168, disk: 14336, cpu: 170, price: 9000 },
  "8gb": { memory: 8192, disk: 16384, cpu: 185, price: 11000 },
  "10gb": { memory: 10240, disk: 20480, cpu: 210, price: 13000 },
  unlimited: { memory: 0, disk: 0, cpu: 350, price: 16000 },
};
export const DEFAULT_ADMIN_PRICE = 15000;

export function fmtRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

// ── konfigurasi persisten (db.data.autoorder) ──
export function ensureOrderCfg(db) {
  db = db || getDatabase();
  if (!db.data.autoorder || typeof db.data.autoorder !== "object") db.data.autoorder = {};
  const c = db.data.autoorder;
  if (typeof c.on !== "boolean") c.on = false;
  if (!Number.isInteger(c.panel) || c.panel < 1 || c.panel > 100) c.panel = 1;
  if (!c.pakasir || typeof c.pakasir !== "object") c.pakasir = {};
  if (typeof c.pakasir.slug !== "string") c.pakasir.slug = "";
  if (typeof c.pakasir.apikey !== "string") c.pakasir.apikey = "";
  if (!c.prices || typeof c.prices !== "object") c.prices = {};
  if (!Number.isFinite(c.adminPrice)) c.adminPrice = DEFAULT_ADMIN_PRICE;
  // PanelPedia TopUp (21 Sep 2026): auto order layanan topup panelpediatopup.com
  if (!c.pediatopup || typeof c.pediatopup !== "object") c.pediatopup = {};
  if (typeof c.pediatopup.apiId !== "string") c.pediatopup.apiId = "";
  if (typeof c.pediatopup.apiKey !== "string") c.pediatopup.apiKey = "";
  if (!Number.isFinite(c.pediatopup.markup)) c.pediatopup.markup = 0;
  if (!c.topupOrders || typeof c.topupOrders !== "object") c.topupOrders = {};
  // Pacific Pedia SMM (23 Sep 2026): auto order layanan sosmed api.pacific-pedia.co.id
  if (!c.pacific || typeof c.pacific !== "object") c.pacific = {};
  if (typeof c.pacific.apiKey !== "string") c.pacific.apiKey = "";
  if (!Number.isFinite(c.pacific.markupPct)) c.pacific.markupPct = 20;
  if (!c.smmOrders || typeof c.smmOrders !== "object") c.smmOrders = {};
  // Premku (23 Sep 2026): auto order app premium premku.com
  if (!c.premku || typeof c.premku !== "object") c.premku = {};
  if (typeof c.premku.apiKey !== "string") c.premku.apiKey = "";
  if (!Number.isFinite(c.premku.markup)) c.premku.markup = 0;
  if (!c.premOrders || typeof c.premOrders !== "object") c.premOrders = {};
  // 5SIM nokos (28 Sep 2026): auto order nomor kosong 5sim.net
  if (!c.nokos || typeof c.nokos !== "object") c.nokos = {};
  if (typeof c.nokos.apiKey !== "string") c.nokos.apiKey = "";
  if (!Number.isFinite(c.nokos.markupPct)) c.nokos.markupPct = 20;
  if (!c.nokos.orders || typeof c.nokos.orders !== "object") c.nokos.orders = {};
  return c;
}

export function packagePrice(cfg, key) {
  if (!RAM_PACKAGES[key]) return null;
  const o = Number(cfg?.prices?.[key]);
  return Number.isFinite(o) && o > 0 ? o : RAM_PACKAGES[key].price;
}

// ── konfigurasi panel (numpang config.pterodactyl + override .setpanel) ──
export function getOrderPanelCfg(panelNum) {
  const pteroConfig = applyPteroOverrides(pterodactyl);
  const slot = pteroConfig?.["server" + panelNum];
  if (!slot?.domain || !slot?.apikey) return null;
  return {
    domain: String(slot.domain).replace(/\/+$/, ""),
    apikey: slot.apikey,
    egg: String(slot.egg || "15"),
    nestid: String(slot.nestid || "5"),
    location: String(slot.location || "1"),
  };
}

// ── cek panel online (port checkPterodactylPanel script asli) ──
export async function checkPanelOnline(domain) {
  try {
    const res = await http().get(`${domain}/auth/login`, { timeout: 8000, validateStatus: () => true });
    if (res.status === 200) return { ready: true, message: "Panel online dan siap diakses" };
    return { ready: false, message: `Panel merespon tapi status tidak normal (${res.status})` };
  } catch (e) {
    return { ready: false, message: `Panel tidak bisa diakses (${e?.code || e?.message})` };
  }
}

// ── pakasir SDK wrapper (seam buat test) ──
let _pakasirFactory = null;
export function _setPakasirFactoryForTest(fn) { _pakasirFactory = fn; }
export function _resetPakasirFactoryForTest() { _pakasirFactory = null; }
export async function buildPakasir(cfg) {
  if (_pakasirFactory) return _pakasirFactory(cfg);
  const { Pakasir } = await import("pakasir-sdk");
  return new Pakasir({ slug: cfg.pakasir.slug, apikey: cfg.pakasir.apikey });
}

// ── http seam buat test provisioning ──
let _http = null;
export function _setAutoOrderHttpForTest(h) { _http = h; }
export function _resetAutoOrderHttpForTest() { _http = null; }
const http = () => _http || axios;

// ── provisioning: buat user + server panel (jalur sama kayak .cp) ──
export async function provisionPanel(panelCfg, pkgKey, username) {
  const pkg = RAM_PACKAGES[pkgKey];
  const clean = String(username || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  if (!clean) return { ok: false, error: "username tidak valid" };
  const email = `${clean}@raramultidevice.id`;
  const password = clean + Math.random().toString(36).slice(2, 8);
  const H = { Authorization: `Bearer ${panelCfg.apikey}`, "Content-Type": "application/json", Accept: "application/vnd.pterodactyl.v1+json" };
  const base = panelCfg.domain;
  try {
    // 1. create user
    const u = await http().post(`${base}/api/application/users`, {
      email, username: clean, first_name: clean, last_name: "Panel", language: "en", password,
    }, { headers: H, timeout: 15000 });
    const user = u.data?.attributes || {};
    // 2. get egg startup
    const e = await http().get(`${base}/api/application/nests/${panelCfg.nestid}/eggs/${panelCfg.egg}`, { headers: H, timeout: 15000 });
    const startup = e.data?.attributes?.startup || "npm start";
    // 3. create server
    await http().post(`${base}/api/application/servers`, {
      name: `${clean}-autoorder`,
      description: buildServerDescription(`Auto Order ${pkgKey}`),
      user: user.id,
      egg: parseInt(panelCfg.egg),
      docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
      startup,
      environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start", JS_FILE: "index.js" },
      limits: { memory: pkg.memory, swap: 0, disk: pkg.disk, io: 500, cpu: pkg.cpu },
      feature_limits: { databases: 5, backups: 5, allocations: 5 },
      deploy: { locations: [parseInt(panelCfg.location)], dedicated_ip: false, port_range: [] },
    }, { headers: H, timeout: 20000 });
    return {
      ok: true,
      username: clean, password, email,
      ram: pkg.memory ? `${pkg.memory / 1024} GB` : "Unlimited",
      disk: pkg.disk ? `${pkg.disk / 1024} GB` : "Unlimited",
      cpu: pkg.cpu + "%",
      domain: panelCfg.domain,
    };
  } catch (e) {
    const msg = e?.response?.data?.errors?.[0]?.detail || e?.message || String(e);
    let extra = "";
    if (isLocationMismatchError(msg)) {
      const help = await buildLocationMismatchHelp(panelCfg);
      if (help) extra = `\n\n${help}`;
    }
    return { ok: false, error: `gagal buat panel: ${typeof msg === "string" ? msg : JSON.stringify(msg)}${extra}` };
  }
}

// ── provisioning: buat ADMIN panel (ala cadmin script asli) ──
export async function provisionAdmin(panelCfg, username) {
  const clean = String(username || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  if (!clean) return { ok: false, error: "username tidak valid" };
  const email = `${clean}@raramultidevice.id`;
  const password = clean + Math.random().toString(36).slice(2, 8);
  try {
    const u = await http().post(`${panelCfg.domain}/api/application/users`, {
      email, username: clean, first_name: clean, last_name: "Admin", language: "en", password, root_admin: true,
    }, { headers: { Authorization: `Bearer ${panelCfg.apikey}`, "Content-Type": "application/json", Accept: "application/vnd.pterodactyl.v1+json" }, timeout: 15000 });
    if (!u.data?.attributes?.id) return { ok: false, error: "gagal buat admin panel" };
    return { ok: true, username: clean, password, email, domain: panelCfg.domain };
  } catch (e) {
    const msg = e?.response?.data?.errors?.[0]?.detail || e?.message || String(e);
    return { ok: false, error: `gagal buat admin panel: ${typeof msg === "string" ? msg : JSON.stringify(msg)}` };
  }
}

// ── invoice teks ──
export function invoiceText(kind, pkgKey, price, orderId) {
  const produk = kind === "admin" ? "Admin Panel 1 Bulan" : `Panel Pterodactyl ${pkgKey}`;
  return { produk, price, orderId };
}

// ── timing seam (polling) ──
let _poll = { intervalMs: 5000, timeoutMs: 15 * 60 * 1000 };
export function _setOrderTimingsForTest(intervalMs, timeoutMs) { _poll = { intervalMs, timeoutMs }; }
export function _resetOrderTimingsForTest() { _poll = { intervalMs: 5000, timeoutMs: 15 * 60 * 1000 }; }
export function getOrderTimings() { return { ..._poll }; }
