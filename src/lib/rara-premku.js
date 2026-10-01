// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rara-premku.js — API client Premku (premku.com) — app premium.
// Auto order akun/layanan premium (Capcut Pro, dll): profile, products,
// order, status. Auth: POST JSON {api_key} (form-encoded DITOLAK
// "API Key is required." — teruji live). Order pakai product_id + qty,
// status pakai invoice. Kredensial disimpan owner via .autoorder premku
// <api_key> (db, bukan repo).
import axios from "axios";

const PREM_BASE = process.env.PREMKU_API_URL || "https://premku.com/api";

// ── http seam buat e2e ──
let _http = null;
export function _setPremkuHttpForTest(h) { _http = h; }
export function _resetPremkuHttpForTest() { _http = null; }
const http = () => _http || axios;

async function premPost(cfg, path, fields = {}) {
  const key = cfg?.premku?.apiKey;
  if (!key) return { ok: false, error: "kredensial Premku belum di-set (.autoorder premku <api_key>)" };
  let resp;
  try {
    resp = await http().post(`${PREM_BASE}/${path}`, { api_key: key, ...fields }, { timeout: 25000, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || String(e);
    return { ok: false, error: String(msg) };
  }
  const data = resp?.data;
  if (data?.success === false) return { ok: false, error: String(data.message || "API menolak permintaan") };
  if (data?.success !== true) return { ok: false, error: "respon API gak dikenal" };
  return { ok: true, data };
}

// ── profile: username + saldo ──
export async function premProfile(cfg) {
  const r = await premPost(cfg, "profile");
  if (!r.ok) return r;
  return { ok: true, data: r.data.data || {} };
}

// ── daftar produk aktif ──
export async function premProducts(cfg) {
  const r = await premPost(cfg, "products");
  if (!r.ok) return r;
  const list = (Array.isArray(r.data.products) ? r.data.products : [])
    .filter((p) => p?.id)
    .map((p) => ({
      id: Number(p.id),
      name: String(p.name || ""),
      description: String(p.description || ""),
      productType: String(p.product_type || ""),
      price: Number(p.price) || 0,
      status: String(p.status || ""),
      stock: Number(p.stock) || 0,
      image: String(p.image || ""),
    }));
  return { ok: true, list };
}

export async function premFindProduct(cfg, productId) {
  const r = await premProducts(cfg);
  if (!r.ok) return r;
  const prod = r.list.find((p) => String(p.id) === String(productId));
  if (!prod) return { ok: false, error: `produk id ${productId} gak ketemu — cek .premkulist` };
  return { ok: true, prod };
}

// ── buat pesanan (balikin invoice) ──
export async function premOrder(cfg, { productId, qty }) {
  const r = await premPost(cfg, "order", { product_id: Number(productId), qty: Number(qty) });
  if (!r.ok) return r;
  // bentuk sukses gak terdokumentasi (butuh saldo) — ambil invoice murah hati
  const invoice = r.data?.data?.invoice || r.data?.invoice || r.data?.data?.id || null;
  return { ok: true, data: r.data.data || r.data, invoice: invoice ? String(invoice) : null };
}

// ── cek status via invoice ──
export async function premStatus(cfg, invoice) {
  const r = await premPost(cfg, "status", { invoice });
  if (!r.ok) return r;
  return { ok: true, data: r.data.data || r.data };
}

// id internal buat QRIS/struk (invoice Premku dipisah — bentuknya beda)
export function premOrderId(buyerSeed = "") {
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "PREM-" + Date.now().toString(36).toUpperCase() + "-" + String(buyerSeed).replace(/\W/g, "").slice(0, 6).toUpperCase() + "-" + rnd;
}
